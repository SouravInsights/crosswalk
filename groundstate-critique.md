# Groundstate — Critique & Review

*Review of `groundstate.md`, 2026-08-26. Ecosystem facts checked against current sources (Chrome/W3C status, Chrome DevTools MCP, agentic E2E tooling).*

---

## Verdict up front

The genuinely novel thing here is **developer-curated, semantic access to live app state and actions**. That's real, and nobody owns it. But two of the three proposed components (`reviewer-agent`, the "built-in free tools") are already substantially commoditized, and the PR-review framing puts the product in a crowded lane. Worth building — but as a smaller, differently-aimed wedge than what's written.

---

## 1. Factual updates the doc needs

Section 0 and assumption #4 are stale, in ways that matter:

- **The API moved.** The July 2026 spec draft relocated the API from `navigator.modelContext` to `document.modelContext`; Chrome 150 deprecates the old location while the origin trial still serves it. Anything built now needs an adapter layer from day one — early adopters are already carrying migration debt.
- **Chrome is past "behind a flag".** There's a public **origin trial running Chrome 149–156** (announced at Google I/O, May 2026), and Edge 147 ships experimental support behind a flag. Firefox and Safari participate in the W3C group with no commitments.
- **The bigger one: no mainstream agent client consumes WebMCP tools yet.** As of the last independent audit (May 2026), Claude, ChatGPT Agent, Perplexity, and Gemini all still read pages the old way. Gemini-in-Chrome is announced as the first consumer but hasn't shipped.

That last point cuts both ways. It means Groundstate must ship its own agent-side connection (planned anyway) — but it also means the polyfill/extension bridge path (MCP-B style: browser tab ↔ local MCP server) is the *actual* transport today, and it works in any Chromium browser with no flags. **Design for the bridge as primary, native WebMCP as the future-proofing story — not the reverse.**

---

## 2. The biggest gap in Section 2: Chrome DevTools MCP

The competitive table is missing the most serious competitor. **Chrome DevTools MCP** (shipped by Google, public and actively developed) gives any coding agent — Claude Code, Cursor, Codex, Gemini CLI — the following, with **zero app changes**:

- console messages with source-mapped stack traces
- full network request logs
- a11y-tree snapshots and screenshots
- performance traces / Lighthouse audits
- `evaluate_script` against the live page
- connection to the developer's *live browser session* (Chrome 144+ auto-connect)

Two consequences:

1. **The "built-in tools every app gets free" list is dead on arrival.** `getConsoleErrors`, `getNetworkRequestLog`, `getA11ySnapshot`, `getFocusedElement` — DevTools MCP already does all of these, better, with no SDK installed. Cut them from the pitch; they dilute the differentiation.
2. **`evaluate_script` is the cheap substitute to beat.** A dev can put `window.__appState = { cart: store.cart, ... }` in dev builds, add one line to CLAUDE.md, and their agent reads real internal state *today* through DevTools MCP. Groundstate's actual value over that hack is: discoverability (tools self-describe with schemas), curation (the developer decided what matters), reactivity, safety rails, and exposed **actions**. That's a real value proposition — but the doc argues against Playwright/Percy instead of against this, and *this* is the argument every prospective user will actually make.

Also: the "agent runs scenarios against a preview URL and comments on the PR" category already has entrants — e.g. **Autonoma** (agent-driven E2E on every PR, preview environments, PR comments, self-healing natural-language tests) and AI-judge visual tools with MCP surfaces (UI Verify et al.). They're all outside-in, which is the differentiation — but "AI reviews your PR in a browser" is not an empty lane. The pitch must be the state channel, not the reviewer.

**Positioning line that writes itself:** *DevTools MCP tells the agent what the browser sees; Groundstate tells it what the app knows.* Complement, not competitor.

---

## 3. Strategic critique: wrong first user

The doc aims Groundstate at a **separate reviewer agent at PR time**. The first user should be **the coding agent the developer is already running, during development**. Reasons:

- The stated pain is "unnecessary back and forth." That pain is worst in the inner loop: agent writes code → dev clicks around → "the cart total is wrong" → agent guesses → repeat. Giving the *coding* agent `getCheckoutState()` and `submitCheckoutWithCard()` while it works kills that loop directly. The PR-time reviewer only catches what escaped the loop.
- A PR-time reviewer requires a preview deployment, CI wiring, a GitHub Action, scenario files, and org-level buy-in before anyone sees value. An MCP bridge into the dev's existing Claude Code/Cursor session requires `npm install` + one config line. **Adoption gradient matters enormously for a tool whose biggest risk is "people won't do the setup."**
- It sidesteps the "yet another agent + another API bill" objection. v1 builds no agent at all — just the SDK plus a thin local MCP server that bridges the running page's registered tools into whatever agent the dev already uses. Standalone `reviewer-agent` CLI becomes v2; the GitHub Action v3.

