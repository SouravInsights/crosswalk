# AGENTS.md — webmcp-stack

Guidance for coding agents working in this repo. Read `docs/specs/codegen-design.md`
(product design) and `docs/specs/first-run-experience.md` (the zero-config flow) before
making architectural decisions. Decision history lives in `docs/notes/`.

## What this is

webmcp-stack is the tooling stack for the WebMCP ecosystem. Its first product is codegen,
which generates safe, typed, human-reviewed WebMCP tools from the API contracts
developers already have (OpenAPI today), instead of hand-writing `registerTool()` calls
for every action. It writes real files into the user's repo (drizzle/shadcn style): no
runtime dependency on this package, no black box deciding what gets exposed to agents.

The safety audit is the differentiator: classification (read/write/destructive), PII and
auth-boundary warnings, and endpoint-role rules (webhooks are never tools). The audit
blocks generation on errors; `--force` is the only override.

## Writing style (strict)

No em dashes (—), no middle-dot separators (·), no AI-slop lingo. This applies to everything
user-facing: site copy, docs, CLI messages, generated-file comments, code comments. Write
like better-auth/Drizzle docs: plain words, short sentences, say what the thing is.

## Package map

| Path | npm name | What it is |
|---|---|---|
| `packages/codegen` | `@webmcp-stack/codegen` | The CLI (`webmcp-codegen generate / dev / init`) and the pipeline. Single runtime dep: `yaml`. |
| `packages/codegen/src/sources` | — | Input adapters. `openapi` today; tRPC and Zod are on the roadmap. |
| `packages/codegen/src/generators` | — | Output generators, named after what they produce. `js` today. |
| `packages/codegen/src/dev` | — | The local tools dashboard (`webmcp-codegen dev`). |
| `examples/openapi-petstore` | private | Example app with tools generated from the Petstore spec. |
| `site/` | private | Landing page and docs (Next.js + Fumadocs). |

## Architecture invariants

1. **Generated files never clobber user code.** The generated region sits between markers;
   user code below the marker survives regeneration. Hand-edited generated regions produce
   a `.new` file, never a silent overwrite.
2. **The audit fails loudly.** Errors block `generate` (nonzero exit, CI-friendly). Warnings
   report and continue. Never downgrade this without being asked.
3. **No runtime dependency.** Generated code must not import from `webmcp-codegen`.
4. **Zero-config first.** Detection (spec, app package) must work from a repo root with no
   flags and no config. Flags and `codegen.config.mjs` are overrides, not requirements.
5. **Naming:** names say what the thing is. No jargon (no "IR", no "emitters"). Generators
   are named after what they produce (`js`, and planned: `html`, `react`, `manifest`).
6. **The dashboard adds nothing to the user's app.** It reads the project, saves edits to
   `.webmcp-codegen.json`, and those edits survive regeneration.

## Conventions

- TypeScript strict, ESM-only, `verbatimModuleSyntax`. Node >= 20.
- Build with `tsup`, test with `vitest`, lint/format with Biome (`pnpm lint:fix`).
- pnpm workspaces + Turborepo.
- Versioning/publishing via Changesets: add a changeset with any user-facing change.
  Publishing is done by the user, never by an agent.
- Tests live next to sources as `*.test.ts`. The audit (safety.ts) and naming rules are
  the two most important behaviors in the repo: never leave them untested.
- Keep error messages actionable: say what was wrong and what to do, in one sentence each.

## Commands

```bash
pnpm install
pnpm build            # turbo run build
pnpm test             # turbo run test
pnpm typecheck
pnpm lint:fix
pnpm --filter site dev    # landing page and docs on :3001
```
