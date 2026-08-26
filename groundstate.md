# Groundstate

**Give your coding agent ground truth about your running app.**

Your agent writes your frontend, but it can't see inside it — it guesses from screenshots and DOM dumps, and you burn round-trips correcting it. Groundstate is a dev-only SDK that exposes your app's real state and actions as tools (via WebMCP), so the agent you already use can:

- **Read the truth** — `getCheckoutState()` returns the actual store, not what the DOM implies.
- **Do real things** — `submitCheckoutWithCard("declined_test_card")`, defined by you, callable by it.
- **Jump to any state** — `loadFixture("cart_with_declined_card")` in one call, no clicking there.

`npm install groundstate`, connect your agent through the bridge, and the guessing stops.

*(The name is the metaphor: in physics, the ground state is a system's known baseline — Groundstate gives an agent the app's true state, and a way back to a known one.)*

---

## 0. What WebMCP actually is — corrected, as of Aug 2026

WebMCP is a proposed web standard (Microsoft proposed it Aug 2025, Google co-authored the explainer; now a W3C effort with Mozilla and Apple in the working group). It adds a browser API that lets **a webpage itself register tools an AI agent can call** — the same way an MCP server exposes tools, except the "server" is the live page, with access to the page's actual JavaScript state.

Current reality, which earlier drafts of this doc had wrong or missing:

- **The API is `document.modelContext`, not `navigator.modelContext`.** The July 2026 spec draft moved it (tools belong to a page, not the browser), and Chrome 150 deprecates the `navigator` location. Most tutorials online still show the old form. Groundstate must ship an adapter that handles both plus a polyfill fallback — day one.
- **Chrome is past "behind a flag."** A public origin trial runs from Chrome 149 through 156 (announced at Google I/O, May 2026), meaning sites can expose tools on real traffic with a trial token. Edge 147 has experimental support behind a flag. Firefox and Safari are in the spec discussions with no committed timelines.
- **No mainstream agent client consumes WebMCP tools natively yet.** As of the most recent independent audit, Claude, ChatGPT Agent, Perplexity, and Gemini all still read pages the old way. Gemini-in-Chrome is announced as the first consumer but hasn't shipped.

That last point is the most important design input. It means the **bridge/polyfill path is the real transport today**: a small local process (or extension) that connects the page's registered tools to an MCP client — Claude Code, Codex, Cursor, anything. It works in any browser, no flags, right now. Native `document.modelContext` is the future-proofing story and the standards alignment, not the thing that makes Groundstate work this year.

```js
// Registration looks like this (with the API-location adapter handled by the SDK):
modelContext.registerTool({
  name: "getCartState",
  description: "Returns the current shopping cart contents and total",
  execute: async () => ({ items: store.cart.items, total: store.cart.total }),
});
```

Once registered, a connected agent calls `getCartState()` and gets real, live JavaScript state — not a screenshot to interpret, not a DOM tree to parse. This is the opposite direction of Playwright/computer-use tooling, which drives the browser from the outside and infers. WebMCP lets the app *tell* the agent, because the person who built the app wrote the tool. That's still the whole premise.

## 1. The problem, concretely

Most production UI code today is written by agents (Claude Code, Codex, Cursor). The bottleneck has moved entirely to **verification**, and the pain shows up in two places:

**The inner loop (worst, and the primary target).** Agent writes code → dev clicks around → "the cart total is wrong" → agent guesses from a screenshot or DOM dump → tries again → repeat. Every round trip costs minutes and tokens. The agent has no way to ask the app "what is the cart store's actual contents right now, and why did validation reject that input" — so it infers, often wrongly.

**Review time (secondary).** PRs that touch UI get reviewed by reading the diff, by a slow manual click-through, or by pixel-diff tools that can't see behavioral bugs. A modal that no longer closes on ESC looks pixel-identical to a working one. Behavior-and-state bugs ship, get found by users, and each one costs a reproduction tax: 20–30 minutes of an engineer clicking the app back into the broken state before the fix can even start.

