# Core SDK review — through the better-auth / pi.dev lens

**Date:** 2026-08-27 · **Scope:** `packages/core` primarily, plus `@groundstate/react` and `@groundstate/bridge` where they share the same API surface. Reviewed against the actual source, not memory.

> Companion doc: [Why Groundstate exists](./2026-08-27-why-groundstate-exists.md) — the problem, why each primitive exists, precedent audit, and the platform-absorption risk. Read that one for direction; this one for the API surface.

---

## Why developers love better-auth and pi.dev

Boiled down, both win on the same four things:

1. **Control.** Nothing happens behind your back. Pi's whole pitch is "adapt the tool to your workflow, not the other way around" — minimal core, full observability, no hidden behavior.
2. **Boring, guessable names.** better-auth: `signIn`, `signUp`, `getSession`. Pi's agent gets exactly four tools: `read`, `write`, `edit`, `bash`. You never open the docs to remember what something is called.
3. **Aggressive minimalism.** Pi's rule: "if I don't need it, it won't be built." Small core, fast, few concepts to hold in your head.
4. **The tool does the boring stuff.** better-auth's CLI (`generate`, `migrate`) scaffolds the boilerplate. Install-to-value is minutes.

## What's already right — don't regress these

- **Zero-dep core, ~500 LOC, `sideEffects: false`, ESM-only.** Exactly the tiny/batteries-included bar.
- **Structural typing in `@groundstate/react`** (`StoreLike`, `QueryClientLike`) — Zustand/TanStack support with no hard dependencies. This is the pi way.
- **Hard production guard, no override.** Opinionated where it matters (safety), unopinionated everywhere else.
- **`observeStore` one-liner** — install-to-value without writing curation code. The best DX in the repo.
- **Error messages include the recovery path** (`Unknown tool "x". Registered tools: ...`, the JSON-serializability error, the unknown-fixture error listing available fixtures). This matches Chrome's WebMCP guidance — "validate strictly in code, loosely in schema... descriptive errors so the model can self-correct" (⟦webmcp-best-practices⟧ — https://developer.chrome.com/docs/ai/webmcp/best-practices).
- **Tool strategy is sound:** each tool does one thing, no overlap, static registration by default — all explicitly recommended by the WebMCP best-practices doc.

---

## 1. The naming problem (the main issue)

One concept currently has up to **three different names** depending on where you look:

| Concept | JS API | Agent-facing tool | Internal / docs name |
|---|---|---|---|
| Read state | `observe()` | `get<Name>State` | "observable" — fine |
| Action | `act()` | your name | "developer-blessed action" |
| Jump to named state | `fixture()` | `loadFixture` / `listFixtures` | "fixture" |
| Baseline reset | `reset()` | `resetToGroundState` | "ground state" metaphor |
| Transition history | `record()` | `getStateHistory` | `FlightRecorder` class, "flight recorder" in docs |
| Health check | `doctor()` | `getGroundstateHealth` | doctor/health split |

The metaphors ("flight recorder", "ground state", "blessed") do work that names should do. A developer shouldn't need to decode the brand to use the API, and an agent reading `resetToGroundState` has no idea what "ground state" means without the description doing damage control. WebMCP's own guidance: "use clear and precise language to name tools... use verbs that describe exactly what happens."

### Recommendations