This reframing honestly fits the validation plan better anyway: "run the reviewer before I open this PR" (integration surface #1) *is* the inner loop.

---

## 4. Assumption audit

### Assumption 1 (people will write the registration code) — risk is misdiagnosed
Writing the code is easy, especially agent-assisted. The real risks are:

- **Maintenance.** `exposeState` selectors rot exactly like tests rot — refactor the store and the tool silently returns garbage or nothing. Needs an answer: tools fail loudly at dev-build time when their selector throws; a `groundstate doctor` health check.
- **Trust** — see the self-grading problem below.

### Assumption 2 (exposed state is representative) — hides a deeper problem: self-grading
In the doc's own framing, the coding agent writes both the feature *and* the `registerTool` calls. An agent with a wrong mental model of the feature will faithfully encode that wrong model into the tool — and then the reviewer "verifies" the code against its own misunderstanding. Mitigations: tools authored in a separate PR or by a human; tools derived from framework internals rather than hand-picked fields; cross-checking against the DOM. This deserves its own section — it's the epistemological core of the product.

### Unstated assumption: the store is the ground truth — it isn't, quite
A whole class of frontend bugs lives *between* the store and the screen: the store says the cart is empty, but a stale memo/render still shows three items. A pure state channel is blind to exactly the bugs that make UI review necessary.

Strong version of the fix: make **cross-checking** the differentiator — "store says X, a11y tree says Y, flag the mismatch." That's a check no outside-in tool *or* pure state tool can do, converting the weakness into the best feature. It also means: don't pitch "no screenshots/DOM needed"; pitch **"state + DOM, reconciled."**

### Assumption 3 (dev/preview only) — sound, two additions
- Preview URLs are frequently public-by-obscurity, and the tools include *mutating actions* — the transport needs an auth token, not just "not in prod."
- Chrome's origin trial explicitly allows WebMCP on production traffic, so "the standard exists → someone will enable it in prod." The build-time refusal must be genuinely hard to bypass. Write down the threat model: a prompt-injected agent calling `submitCheckout` on a real account is the canonical WebMCP risk (Chrome publishes security guidance for exactly this).

### Assumption 4 (WebMCP stability) — see Section 1; stale as written
Mitigating factor: Groundstate controls both ends (SDK + bridge), so spec churn is absorbable behind an adapter. But the doc should stop describing WebMCP as the transport that works today — the bridge is.

### Assumption 5 (SPA-centric) — fine to scope, but the trendline is against it
React Server Components / Next.js App Router push state server-side. Either add a paragraph on the story for those apps (network-log + server-action visibility), or scope explicitly: "client-heavy apps only, for now."

### Assumption 6 (human decides "correct") — sound, keep it.

---

## 5. What to add or change

1. **Reorder the build: `reviewer-kit` + a local MCP bridge first; kill standalone `reviewer-agent` for v1.** The bridge is what makes the demo land in 30 seconds inside a tool devs already use.

2. **Add state *injection*, not just inspection — this may be the killer feature.** `loadFixture("checkout_declined_card")` / `setState(...)` tools that teleport the app into a target state in one call. This attacks the 20–30 minute reproduction tax the doc opens with far more directly than assertions do, and it's something outside-in tooling *cannot* do (Playwright must click its way there every time). It also makes agent runs fast and deterministic: inject state → exercise the one transition under test → assert. Reproduction-from-bug-report ("user says checkout broke with a declined card" → agent recreates the state instantly) deserves its own section.

3. **Zero-config baseline from framework internals.** Auto-derive read-only state tools from what's already introspectable — React DevTools hook, Zustand/Redux devtools, TanStack Query cache, router state. Devs get real value from `npm install` alone; curated `exposeState`/`exposeAction` becomes the upgrade path, not the entry fee. This is the strongest mitigation for assumption 1.

4. **A11y/DOM cross-check as a first-class feature** (store-vs-rendered reconciliation, per Section 4 above).

5. **Structured assertions from day one, not as a fallback.** Section 7 has this backwards. State snapshots are JSON — assertions on them can be plain, deterministic predicates (`cart.items.length === 0`). Let the LLM *plan and drive*, but make *pass/fail* mechanical wherever possible. A CI gate whose verdict is LLM-judged will flake, and flaky gates get muted within weeks — that's how this dies in a team setting.

6. **A flight-recorder tool.** Buffer state transitions (action → store diff) and expose `getStateHistory()`. When something fails, the agent gets the causal trace instead of two snapshots — disproportionately useful for the "reduce back and forth" goal.

7. **Doc hygiene:** update Section 0/4 for `document.modelContext`, the origin trial, and the no-native-agent-clients reality; add Chrome DevTools MCP (as complement *and* substitute) plus the agentic-E2E platforms (Autonoma et al.) to the Section 2 table.

---

## 6. Bottom line

Worth building — the validation plan against beenthere.page is exactly right, and the doc is unusually honest about its assumptions. Revise before building:

- The moat is **not** "an agent that reviews PRs" (crowded lane; Google is giving away the observability layer for free). The moat is the **developer-authored semantic contract between a running app and any agent** — inspection, injection, and actions.
- Aim v1 at the coding agent in the inner loop; make install-to-value under five minutes via auto-derived tools; treat the CI reviewer as the expansion, not the wedge.
- Write down the kill criterion for the beenthere.page experiment explicitly: **if, after instrumenting one real flow, the curated tools don't catch anything that DevTools MCP + `evaluate_script` wouldn't have, the premise fails** — and that's worth knowing in week two rather than month three.
