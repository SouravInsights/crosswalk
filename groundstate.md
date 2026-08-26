# Groundstate

A dev-mode layer you drop into your web app that exposes its real internal state (component props, form validation, cart contents, auth state, keyboard focus, a11y tree) as WebMCP tools, so a reviewing agent can *ask the running app what actually happened* instead of guessing from screenshots or the DOM.

---

## 0. What WebMCP actually is (since we're starting from scratch on this)

WebMCP is a proposed web standard (currently shipping behind a flag in Chrome, also usable via a JS polyfill in other browsers) that adds a new browser API: `navigator.modelContext`. It lets **a webpage itself register tools that an AI agent running alongside the browser can call** — the same way an MCP server exposes tools to Claude today, except the "server" is the live page you're looking at, running in your browser, with access to that page's actual JavaScript state.

Concretely, on any page, JS code can do:

```js
navigator.modelContext.registerTool({
  name: "getCartState",
  description: "Returns the current shopping cart contents and total",
  execute: async () => ({
    items: store.cart.items,
    total: store.cart.total,
  }),
});
```

Once registered, an agent that's connected to that browser tab (via the WebMCP transport) can call `getCartState()` and get back the real, live JavaScript state — not a screenshot it has to interpret, not a DOM node it has to parse. It's a direct, structured channel between "what the agent wants to know" and "what the app actually knows about itself."

This is the opposite direction of most agent-browser tooling so far (Playwright, browser-use, computer-use), which drives the browser *from the outside* — clicking, reading pixels, parsing accessibility trees, inferring what happened. WebMCP lets the app tell the agent directly, because the person who built the app wrote the tool.

That's the whole premise Groundstate is built on.

---

## 1. The problem, concretely

When someone (or some agent) opens a PR that touches UI, review happens one of three ways today:

1. **Code-only review.** The reviewer reads the diff and imagines what it does. Nobody actually clicks the checkout flow with a declined card and an empty cart at the same time — that edge case ships broken and gets found by a real user weeks later.
2. **Manual click-through.** The reviewer pulls the branch, runs it locally, and manually exercises the flow. This is slow (10–30 min per non-trivial PR), doesn't scale, and gets skipped under deadline pressure — especially for edge cases.
3. **Visual regression tooling (Percy, Chromatic, Applitools).** These catch *pixel diffs* — "this button moved 4px" — but they don't know whether the button is still *functionally* correct. A modal that no longer closes on ESC, or a form that submits with an invalid email, can look pixel-identical in a screenshot while being completely broken.

The result: UI bugs about **behavior and state**, not pixels, routinely slip through review and get discovered by users instead. Every one of those costs a reproduction tax — a user reports it vaguely, and an engineer spends 20–30 minutes just getting back to the broken state before they can even start fixing it.

That tax has gotten more expensive, not less, now that most UI code is written and shipped by agents (Claude Code, Codex, Cursor, and similar). Agents can produce a PR in minutes. The bottleneck has moved entirely to *verifying what got shipped actually behaves correctly* — and that verification step is still manual, still slow, and still mostly skipped for anything beyond "does it look right."

## 2. What exists today, and why it doesn't fully solve this

| Tool | What it does | Why it's not this |
|---|---|---|
| **Playwright / Playwright MCP** | Scripts real browser interactions; Playwright MCP lets an agent drive a page via accessibility-tree snapshots and clicks. | The agent is still *guessing its way through the UI* the same way a human tester would — clicking things, waiting, hoping selectors don't change. It has no privileged access to the app's actual internal state (e.g. "is the cart store really empty," not "does the DOM say 'empty cart'"). |
| **Percy / Chromatic / Applitools** | Visual regression — screenshot diffing across builds/branches. | Catches pixel drift, not behavioral bugs. A component can be visually identical and functionally broken (wrong validation logic, broken keyboard trap, stale state after a mutation). |
| **Storybook + interaction tests** | Isolated component testing with scripted interactions. | Tests components in isolation, not the live, integrated app with real routing/state/API responses. Someone has to write and maintain these stories, and they don't reflect what's actually running in a given branch/deployment. |
| **browser-use / computer-use style agents** | General-purpose agents that control a browser via vision + DOM. | Same fundamental limitation as Playwright MCP — inference from pixels/DOM, not ground-truth state. Slower and less deterministic too. |
| **Manual QA / human reviewer** | Ground truth, but slow, inconsistent, and doesn't scale with how fast agents now produce PRs. | This is the tedious part we want to reduce, not replace entirely — a human should still make the final call, just with much better evidence in front of them. |