1. **`fixture` → `preset`.** "Fixture" is testing jargon, and wrong by analogy both ways: Cypress fixtures are static data files, Playwright fixtures are setup/teardown contexts. Neither means "named app state you can jump to." `preset` is universally understood: `groundstate.preset("cart_with_declined_card", fn)` → `listPresets` / `loadPreset`.
2. **`resetToGroundState` → `resetApp`.** Keep the metaphor in the README pitch, out of the API. The JS side is already just `reset()` — the tool name should match it.
3. **Kill "flight recorder" everywhere in docs, comments, and the class name.** The JS verb `record()` is good; the tool `getStateHistory` is good. The aviation layer between them is pure noise. Rename the internal class to `History`/`StateHistory` (it's not exported, cheap).
4. **`doctor()` → `health()`.** One concept, one name: `health()` in code ↔ `getGroundstateHealth` for agents. "Doctor" is CLI culture (expo doctor) but here it just adds a third synonym.
5. **Drop "developer-blessed".** It's not a pattern, it's an adjective nobody has heard — and `packages/core/package.json` already says "developer-approved" instead, which is clearer. Standardize on "approved" or just "actions you define."

Keep **`observe()` → `get<Name>State`** as-is: agent-facing tools need a verb prefix, and this asymmetry is documented. It's the one acceptable name mapping.

Minor awareness point: WebMCP examples use kebab-case tool names (`create-event`), the MCP ecosystem leans snake_case. camelCase works fine — just a deliberate choice to note, not change.

## 2. Dead API surface

- **`RecordOptions.limit` is a lie.** `record(name, source, _opts)` accepts `{ limit }`, documents it ("Keep at most this many entries, default 200"), and never reads it — `FlightRecorder` is always constructed with the default. Public API that silently does nothing is worse than no API. Pi's rule applies: remove the option until someone needs it (or wire it through — but removing is simpler).
- **`AGENTS.md` references `groundstate-critique.md`** — the file doesn't exist. Stale pointer; fix or delete.
- **Two CLI stories.** `groundstate.md` promises `npx groundstate bridge <url>`; reality is a `groundstate-bridge` bin in `@groundstate/bridge`. Pick one (see §3).

## 3. The missing DX layer: CLI + agent-native bootstrap

This is the biggest gap against the better-auth bar. better-auth's CLI does the boring stuff; Groundstate onboarding today is five manual steps, including a gnarly Chrome invocation with `--remote-debugging-port` and a throwaway profile path the developer has to invent.

Proposals, smallest first:

1. **`npx groundstate init`** — detect framework (Vite/Next), package manager, and stores (zustand/@tanstack in `package.json`); write `src/groundstate-setup.ts` with `init()` + `observeStore` stubs; patch the entry file with the dev-gated dynamic import (or print the exact snippet if patching isn't safe); print the next step. Kills the copy-paste-tax of onboarding.
2. **`npx groundstate connect`** — detect installed agent CLIs (`claude`, `codex`, `cursor`) and run (or print) the right `mcp add` command. Bonus: a flag that launches Chrome with the debugging port and throwaway profile for you — the single most annoying step today.
3. **Agent-native bootstrap: `init` also drops a skill file** (`.agents/skills/groundstate/SKILL.md`, or an AGENTS.md block) teaching the coding agent the tool-naming contract and how to add new `observe`/`act`/`preset` registrations. Today we bootstrap the *app* for the agent but not the *agent* for the app — the agent discovers tools at runtime but has no idea how to instrument new code. This is the agent-native equivalent of a README, and it's what makes the SDK self-propagating in agent-driven workflows.

Implementation constraint: core stays zero-dep — the CLI is a Node-only `bin` entry (never bundled into apps), either in the `groundstate` package directly (one CLI, matching the product doc) or a tiny separate package. Prefer one `groundstate` bin with subcommands (`init`, `connect`, and later `bridge`) over the current `groundstate-bridge` name.

## 4. What NOT to build (anti-over-engineering guardrails)

- **No plugin/middleware system.** `act()` already *is* the extension point — arbitrary named tools with schemas. That's sufficient.
- **No config file format** until a second consumer forces the question.
- **No console/network/screenshot tools.** DevTools MCP owns that layer; the existing stance is correct.
- **No cross-check / `@groundstate/ci` in v1.** Already phased for later; keep it out.
- **No knobs on `record()`** (see §2) until a real use case shows up.

## 5. Suggested order of work

1. **Naming pass** (§1) + remove the dead `limit` option (§2). Half a day, breaking but we're at 0.0.1 — this is the cheapest it will ever be.
2. **Docs sweep to match** — `site/content/docs/*.mdx`, both READMEs, JSDoc comments, the demo app. One naming table, zero metaphors in API prose.
3. **`npx groundstate init` + `connect`** (§3) — the largest DX delta for new users.
4. **Skill file bootstrap** (§3.3) — the agent-native differentiator.

The foundation is genuinely good — small, zero-dep, well-guarded, good errors. The work is making the surface as clear as the internals already are.

---

## Addendum (same day): what these functions are, vs the WebMCP spec

Follow-up discussion clarified two things worth recording.

**The WebMCP spec has exactly one primitive:** `document.modelContext.registerTool({ name, description, inputSchema, execute })`, unregistered via `AbortSignal` (see the spec explainer: https://github.com/webmachinelearning/webmcp). The GoogleChromeLabs `useWebMCP` hook shows the unopinionated baseline: one generic hook taking `name/description/inputSchema/execute`, nothing else. None of `observe`/`act`/`fixture`/`reset`/`record` exist in the spec — they are Groundstate's *conventions on top of registerTool*:

- `act()` ≈ raw `registerTool` (mutating). Nearly 1:1.
- `observe()` = `registerTool` + read-only annotation + a `get<Name>State` naming convention.
- `fixture()` = a Groundstate-only pattern: named setup functions served through two shared tools.
- `reset()` = sugar for one pre-named `act`.
- `record()` = a buffering subsystem + one read tool. Not a spec concept.

**Refined stance on renaming (after pushback that renames add learning curve):** the learning curve comes from *concept count* and *name→tool mismatches*, not from any single word. So the priorities, in order:

1. Docs should state the mental model up front: "everything is a WebMCP tool; these helpers are conventions over `registerTool`." A developer who knows the spec should instantly map every Groundstate function onto it.
2. Kill the *third* names (flight recorder, ground-state metaphors) and make JS name ↔ agent tool name predictable (`resetToGroundState` → `resetApp`, `doctor()` → `health()`).
3. `fixture` → `preset` is still worth doing — not because "fixture" is unknown, but because it has *active wrong meanings* in this audience's vocabulary (Cypress fixtures = static data files; Playwright fixtures = setup/teardown contexts). "Preset" has no wrong meaning. At 0.0.1 the rename cost is near zero; it only gets more expensive.
4. `reset()` is the thinnest concept (sugar for a named `act`). Keep it — a standard reset tool name every app shares is a useful convention for agents — but it's the first thing to cut if the API ever needs to shrink.

---

## Addendum 2: GoogleChromeLabs/webmcp-tools — what already exists, what it changes

Repo: https://github.com/GoogleChromeLabs/webmcp-tools. Three developer utilities + demos.

**What it provides:**

1. **Model Context Tool Inspector** (Chrome extension, on the Web Store) — inspect/monitor/execute WebMCP tools on a page, visualize input schemas, debug connection issues. Requires the "WebMCP for testing" flag in Chrome 150+.
2. **WebMCP Evals** (`npx webmcp-evals`) — TypeScript eval framework/CLI for LLM tool-calling. Modes: `local` (static schema files), `browser` (live page via Puppeteer + LLM: Gemini/Ollama/Vercel AI), **`smoke` (deterministic: executes expected calls directly against a live page, no LLM, CI-suitable)**, `analyze` (LLM root-causes failures). Constraint matching: `$pattern`, `$contains`, `$gte`, `$type`, etc.
3. **WebMCP Polyfill** (single JS file) — polyfills `document.modelContext` (imperative + declarative form tools, `toolchange`, cross-frame via postMessage) in browsers without native support.
4. Demos, incl. a Gemini in-page "page agent".

**Overlap map vs Groundstate:**

| webmcp-tools | Groundstate equivalent | Verdict |
|---|---|---|
| Inspector extension | `@groundstate/inspector` | **Overlapped.** Theirs needs native WebMCP + flag (Chrome 150+); ours works today against our own registry with zero flags. That's a real edge *now*, but fragile — once native ships broadly, the extension wins. Keep the inspector minimal; invest nothing further. |
| Evals CLI, esp. `smoke` | planned `@groundstate/ci` | **Partially overlapped — and it validates our invariant.** `smoke` is exactly our "deterministic verdicts, never LLM-judged" idea, already shipped by Google. Do NOT build a generic eval runner. Re-scope `@groundstate/ci` to what they can't do: fixture-based deterministic setup + state/history assertions. Note: since fixtures are exposed as ordinary tools (`loadFixture`), webmcp-evals can already call them — **composability, not competition**. |
| Polyfill | `transport.ts` adapter | **Composes for free.** If an app ships their polyfill, `document.modelContext` exists and our `registerNative` feature-detects into it — zero code. Worth a test to confirm. The polyfill only serves *in-page* agents; it does not reach external MCP clients. |
| — | `@groundstate/bridge` | **Uncontested.** Nothing in webmcp-tools connects a live page's tools to Claude Code / Codex / Cursor. Their world is in-browser agents (extension, Gemini page-agent). The bridge remains the v1 centerpiece. |
| — | core vocabulary (`observe`/`act`/`fixture`/`record`), auto-derivation, prod guard | **Uncontested.** Google ships raw `registerTool` and an unopinionated hook. Nobody ships the opinionated layer, store auto-derivation, fixtures, history, or the production guard. |

**Strategic read:** Google is building the *inspection and evaluation* layer around native WebMCP, and assuming in-browser agents. They are not building coding-agent connectivity, state injection, or dev-only guardrails. That sharpens the moat to: **bridge + core vocabulary + auto-derivation + prod guard + DX (CLI/skill bootstrap)**. For the hackathon submission, the composability story is a strength to state explicitly: Groundstate-instrumented apps make webmcp-evals smoke tests deterministic (via `loadFixture`), and work with the official inspector under native WebMCP.

**Shelf-life caveat (added later same day):** the "uncontested" column above has an expiration date. Chrome DevTools now ships a WebMCP panel (inspection + manual invocation + call history), the docs reference a "Chrome DevTools for agents" project, and chrome-devtools-mcp already carries experimental WebMCP tool support. When native WebMCP ships and official tooling connects coding agents to page tools, the bridge and inspector stop being differentiators. The durable value is the authoring layer — vocabulary, auto-derivation, fixtures/history, doctor, prod guard. Full analysis: [Why Groundstate exists](./2026-08-27-why-groundstate-exists.md).