Groundstate attacks both, in that order: give the coding agent ground truth *while it works*, and only then automate review on top of the same primitives.

## 2. The landscape — what exists, honestly

| Tool | What it does | Relationship to Groundstate |
|---|---|---|
| **Chrome DevTools MCP** (Google, shipping now) | Gives any MCP-capable coding agent a live Chrome: console messages w/ source-mapped stacks, full network logs, a11y snapshots, screenshots, performance traces, `evaluate_script`, and connection to your existing browser session (Chrome 144+ auto-connect). Zero app changes. | **The most important tool in this space, and it's free.** It commoditizes everything generic: console errors, network logs, a11y trees. Groundstate must not rebuild any of that — it builds the layer DevTools MCP *cannot* have: developer-authored semantic state and actions. Designed to be used **alongside** it. |
| **Playwright / Playwright MCP** | Scripts real browser interactions via a11y-tree snapshots and clicks. | Outside-in: the agent still guesses its way through the UI. No access to internal state ("is the cart store really empty" vs "does the DOM say empty"). |
| **Percy / Chromatic / Applitools / UI Verify** | Visual regression (some now with AI judges and MCP surfaces). | Pixel drift, not behavior. Visually identical ≠ functionally correct. |
| **Autonoma & similar agentic-E2E platforms** | AI agent exercises every PR's preview deployment in a real browser, comments on the PR with video/screenshot evidence. | Proof the "agent reviews your PR" lane is already occupied — and it's all vision/DOM-based. Groundstate's differentiation is the state channel, not the reviewer. |
| **Storybook interaction tests** | Scripted component tests in isolation. | Artificial environment, maintenance burden, doesn't reflect the integrated app. |

### The `evaluate_script` question — the substitute Groundstate has to beat

DevTools MCP's `evaluate_script` means a dev can already do the cheap version today: stick `window.__appState = { cart, checkout, auth }` in dev builds, add one line to CLAUDE.md, done. Groundstate has to be clearly better than that hack, and it is, on five axes:

1. **Discoverability** — tools self-describe with names, descriptions, and schemas; the agent finds them without repo archaeology.
2. **Curation** — the developer decided what matters, so the agent reads a stable semantic contract, not a raw store dump that changes shape every refactor.
3. **Actions** — `submitCheckoutWithCard("declined_test_card")` is a first-class, schema'd call, not an injected script string.
4. **State injection** — see §4; `evaluate_script` *could* mutate state, but only by knowing app internals; Groundstate makes it a named, safe, documented operation.
5. **Standards trajectory** — the same registrations work with native WebMCP consumers (Gemini-in-Chrome and whatever follows) with zero changes.

**Positioning in one line: DevTools MCP tells the agent what the browser sees; Groundstate tells it what the app knows.** Complement, not competitor — the recommended setup is both, and Groundstate's cross-check feature (§4) actively consumes the DOM/a11y view to reconcile it against app state.

## 3. What's actually left to build, given DevTools MCP exists

Only the things that require being *inside* the app — which happens to be everything defensible:

1. **Observables** — curated, reactive, schema'd reads of real app state (`getCheckoutState`).
2. **Actions** — developer-blessed operations the agent may perform (`submitCheckoutWithCard`).
3. **State injection / fixtures** — teleport the app into a named state in one call (`loadFixture("checkout_declined_card")`). Outside-in tooling *cannot* do this; Playwright has to click its way there every run. This is the single most direct attack on the reproduction tax, and it makes agent verification fast and deterministic: inject → exercise one transition → assert.
4. **Flight recorder** — buffer state transitions (action → store diff) and expose `getStateHistory()`, so a failing agent gets the causal trace, not two snapshots to guess between.
5. **Cross-check** — reconcile app state against the rendered DOM/a11y tree ("store says 0 items, a11y tree shows 3 — flag it"). This catches the class of bugs that live *between* the store and the screen, which neither a pure state channel nor any outside-in tool can catch. See assumption 3 below.
6. **The bridge** — the local MCP server that makes all of the above callable from Claude Code/Codex/Cursor *today*, native WebMCP or not.