**The gap:** every existing tool either (a) infers app state indirectly (screenshots, DOM, accessibility tree), or (b) tests in an artificial, isolated environment (Storybook). None of them let a reviewing agent ask the **actual live app**, in its real integrated state, structured questions like *"what's in the cart right now,"* *"did the form validation actually reject this input and why,"* or *"is focus trapped inside this modal."*

## 3. What WebMCP uniquely enables here

Because WebMCP tools are **authored by the developer who built the component**, the assertions a reviewing agent can make aren't reverse-engineered from pixels — they're exactly the checks the developer knows matter. A checkout form can register:

```js
navigator.modelContext.registerTool({
  name: "getCheckoutState",
  description: "Returns current checkout form state: cart contents, validation errors, payment status",
  execute: async () => ({
    cartItems: store.cart.items,
    cartTotal: store.cart.total,
    validationErrors: form.errors,
    paymentStatus: store.payment.status,
  }),
});

navigator.modelContext.registerTool({
  name: "submitCheckoutWithCard",
  description: "Simulates submitting checkout with a given test card token",
  inputSchema: { cardToken: "string" },
  execute: async ({ cardToken }) => checkoutController.submit(cardToken),
});
```

A reviewing agent can now directly call `submitCheckoutWithCard({cardToken: "declined_test_card"})` and then `getCheckoutState()` and get back real internal state. This is faster, cheaper (fewer tokens, no vision-model round-trips), and more reliable than DOM/vision-based automation — and it tests real integrated behavior, not an isolated mock.

## 4. Assumptions this whole idea rests on

Being explicit about these because the value of Groundstate lives or dies on whether they hold up in practice — this is exactly what building it for real, against beenthere.page, should test:

1. **Developers (or their coding agents) are willing to write a small amount of WebMCP registration code per component/flow.** This is not automatic — Groundstate can provide ergonomic helpers, but *someone* has to decide "this is the state worth exposing" and "this is the action worth exposing," and write a few lines to do it. This is the single biggest assumption. If it feels like meaningful extra work with no immediate payoff, people won't do it.
   - Mitigating factor: this is exactly the kind of small, mechanical, well-specified task coding agents (Claude Code, Codex) are good at. The realistic expectation is: a developer says "expose the checkout flow's state and actions to Groundstate," and their coding agent writes the `registerTool` calls — the human doesn't hand-write this from scratch.
2. **The state/actions exposed need to be genuinely representative of what matters**, not just whatever's easiest to expose. A `getCheckoutState` that omits the one field that actually breaks is worse than useless — it's false confidence. This means tool authorship needs at least a little intentionality, not blind auto-generation.
3. **This only works in dev/preview builds, never production.** Exposing internal app state and mutating actions to an external agent is a real security surface. The assumption is that teams already have a preview/staging deployment step (Vercel, Netlify, Render previews, or a local dev server) where this is safe to enable, and that it can be strictly and reliably excluded from production bundles.
4. **WebMCP tooling (browser support, the polyfill, the agent-side connection) is stable enough to build on.** It's an emerging standard behind a flag in Chrome today. Part of building Groundstate for real is finding out how much friction that adds right now, and whether the MCP-B-style polyfill is good enough to not care.
5. **A single-page app / SPA-style architecture is the common case.** The state-exposure model (JS store, reactive re-registration of tools) assumes a client-side app with meaningful in-memory state — which fits beenthere.page and most modern frontend stacks, but is worth stating explicitly since it doesn't map cleanly onto, say, a mostly-server-rendered app with little client state.
6. **A human is still the one deciding what "correct" means**, at least at first. Groundstate produces evidence (structured state snapshots, pass/fail against a scenario) — it doesn't itself decide the PR is good to merge. Whether that changes over time (more autonomous gating) is a later question, not a starting assumption.

