# Why Groundstate exists — the honest version

**Date:** 2026-08-27 · Companion to the [core SDK DX review](./2026-08-27-core-sdk-dx-review.md). Written to answer three questions: what are we actually doing, why does each primitive exist, and is this the right thing to build.

---

## The one-sentence answer

**Coding agents write most frontend code now, but they verify it by guessing from screenshots and DOM dumps. Groundstate lets the running app tell the agent the truth directly: what state it's really in, what it's allowed to do, how to jump to the exact broken state, and what happened along the way.**

If you strip everything else away, that's it. The app knows things the browser doesn't show. Today the agent only gets what the browser shows. Groundstate is the channel between the two.

## The broad view: the problem, as simply as I can say it

Code generation got solved. Verification didn't.

The daily loop of agentic frontend work looks like this: agent writes code → you run the app → something's off → you describe it → agent stares at a screenshot, guesses, edits, hopes → repeat. Every round trip costs minutes and tokens, and the agent is *inferring* the whole time because it cannot ask the app a single direct question.

Two separate costs hide inside that loop:

1. **Reproduction** — getting the app into the state where the bug lives. "The most difficult aspect of fixing a bug is often reproducing it in the first place" — that sentence is the founding thesis of Replay.io, a company that raised real money on exactly this pain (https://medium.com/replay-io/launching-replay-the-time-travel-debugger-for-the-web-f886f0897d38).
2. **Diagnosis** — once there, seeing *why*. Screenshots show what broke, never why. The console shows browser-level failures. Neither shows "the cart store has 0 items because the validation guard cleared it three transitions ago."

Outside-in tools — Playwright, computer-use, screenshots, DOM dumps — can never fix this, structurally: they see the *projection* of state (pixels, DOM), not the state. The samelogic essay on how agents see the web put it well: "The most underappreciated part of this problem is state" (https://samelogic.com/blog/how-agents-see-the-web). And the community is loudly, independently rediscovering this every week — "Your AI doesn't need screenshots, it needs DevTools", "Why AI coding agents still can't debug your UI reliably", "Screenshots are not browser state" — all making the same point: agents need runtime truth, not pixels. Most of those solutions attack the *browser* layer (console, network, DOM). The *app* layer — the store, the validation state, the state machine — is much less crowded. Domscribe (https://www.domscribe.com/) is a commercial product selling component props/state to coding agents, which is evidence people pay for the inside-the-app lane.

So: **why should this tool exist?** Because the verification loop is now the bottleneck of frontend development, the browser layer is being commoditized by Chrome DevTools MCP for free, and the only thing left that isn't generic — the only thing that requires being *inside* the app — is the app's own state and operations. Somebody has to write the bridge between "the app knows" and "the agent can ask." That somebody is the app developer, and the SDK exists to make that a five-minute job instead of a bespoke hack (`window.__appState = ...` plus prayers in CLAUDE.md).

## The small view: one bug, five primitives

Forget abstractions. Here is a single concrete story — using the actual demo app (`examples/demo-app/src/groundstate-setup.ts`) — showing what each primitive mechanically does and the exact moment it earns its existence.

**The bug report:** "After my card is declined, the cart total shows $0 even though the item is still in the cart." The agent's job: find it, fix it, prove it.

### The world without the SDK (even with Chrome DevTools MCP)

1. Open the app. Click "add to cart". Type an email. Submit a card that will be declined. Several minutes of clicking, typing, waiting.
2. Look at the screen: total says $0. Screenshot it, read the DOM — both say "$0".
3. Now the actual question: **is the store wrong, or is the rendering wrong?** The DOM cannot answer this. A screenshot cannot answer this. The only way to know is to add `console.log(store.getState())`, rebuild, and redo the entire click path from step 1.
4. Form a hypothesis, edit code, rebuild — and **redo the entire click path again** to verify. Every new hypothesis costs the full click path. This is the reproduction tax, and the agent pays it on every single iteration.

### The world with Groundstate — same bug

The developer wrote these lines once, at setup time (they're literally in the demo app):

```ts
observeStore("checkout", useCheckoutStore, { ... });   // → getCheckoutState tool + history
groundstate.act("submitCheckoutWithCard", ...);        // → submitCheckoutWithCard tool
groundstate.fixture("cart_with_declined_card", ...);   // → loadFixture / listFixtures tools
groundstate.reset(() => store.reset());                // → resetToGroundState tool
```

Now the agent's session, step by step:

**Step 1 — `fixture`.** The agent calls `loadFixture("cart_with_declined_card")`. The setup function the developer wrote runs (`store.reset(); addItem(...); setEmail(...); submit("declined_test_card")`) and the app instantly *is* in the broken state. Steps 1–2 of the old world collapse into one call, identical every time. **Why fixture exists: reproduction is the most expensive step in debugging, so it becomes a named, one-call operation.** (Precedent: Playwright `storageState`, Cypress fixtures, Storybook stories, Replay.io's whole founding thesis — "record once, never reproduce again.")

**Step 2 — `observe`.** The agent calls `getCheckoutState` and gets the store's real contents:

```json
{ "cartItems": [{ "title": "Kyoto itinerary", "price": 49 }], "cartTotal": 0, "paymentStatus": "declined" }
```

Item present, total zero → **the store itself is wrong, not the render.** That question was unanswerable from the DOM. **Why observe exists: the DOM is a lossy projection of state; the agent reads ground truth instead of inferring from pixels.** (Precedent: every state library ships a store inspector — Redux DevTools, Zustand devtools — because developers demand it. Chrome's WebMCP docs list "State" as a pillar of the API.)

**Step 3 — `record`.** The agent calls `getStateHistory` and sees the causal sequence:

```
seq 1  addItem       → cartTotal: 49
seq 2  submit(card)  → paymentStatus: "declined", cartTotal: 0   ← this transition did it
```

Not "state is wrong now" — *which transition made it wrong*. **Why record exists: bugs live in transitions, and a trace beats two snapshots the agent must diff in its head.** (Precedent: Redux DevTools time-travel; OpenTelemetry traces — "don't give me a snapshot, give me the trace.")

**Step 4 — fix, then `reset`.** The agent edits the decline handler. Before verifying, it calls `resetToGroundState` — a guaranteed clean slate, so the previous attempt's mutations can't contaminate the test. **Why reset exists: agents work by trial and error, and every trial needs a known starting line.** (Precedent: test-framework setup/teardown, database seeds.) It's the thinnest primitive — sugar for a pre-named `act` — but the convention is the point: every Groundstate app has the same reset tool.

**Step 5 — verify with `act`.** The agent calls `submitCheckoutWithCard("declined_test_card")` — exercising the real code path through the store, with typed arguments, not simulated clicks — then `getCheckoutState` again: total stays 49 after decline. Then `submitCheckoutWithCard("good_card")` for the happy path. **Why act exists: the agent must *do*, not just read — and it should do so through operations the developer chose, not by poking the UI.** (Precedent: this is WebMCP's own core primitive, `registerTool`.)

**Epilogue — `doctor`.** Next week someone refactors the store and renames `items`. The `getCheckoutState` selector now throws — and `getGroundstateHealth` fails loudly instead of silently feeding the agent garbage. Tools rot like tests rot; doctor is the smoke alarm.

### So why five separate functions at all, instead of one generic `registerTool`?

1. **Conventions the agent learns once.** Every Groundstate app exposes `get<Name>State`, `loadFixture`, `resetToGroundState`, `getStateHistory`, `getGroundstateHealth`. The agent doesn't re-learn each app's bespoke tools; the patterns transfer across apps.
2. **The read/write line matters.** `observe`/`record` are read-only — safe to call freely. `act`/`loadFixture`/`reset` mutate. That distinction is surfaced to the agent (`readOnlyHint`), so a cautious agent — or a human approving its calls — can treat them differently.

### Is there high-signal discussion of these primitives? Honest audit.

**From the Chrome team / spec community** (https://github.com/webmachinelearning/webmcp/issues):

- Their tooling effort goes to **inspection and evaluation**: the DevTools WebMCP panel (live tool list + invocation history + manual testing: https://developer.chrome.com/docs/devtools/application/webmcp), the inspector extension, and `webmcp-evals`. Notably, the DevTools panel's "Invoked tools log" *is* a record primitive — but at the tool-call level, not the app-state level.
- The pains under active discussion in spec issues are: **context cost of tools** ("Origin Trial research note: observations on tool exposure, validation, and context cost"), **progressive disclosure at scale** ("Tool collections"), **debugging annotations** ("Add debugging member to ToolAnnotations"), and **workflow-level context** ("Skills", issue #161 — "tools tell agents what a site can do; skills tell agents how to do it well").
- **Nobody in the spec community is discussing state injection (fixtures) or store-level observability.** The two most distinctive Groundstate primitives are unoccupied. The spec's use cases are all end-user-facing (booking, shopping, forms); the one nod to developers is a Gerrit code-review scenario — an agent helping a *user operate* a complex dev tool, not a coding agent debugging *its own* work.

**From the developer community:** the pain is confirmed loudly and repeatedly (sources above), the state layer is called out as the underappreciated gap, and at least one commercial product sells app-internal context to coding agents. Fixtures/history specifically are validated by adjacent testing culture (Playwright, Cypress, Storybook, Replay), not by the WebMCP world — because the WebMCP world is (so far) building for production end-users, not for development loops.

Verdict on the primitives: all five earn their existence. `observe`/`act` are table stakes; `fixture`/`record` are the differentiated ones with the strongest analog precedent; `reset` is the weakest but costs nothing and sets a useful convention.

## Are we building the right thing?

**The problem: unambiguously yes.** Real, growing, felt daily by exactly the developers this is for, with independent confirmation from every direction.

**The solution: mostly yes — but the value is not distributed where the repo currently spends it.** Here is the uncomfortable part:

Google is absorbing the *transport and inspection* layer. The DevTools WebMCP panel already does inspection and manual invocation. "Chrome DevTools for agents" exists to help AI agents test and use a page's WebMCP tools, and chrome-devtools-mcp already ships experimental WebMCP tool support. When native WebMCP ships and DevTools MCP connects to page tools, "Claude Code calls your page's tools" risks becoming a Chrome feature. The **bridge** — currently the centerpiece — has a shelf life as a differentiator. Same for the **inspector**.

What the platform is *not* building, and structurally cannot commoditize:

1. **The authoring layer** — the vocabulary and conventions (`observe`/`act`/`fixture`/`record`), and especially **auto-derivation** from Zustand/TanStack. Someone has to write all these tools, on every site, forever. An SDK that derives them from what already exists in the app is the difference between "WebMCP is a chore" and "WebMCP is one line."
2. **The state-specific primitives** — fixtures and state history. Browser-level tools can't inject app state or trace store transitions; only app code can. Unoccupied in the spec world, validated by testing culture.
3. **Tool health** — `doctor`. As sites ship tools and then refactor, tools rot silently. The spec issues show context cost and validation are known pains; tool *rot* is barely on anyone's radar yet. It's coming.
4. **The dev-only guard** — nobody else has an opinion about keeping mutating agent surfaces out of production.

So: right problem, right primitives, but the durable value is in the **SDK vocabulary + auto-derivation + fixtures/history + health**, not in the bridge or the inspector. The bridge is how it works *today*; the vocabulary is what survives the platform catching up.

## The pivot question: as every site ships WebMCP tools, where's the growing pain?

The spec issues and Google's own tooling tell you exactly what hurts at scale:

| Growing pain | Who's addressing it | Groundstate's position |
|---|---|---|
| Too many tools, context cost, agent confusion | Spec issues (tool collections, progressive disclosure), unresolved | Auto-derivation + curation conventions directly answer "who writes and prunes all these tools" |
| Tool quality — does the agent pick it, does it work | Google: webmcp-evals, DevTools panel | Occupied. Compose, don't compete |
| **Tool rot — refactor breaks tools silently** | **Nobody** | `doctor` is the only artifact that exists. This grows with every site that ships tools |
| Workflow context ("skills") — how to use tools *well* | Spec issue #161, unresolved, experimental | The skill-file bootstrap from the DX review points the same direction |
| Reproducing/diagnosing issues | Replay (heavyweight, record-the-world) | Fixtures + `getStateHistory`: the lightweight, app-level version |
| Trust/security of mutating tools | Spec security chapter, Chrome guidance | The prod guard is a real opinion nobody else ships |

The pivot is not a rewrite — it's a **re-framing with one eye on the bigger wave**. The current wedge (your own app, your coding agent, the dev inner loop) is right for now: the pain is personal, demoable daily, and perfect for the hackathon. But the same primitives read as answers to the ecosystem's coming pains: authoring at scale, tool rot, deterministic reproduction. Keep building the wedge; write the docs and pitch so the primitives are legible as the general answers. If the inner-loop wedge stalls (the kill criterion in `groundstate.md` fires), the assets pivot cleanly to "authoring + health tooling for the WebMCP era" without throwing code away.

## What to actually do

1. Keep the inner-loop wedge for the hackathon. It demos the best.
2. Invest in the primitives the platform can't absorb: auto-derivation quality, fixtures, history, doctor. Underinvest in bridge/inspector polish beyond "works reliably."
3. Track chrome-devtools-mcp's WebMCP support monthly. The day a coding agent can call a native page's tools through official Chrome tooling, the bridge becomes the fallback story, and the pitch shifts fully to the authoring layer.
4. Keep the kill criterion honest. If curated tools don't beat DevTools-MCP-plus-`evaluate_script` on a real flow, better to know in week two.