Explicitly **not** building: console-error tools, network-log tools, generic a11y snapshots, screenshots, focus/keyboard introspection. DevTools MCP does all of it, better, with zero app changes. (Earlier versions of this doc listed these as "built-in tools every app gets free" — cut.)

## 4. The pieces — naming derived from Groundstate

One npm scope, one CLI. No off-brand names.

### `groundstate` (core SDK)
The framework-agnostic runtime you add to your app. Dev/preview builds only, env-gated, hard-excluded from production bundles.
- `groundstate.observe(name, selectorFn)` — registers a reactive `get<Name>State` observable; re-registers on store change.
- `groundstate.act(name, fn, schema)` — registers a callable action.
- `groundstate.fixture(name, setupFn)` — registers a named state-injection tool; `groundstate.reset()` returns the app to its baseline. (The app's *ground state* — the metaphor doing real work.)
- Flight recorder: opt-in `groundstate.record(store)` → `getStateHistory` tool.
- Transport adapter: `document.modelContext` → `navigator.modelContext` fallback → bridge polyfill, feature-detected. Origin-trial token support for preview deployments.
- Refuses to initialize, loudly and at build time, in production environments; bridge transport requires an auth token so a public preview URL is not an open mutation surface.

### `@groundstate/react`
Framework adapter. `useObservable` / `useAction` hooks, plus the adoption killer-feature: **auto-derived observables** from what's already introspectable — Zustand/Redux stores, TanStack Query cache, react-hook-form state, router state. `npm install` alone yields real read-only tools before anyone writes a line of curation. Curated `observe`/`act`/`fixture` calls are the upgrade path, not the entry fee. Other frameworks later if it earns it.

### `@groundstate/bridge`
The v1 centerpiece. `npx groundstate bridge <url>` runs a local MCP server that connects the running page's registered tools to whatever MCP client the developer already uses (Claude Code, Codex, Cursor, Gemini CLI). No new agent, no new API bill, no CI prerequisite — install-to-value in under five minutes. Also hosts the cross-check tool (it can see both the page's WebMCP tools and the DOM via CDP, so it's the natural place to reconcile them).

### `@groundstate/inspector`
Small web UI: point it at a page, see every registered tool, invoke them manually, watch observables update live. Built once the core loop works — it's the authoring/debugging aid, not the product.

### `@groundstate/ci` (later — v3)
The scenario runner and GitHub Action: run scenario files against a preview deployment on PR open/update, post a structured evidence report as a comment. Built on the same primitives, only after the inner loop is proven. Scenario verdicts must be **deterministic**: the LLM plans and drives, but pass/fail is mechanical predicates over JSON state snapshots (`cart.items.length === 0`), never LLM-judged. A flaky CI gate gets muted within weeks; that's how tools like this die in teams.

## 5. Assumptions — updated audit

1. **Developers (or their agents) will write registration code.** Still the biggest, but the risk was misdiagnosed before: *writing* the code is easy (it's exactly the mechanical task coding agents are good at). The real risks are **maintenance** — `observe` selectors rot like tests rot; a store refactor makes a tool silently return garbage — and **trust**. Mitigations: tools fail loudly at dev-build time when a selector throws; `groundstate doctor` health-checks registrations; auto-derived observables shrink the hand-written surface.
2. **Self-grading (the epistemological core).** When the same coding agent writes both the feature and the tools that verify it, a wrong mental model gets faithfully encoded into both — and the verification passes against its own misunderstanding. Mitigations: auto-derive observables from framework internals rather than hand-picked fields where possible; cross-check against the DOM; treat human-reviewed tool definitions as the contract that changes rarely, separate from feature PRs.
3. **The store is NOT fully the ground truth.** A whole class of frontend bugs lives between the store and the screen — store says the cart is empty, a stale render shows three items. A pure state channel is blind to exactly those. This is why cross-check is a first-class feature, and why the pitch is **"state + DOM, reconciled"** — never "no screenshots needed."
4. **Dev/preview only — with teeth.** The origin trial explicitly allows WebMCP on production traffic, so "someone will enable it in prod" is a when, not an if. The production build-time refusal must be genuinely hard to bypass, the bridge transport must be authenticated (preview URLs are public-by-obscurity and these tools *mutate*), and the threat model gets written down: a prompt-injected agent calling `submitCheckout` against a real account is the canonical WebMCP attack; Chrome publishes security guidance for exactly this.
5. **WebMCP churn is absorbable.** The API already moved once (`navigator` → `document`); the upstream MCP spec is mid-RC. Groundstate controls both ends (SDK + bridge), so churn hides behind the transport adapter. But the bridge — not native WebMCP — is what makes it work *today*.
6. **SPA-centric, stated honestly.** RSC/App Router push state server-side; the trendline is against pure client state. Scope v1: client-heavy apps. The server-state story (server-action visibility, network-level observables) is an open question, not a promise.
7. **A human still decides "correct."** Groundstate produces evidence; it doesn't gate merges. Unchanged.

## 6. Build plan

### Phase 1 — the WebMCP Challenge (10 days)
The hackathon judges "an app that becomes meaningfully better when people and their agents can use it together" — which is precisely the inner-loop demo. Sponsors include Google Chrome, Netlify, Vercel, Render: the preview-deployment story lands with this audience.

Scope, in order:
1. `groundstate` core: `observe` / `act` / `fixture`, the transport adapter, prod-refusal.
2. `@groundstate/bridge`: page ↔ MCP client, auth token, works in stock Chrome via polyfill and in Chrome 149+ natively.
3. `@groundstate/react`: hooks + auto-derived observables for at least Zustand or TanStack Query (whichever beenthere.page uses).
4. **The demo**: one real beenthere.page flow (itinerary building — real state, real edge cases) instrumented; a live session where Claude Code, connected through the bridge, reproduces a reported bug via `fixture`, diagnoses it via observables + `getStateHistory`, fixes it, and verifies via deterministic assertions — with a side-by-side of the same task over screenshots/DOM for contrast (rounds, tokens, wall-clock).
5. `@groundstate/inspector`, only if time remains.

Judging-day one-liner: *your app, working with your agent — DevTools MCP tells it what the browser sees; Groundstate tells it what the app knows.*

### Phase 2 — post-hackathon: prove it on real work (2–4 weeks)
- Use it daily on beenthere.page development. Instrument a second flow. Track honestly: instrumentation cost, how much a coding agent could self-instrument from a one-line instruction, and how often the tools drift.
- Flight recorder and cross-check land here (cross-check is the feature most likely to catch a real bug nothing else would).
- **Kill criterion, written down now:** if, after instrumenting one real flow, the curated tools don't catch anything — or save meaningful round-trips — that DevTools MCP + `evaluate_script` wouldn't have, the premise fails. Better to know in week two than month three.

### Phase 3 — only if Phase 2 holds
- `@groundstate/ci`: scenario files (deterministic predicates over state snapshots), GitHub Action against preview deployments, structured evidence reports as PR comments.
- More framework adapters, guided by demand.
- Track native WebMCP consumers (Gemini-in-Chrome first); when they ship, Groundstate-instrumented apps work with them for free — that's the standards bet paying out.

## 7. Open questions / risks

- **Spec churn:** origin trial closes around Chrome 156 / late-2026 projected stable enablement; the upstream MCP RC could ripple into WebMCP primitives. The adapter absorbs it, but pin and track.
- **Server-state apps:** what does Groundstate mean for an RSC-heavy app? Punted from v1, but the answer decides the ceiling of the market.
- **Auto-derivation quality:** raw Zustand dumps may be too noisy to be useful without curation — Phase 2 tells us where the floor is.
- **Bridge security:** the exact auth scheme (token in URL fragment? paired handshake?) needs design before anyone points it at a shared preview URL.
