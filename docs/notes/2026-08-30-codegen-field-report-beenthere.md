# Field report: first real-world run (beenthere, 2026-08-30)

The first run of `webmcp-codegen` against a real production API: beenthere's
`apps/server/openapi/openapi.json` — 73 operations (36 GET / 26 POST / 4 PATCH /
7 DELETE), OpenAPI 3.0.3, no operationIds, no security blocks, no component
schemas, every operation has a summary.

Ran zero-config from the repo root: `npx webmcp-codegen generate`.

## What worked

- **Detection** found `apps/server/openapi/openapi.json` from the repo root, no
  flags, no config — the exact scenario the feature was built for.
- **All 73 ops generated**; every name unique and spec-valid despite zero
  operationIds. No collisions (method prefix does its job).
- **Generated TypeScript compiles clean** under `--strict` (verified with tsc,
  bundler resolution, DOM libs).
- **Real input schemas**: 26 ops carry request bodies; query params keep their
  descriptions end-to-end (`"Text to search for (e.g. 'Paris')"` survives into
  the generated schema). No `$ref` leaks, no param/body name collisions.
- **Descriptions are real** — beenthere's spec has summaries on all 73 ops, so
  no template-description warnings fired. The audit's pressure works.

## What broke / what we missed

### P0 — the audit missed endpoint *roles*, not just verbs
A **Razorpay webhook receiver became an agent tool** (`post-webhooks-pro-razorpay`
— "Razorpay Pro webhook"). An agent could replay payment webhooks. Also
generated: admin endpoints (`post-v1-admin-feature-access-approve`,
`get-v1-admin-users-search`, …) and auth endpoints (`post-v1-auth-signin-otp`,
`post-v1-auth-signup`). 9 ops total under `/admin`, `/auth`, `/webhooks`.

Classification by HTTP verb is not enough. The audit needs path-pattern rules:

- `/webhook` paths → **error**: webhook receivers are server-to-server, never
  agent tools
- `/admin` paths → **error** (default; `--force` or config override): privilege
  boundary an agent should not cross by default
- `/auth` paths → **warning**: session-sensitive, usually wrong as a tool

This is exactly the "developers must trust the tool" bar — the safety layer has
to catch what a tired human misses at 73 operations.

### P1 — `v1-` prefix pollutes every name
73/73 tools are named `get-v1-…`, `post-v1-…`. Detection: when ≥ ~80% of paths
share a leading version segment (`/v1`, `/api`, …), strip it from names and say
so in the report ("stripped shared /v1 prefix from 73 tool names"). Config escape
hatch: `stripPrefix: false | string`.

### P1 — monorepo output placement
Running from the repo root wrote tools to `<root>/src/webmcp`, which belongs to
no app. The right flow is `cd apps/web && npx webmcp-codegen generate --spec
../server/openapi/openapi.json`. Detection can't know which app should own the
tools — this is a **docs** problem, not a code problem.

### P2 — schema strictness
- Input schemas should emit `"additionalProperties": false` so agents don't
  invent arguments (17 no-input tools currently advertise an open object).
- `readOnly: true` properties should be dropped from input schemas. (beenthere's
  spec doesn't mark them — `id`/`slug` are offered as inputs to "create trip" —
  but when specs do mark it, we must honor it. Also a docs best-practice note.)

### P2 — barrel honesty
`registerAllTools()` registers all 73 tools including 73 unimplemented
`execute()` stubs that throw. Cherry-picking imports already works; docs should
show it. No code change.

## Improvement backlog (priority order)

1. Audit: endpoint-role rules (webhook → error, admin → error, auth → warning)
2. Naming: auto-strip shared version prefix from tool names
3. Schemas: `additionalProperties: false` on all input schemas
4. Schemas: drop `readOnly` properties from inputs
5. Docs: monorepo section (run from the app dir; `--spec` across packages)
6. Docs: commit generated files; cherry-pick registrations for large APIs