## 5. What we're actually building

Three pieces:

### 5.1 `reviewer-kit` — a small SDK you add to your app
- A thin wrapper around `navigator.modelContext` (with a polyfill for browsers that don't support it natively yet) that's active only in dev/preview builds, gated by an explicit env flag, and hard-excluded from production bundles.
- Ergonomic helpers so you're not hand-writing raw `registerTool` calls for common patterns:
  - `exposeState(name, selectorFn)` — reactively re-registers a `get<Name>State` tool whenever the underlying store/state changes.
  - `exposeAction(name, fn, schema)` — registers a callable action.
  - Built-in tools every app gets for free with no extra work: `getA11ySnapshot` (from the accessibility tree), `getFocusedElement`, `getKeyboardTrapStatus`, `getCurrentRoute`, `getConsoleErrors`, `getNetworkRequestLog` (recent API calls + status codes).
- Framework adapters for React first (hook: `useExposedTool`), since that's what beenthere.page is likely built on; other frameworks later if useful.

### 5.2 `reviewer-agent` — the agent that actually runs reviews
- A CLI (`npx reviewer run <preview-url> --scenario checkout.md`) that:
  1. Opens a given preview/dev deployment in a Chrome instance with WebMCP enabled.
  2. Discovers every tool the page has registered via `navigator.modelContext`.
  3. Takes a plain-English review scenario (e.g., "Verify the checkout flow handles a declined card and an empty cart at the same time") and uses an LLM (Claude, via the Anthropic API) to plan and execute a sequence of tool calls testing it.
  4. Produces a structured report — which checks passed/failed, with the actual state snapshots as evidence, not screenshots.
- Two integration surfaces to build, in order of what unblocks real usage fastest:
  1. **A local/CLI mode** you or a coding agent can invoke directly during development — "run the reviewer against the checkout scenario before I open this PR."
  2. **A GitHub Action** that runs automatically on PR open/update against the preview deployment and posts the structured report as a PR comment.

### 5.3 `reviewer-inspector` — a small web UI (build only once the core loop works)
- Given a preview URL, lists every WebMCP tool currently registered on the page and lets you manually invoke them and see live results. Useful while authoring `exposeState`/`exposeAction` calls, and useful for debugging why a scenario didn't behave as expected.

## 6. How I plan to validate this — using it on beenthere.page

Once a usable slice of `reviewer-kit` + `reviewer-agent` (CLI mode) exists, the plan is to actually instrument beenthere.page with it and use it for real review work, not just a synthetic demo app. That's the actual test of whether the assumptions in section 4 hold:

- Pick one real, meaningful flow in beenthere.page (something with actual state and edge cases — a trip-planning or itinerary-building flow is a natural candidate) and instrument it with `exposeState`/`exposeAction`.
- Write a small scenario file for it in plain English, covering the edge cases that are easy to forget (empty state, invalid input, concurrent actions).
- Run `reviewer-agent` against it before merging a real change to that flow, and see whether it actually catches something a normal review pass would've missed — or whether it's just noise.
- Track how much manual instrumentation work it took, and whether a coding agent could do most of that work given a short instruction, per assumption #1 above.

If it doesn't hold up under that real use, that's exactly the kind of thing worth finding out early rather than after investing in the GitHub Action / CI integration.

## 7. Open questions / risks to resolve before building more

- **Security surface:** exposing internal state/actions via WebMCP tools is powerful by design, which means it must be strictly dev/preview-only. `reviewer-kit` should refuse to initialize (loudly, at build time) if it detects a production environment.
- **Browser support:** WebMCP is currently behind a flag in Chrome, so `reviewer-agent` needs to either rely on a polyfill or a Chrome build with the flag enabled. Worth confirming this is stable enough to depend on before building much more on top of it.
- **Scenario format:** plain English is the friendliest starting point but least deterministic — a lightweight structured format (a few fields per scenario) might be worth adding as a fallback for scenarios where non-LLM-graded, reproducible pass/fail matters more than flexibility.
