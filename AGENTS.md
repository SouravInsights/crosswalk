# AGENTS.md — Groundstate

Guidance for coding agents working in this repo. Read `groundstate.md` (product plan) and
`groundstate-critique.md` (design rationale) before making architectural decisions.

## What this is

Groundstate gives coding agents ground truth about a running web app. A dev-only SDK exposes
the app's real state and actions as WebMCP tools (`document.modelContext`), and a local bridge
makes those tools callable from any MCP client (Claude Code, Codex, Cursor) today, before
native WebMCP agent clients exist.

One line of positioning: **Chrome DevTools MCP tells the agent what the browser sees;
Groundstate tells it what the app knows.** We never rebuild what DevTools MCP already provides
(console logs, network logs, screenshots, generic a11y snapshots).

## Package map

| Path | npm name | What it is |
|---|---|---|
| `packages/core` | `groundstate` | Framework-agnostic runtime: `observe` / `act` / `fixture` / `reset`, transport adapter, production guard, internal registry. **Zero runtime dependencies — this ships inside people's apps.** |
| `packages/react` | `@groundstate/react` | React hooks (`useObservable`, `useAction`, `useFixture`). Auto-derived observables (Zustand, TanStack Query) are on the roadmap. |
| `packages/bridge` | `@groundstate/bridge` | Local MCP server (stdio) that connects a running page's Groundstate registry to an MCP client via CDP. The v1 centerpiece. |
| `examples/demo-app` | private | Vite + React + Zustand cart/checkout app used to develop and demo the loop. |

Planned, not yet scaffolded: `@groundstate/inspector` (tool-browsing web UI), `@groundstate/ci`
(scenario runner + GitHub Action). Do not create them without being asked.

## Architecture invariants

1. **Core has zero runtime dependencies.** Never add one. Dev-time deps are fine.
2. **Dev/preview only.** `init()` must refuse to start when it detects a production
   environment, loudly. Never weaken the guard; there is deliberately no override flag.
3. **Transport adapter order:** `document.modelContext` (spec current) →
   `navigator.modelContext` (deprecated, Chrome origin trial still serves it) →
   internal registry only (bridge reaches it via `window.__GROUNDSTATE__`). Feature-detect;
   never user-agent sniff.
4. **The bridge is the primary transport today.** No mainstream agent client consumes WebMCP
   natively yet (as of Aug 2026). Native registration is the standards bet, not the product.
5. **Tool naming is part of the API contract:** observables register `get<Name>State`,
   actions register their given name, fixtures are served through the single `loadFixture`
   tool (plus `listFixtures`), reset through `resetToGroundState`.
6. **Deterministic verdicts.** Anything CI-facing asserts mechanical predicates over JSON
   state snapshots. Never make pass/fail depend on an LLM judgment.
7. **Naming:** every package, binary, and public API derives from "groundstate". No off-brand
   names (no "reviewer-*", "agent-*").

## Conventions

- TypeScript strict, ESM-only, `verbatimModuleSyntax`. Node >= 20.
- Build with `tsup`, test with `vitest`, lint/format with Biome (`pnpm lint:fix`).
- pnpm workspaces + Turborepo. Internal deps use `workspace:*`.
- Versioning/publishing via Changesets — add a changeset with any user-facing change.
- Tests live next to sources as `*.test.ts`. Every exported behavior of `core` gets a test;
  the production guard and transport fallback order are the two most important behaviors
  in the repo — never leave them untested.
- Keep error messages actionable: say what was wrong and what to do, in one sentence each.

## Commands

```bash
pnpm install
pnpm build            # turbo run build (respects dependency graph)
pnpm test             # turbo run test
pnpm typecheck
pnpm lint:fix
pnpm --filter demo-app dev    # run the demo app
```

## Security posture (do not regress)

- Mutating tools (`act`, `loadFixture`, `resetToGroundState`) exist only because the guard
  restricts them to dev/preview. Any change that could let them run in production is a bug,
  full stop.
- The bridge assumes a locally-controlled browser (CDP). Before any remote/shared-preview
  transport ships, it needs the authenticated handshake described in `groundstate.md` §7.
- Threat model to keep in mind: a prompt-injected agent calling a mutating tool. Prefer
  small, explicit, developer-blessed actions over generic "run anything" surfaces.
