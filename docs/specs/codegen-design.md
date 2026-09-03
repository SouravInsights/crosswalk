# webmcp-codegen — Design Document

> Generate high-quality, safe, well-typed WebMCP tools from the backend you already have — without magic, without hiding what the tool does, and without taking control away from the developer.

---

## 1. Why this, why now

WebMCP (`document.modelContext`) is real but early: dev trial behind `#enable-webmcp-testing` since Chrome 146, origin trial scheduled for Chrome 149–156, shipping targeted at Chrome 157 (per the blink-dev intent-to-experiment). The spec is still evolving in the W3C WebML Community Group with no cross-browser guarantee yet. A small ecosystem has already sprung up — a DevTools inspection panel, a Chrome extension, a React hook, an edge adapter, public registries/directories, and an evals CLI from Google. What's *missing* is the thing every developer actually needs first: **a reliable way to turn the API/backend logic they already have into good tool definitions**, without hand-writing `registerTool()` calls for every action, and without a black box deciding what gets exposed to an agent on their behalf.

This doc lays out how to build that — a codegen toolkit — with room to grow naturally into testing, security auditing, and observability, because those are downstream of "what tools exist and what do they do."

---

## 2. Philosophy

The explicit reference points here are tools like **better-auth**, **Drizzle**, **shadcn/ui**, and **tRPC** — projects developers love not because they're the most powerful, but because they respect the developer's control and mental model. Concretely, that means:

### 2.1 Codegen, not runtime magic
The toolkit generates real, readable TypeScript/JavaScript files into the developer's own repo — not a hidden runtime layer that reflects over their API at request time. If a tool does something surprising, the developer can open the generated file and read exactly what it does, the same way `drizzle-kit generate` writes a migration file you can inspect before running it, or `shadcn add` copies a component into your codebase instead of installing an opaque package.

**Non-negotiable:** nothing generated is executed against a live agent until a human has looked at it. Generation and registration are always separate steps.

### 2.2 Simplicity is a constraint, not a nice-to-have
Everything else in this doc pulls *against* simplicity: more sources, more outputs, more safety rules, more plugins all sound good in isolation and add up to a project nobody wants to learn. Concretely, simplicity means:

- **Few concepts to learn.** A developer should hold the entire mental model in their head: sources → tools → review → register. Not a dozen package names.
- **Zero-config works for the common case.** `webmcp-codegen init && webmcp-codegen generate` should produce something correct for a typical project without the developer writing a config file first. Config exists for the 20% that need it, not as a prerequisite for the 80% that don't.
- **One blessed path.** Where there are five plausible ways to do something, ship one good default and document it well, rather than exposing every option day one. Options can be added later when someone actually needs them; they're very hard to remove once shipped.
- **Small CLI surface.** A handful of commands whose names alone tell you what they do, not a command per feature. (See the command table in §6.2.)
- **Resist premature infrastructure.** The plugin SDK, the multi-package split, telemetry — real, but deferred to later phases specifically *because* building them before there's a proven need is how projects accumulate complexity nobody asked for.
- **Boring, predictable output.** Generated code should look like code a competent developer would have written by hand — no clever abstractions, no framework-specific ceremony.
- **Names say what the thing is.** `sources`, `outputs`, `tools`, `form`, `reactHooks`, `manifest`: not "emitters", not "IR". This applies to internals (directories, types, files) as much as to the public CLI and config.

When a proposed feature and simplicity conflict, simplicity wins by default; the feature has to earn its way in with real evidence of need, not hypothetical completeness.

### 2.3 You own the output
Generated files are yours. Edit them, delete the toolkit, keep the files — everything still works. No runtime dependency on this package is required at execution time beyond a small, optional helper library (and even that should be inlineable).

### 2.4 Schema-first, type-safe end to end
Every tool's `inputSchema` is derived from a real type (Zod, TypeBox, a Prisma model, an OpenAPI schema, a tRPC procedure) and the generated `execute()` signature is fully typed against it. If the source schema changes, regeneration should surface a diff, not silently drift.

### 2.5 Safe by default, not safe by permission
A developer should have to *opt out* of safety, not opt in. Every generated tool ships with a risk classification, correct MCP hints (`readOnlyHint`, `destructiveHint`, `idempotentHint`), and sane defaults for what data is allowed to leave the page. Getting this wrong is exactly the kind of mistake the spec's security chapter warns about (tool-metadata poisoning, intent misrepresentation, over-parameterized data extraction) — the toolkit's job is to make the *safe* path the *easy* path. Held in tension with §2.2: safety defaults should be a short, well-chosen list of rules, not an ever-growing rule engine — depth comes from a handful of rules being *right*, not from having many of them.

### 2.6 Progressive adoption
A team should be able to generate one tool for one endpoint on a Tuesday afternoon and see it work, with zero build-system changes. The full pipeline (plugins, CI checks, observability) should be additive, never a prerequisite.

### 2.7 Framework-agnostic core, thin adapters everywhere
The pipeline core and the generation engine know nothing about React, Next.js, or Express. Everything framework-specific, including a Next.js route scanner, a React hook binding, or a Rails adapter, is a small, replaceable adapter. Same shape as better-auth's core + framework-adapter split. ("Thin adapters" means small in *scope*, not necessarily separate npm packages: see §10.)

### 2.8 The CLI is a first-class product
`npx @webmcp-stack/codegen init`, `webmcp-codegen generate` — as polished as `drizzle-kit` or `better-auth`'s CLI, and few enough commands that a developer learns the whole CLI by using it once. Good error messages, good defaults, plain-English output over flags and options.

---

## 3. Problem statement recap

| Pain today | Consequence |
|---|---|
| Every WebMCP example in the wild is hand-written `registerTool()` calls | Doesn't scale past a handful of demo tools |
| No standard way to derive tool descriptions/schemas from existing API contracts (OpenAPI, GraphQL, tRPC) | Duplicated, drifting definitions |
| No default safety classification | Developers under-think which tools are destructive, or over-expose data |
| Descriptions are hand-written prose | Prone to being vague, misleading, or (worse) accidentally prompt-injectable |
| No idiomatic way to regenerate without clobbering manual edits | Teams either don't regenerate, or lose customizations |
| No CI story for "did this tool's contract silently change" | Schema drift ships to production undetected |

---

## 4. Architecture overview

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│   Sources   │ --> │  Normalize   │ --> │  Safety Layer  │ --> │   Outputs    │
│ (adapters)  │     │ (one format) │     │ (classify/lint)│     │ (codegen out)│
└─────────────┘     └──────────────┘     └───────────────┘     └──────────────┘
      │                                                                 │
      │                                                                 ▼
      │                                                     generated *.webmcp.ts
      │                                                     files in the repo,
      │                                                     reviewed by a human,
      │                                                     imported and registered
      │                                                     explicitly by the dev
      ▼
 OpenAPI / GraphQL SDL / Validation schemas (zod) & tRPC routers /
 Prisma schema / JSDoc-annotated functions /
 manual YAML tool spec
```

### 4.1 Sources
Pluggable parsers that turn *something the developer already has* into one shared format. Ship a small, focused set of sources:

- **OpenAPI**: parses an OpenAPI 3.x spec and answers "what does the HTTP API expose" (most backend frameworks can already emit one)
- **`schema`**: consumes Standard Schema (`zod` / `valibot` / `arktype`) and answers "what should an agent be able to do, in my product's terms"
- **tRPC**: introspects a tRPC router, reusing existing Zod input/output schemas directly (no schema translation needed)
- **Schema-annotated functions**: for teams who just want to hand-annotate plain functions with a Standard Schema and a doc comment
- **Prisma** *(later)* — generate read/list tools directly from a Prisma schema, with safe defaults (no raw `delete` tool without explicit opt-in)
- **GraphQL** *(later)* — SDL + selected operations → tools

Each source's only job is to produce a list of `CandidateTool` objects in the shared shape below. It does **not** decide what's safe or write any output. That's the safety layer's and the outputs' job, kept deliberately separate so sources stay simple and the safety rules stay consistent everywhere.

### 4.2 The intermediate format — `CandidateTool`

```ts
interface CandidateTool {
  // Identity
  id: string;                     // stable id, used for diffing across regenerations
  suggestedName: string;          // e.g. "get-order-status"
  sourceLocation: {
    kind: "openapi" | "trpc" | "schema" | "prisma" | "graphql" | "manual";
    ref: string;                  // e.g. "GET /orders/{id}" or "orders.getById"
  };

  // Contract
  inputSchema: JSONSchema;        // always derived, never hand-typed as JSON
  outputSchema?: JSONSchema;      // populated when the source has response typing
  inputTypeRef: string;           // TS type name to import/generate, for full type safety

  // Behavior classification (see §5)
  httpMethod?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  sideEffect: "read" | "write" | "destructive" | "navigate" | "unknown";
  requiresAuth: boolean;
  touchesPII: string[];           // field paths flagged by the PII heuristics

  // Description
  draftDescription: string;       // machine-suggested, always human-reviewable before commit
  descriptionSource: "docstring" | "openapi-summary" | "llm-suggested" | "manual";
}
```

This one shared shape is the seam that lets sources, safety rules, and outputs evolve independently: the same kind of internal boundary that made Babel's plugin ecosystem or ESLint's rule system easy for third parties to extend.

### 4.3 Safety layer
Takes `CandidateTool[]`, applies a rules pipeline, and produces `ReviewedTool[]` with:
- a **risk tier** (`safe-read`, `write-confirm`, `destructive-confirm`, `blocked`)
- correct WebMCP hints (`readOnlyHint`, `destructiveHint`, `idempotentHint`)
- flags and human-readable warnings (see §5) attached but **never auto-fixed silently** — the CLI surfaces them, the developer decides
- suggested `exposedTo` scoping based on auth requirements (e.g., a tool wrapping an authenticated endpoint should default to not being exposed to `native-agent` until the developer confirms session handling is correct)

### 4.4 Outputs
Turn `ReviewedTool[]` into actual files. Each output is named after what lands in your repo:

- **`tools`**: emits `.webmcp.ts` tool files with `registerTool()` call sites (the spec's "imperative" style), one file per source file/route, colocated near the source (`orders/route.ts` → `orders/route.webmcp.ts`)
- **`form`**: annotates literal `<form>` elements with the four declarative attributes, when a real form element exists (many React surfaces have none; those use the `tools` output instead)
- **`reactHooks`**: wraps the above with the `useWebMcpTool` hook pattern for React apps
- **`manifest`**: emits a `/.well-known/webmcp.json` static manifest for discovery/registries, generated from the same pipeline so it can never drift from the actual tools

Outputs use a **merge marker** strategy (like `graphql-codegen` or Rails scaffolding) so regeneration doesn't clobber manual edits:

```ts
// ─── webmcp-codegen: generated — do not edit above this line ───
export const getOrderStatusTool = {
  name: "get-order-status",
  description: "Returns the current status and tracking info for an order by ID.",
  inputSchema: GetOrderStatusInput, // from ./schemas.generated.ts
  destructiveHint: false,
  readOnlyHint: true,
} satisfies ToolDefinition<typeof GetOrderStatusInput>;
// ─── webmcp-codegen: end generated block ───

// Your code below is preserved across regenerations.
export async function executeGetOrderStatus(input: GetOrderStatusInput) {
  const order = await db.order.findUnique({ where: { id: input.orderId } });
  if (!order) return { content: [{ type: "text", text: "Order not found." }] };
  return { content: [{ type: "text", text: `Status: ${order.status}` }] };
}
```

Note the split: **schema and metadata are regenerated freely; the `execute` implementation is scaffolded once and then owned entirely by the developer.** This is the single most important DX decision in the whole system — it's what lets the codegen be re-run safely as the backend evolves, without ever silently changing what a tool actually *does*.

---

## 5. Safety & security features (the differentiator)

This is where the project should invest the most design effort — it's the thing nobody else in the current ecosystem has built well, and getting it wrong is a genuine risk.

### 5.1 Automatic risk classification
Heuristics, all overridable:
- HTTP method → default side-effect (`GET`/`HEAD` → read, `DELETE` → destructive, `POST`/`PUT`/`PATCH` → write, pending inspection)
- Route/field naming heuristics flag likely-destructive actions even on nominally "safe" verbs (`POST /orders/{id}/cancel`)
- Anything classified `write` or `destructive` defaults to requiring an elicitation/confirmation step in the generated code. The codegen scaffolds a `requestUserConfirmation()` call rather than executing immediately

### 5.2 PII & secret field detection
A field-name + type heuristic pass (extensible via plugin) flags likely-sensitive fields — `password`, `ssn`, `token`, `secret`, `apiKey`, `email`, `dob`, credit-card-shaped strings — in both inputs *and outputs*. Flagged output fields are excluded from the generated response by default, with a loud comment explaining why and how to override:

```ts
// ⚠️  webmcp-codegen flagged `user.email` and `user.phone` as likely PII.
// They are excluded from this tool's output by default.
// If the agent genuinely needs them, uncomment deliberately:
// email: user.email,
```

### 5.3 Description linting
Because tool descriptions are literally part of the prompt an agent reasons over, they're a real injection surface. The audit pass lints descriptions for:
- vagueness relative to what the code actually does (cross-checked against the candidate's side-effect classification — e.g. a description that doesn't mention "irreversible" or "cannot be undone" for a `destructive` tool gets flagged)
- suspicious imperative phrasing that looks like it's trying to instruct the *agent* rather than describe the tool (a known WebMCP manifest-poisoning pattern)
- length/format budget guidance in line with published browser guidance on tool description size

### 5.4 Auth-boundary checks
If a source route requires authentication/authorization and the generated tool doesn't have an obvious server-side session check wired in, the audit pass fails with a specific, actionable error — not a generic warning.

### 5.5 The audit pass — a security lint, like `npm audit`
Audit checks run **inside `generate` by default** (not a separate step to remember; `--skip-audit` to bypass), and as a standalone `webmcp-codegen audit` command from Phase 1 onward for CI use without regeneration:

```
$ webmcp-codegen generate

  ✖ 2 tools missing destructiveHint despite DELETE-verb source route
  ⚠ 1 tool exposes `user.ssn` in output — excluded by default, flagged for review
  ⚠ 3 tools have descriptions under 10 words — likely too vague for reliable agent use
  ✓ 14 tools passed all checks

  Run with `--fix` to apply safe auto-fixes (hints, exclusions only —
  never descriptions or execute() bodies).
```

This should become the thing teams run in CI, the same way `npm audit` or `eslint` runs today — with exit codes that make it a real CI gate, not just a report.

### 5.6 Consent/elicitation component library
A companion module ships accessible, framework-specific components implementing the "agent proposes, human confirms" pattern (the same pattern as the spec's own graphic-design and Gerrit examples — staged, reviewable changes before commit). This turns a UX problem every team currently solves from scratch into an import.

---

## 6. Developer experience details

### 6.1 Zero-config start
```bash
npx @webmcp-stack/codegen init
```
Detects the project's framework and existing API layer (looks for an OpenAPI file, a tRPC router, Prisma schema, etc.), proposes a source, and scaffolds config:

```ts
// codegen.config.ts
import { defineConfig } from "@webmcp-stack/codegen";
import { openapi } from "@webmcp-stack/codegen/sources";
import { tools } from "@webmcp-stack/codegen/outputs";

export default defineConfig({
  sources: [openapi({ spec: "./openapi.yaml" })],
  outputs: [tools({ outDir: "./src/webmcp" })],
  safety: {
    piiFields: ["ssn", "creditCard"], // extend the default heuristics
    requireConfirmationFor: ["write", "destructive"],
  },
});
```

### 6.2 Core CLI surface
The first run needs nothing at all: `npx @webmcp-stack/codegen generate` auto-detects the spec (OpenAPI/Swagger filenames, monorepo-aware search) and generates into `./src/webmcp`, with `--spec`/`--out` as config-free overrides. The config file (`init`) is the upgrade path for control, not a prerequisite. Beyond that, the MVP surface is deliberately small. Audit checks run automatically as part of `generate` (with `--skip-audit` to bypass); everything else from earlier drafts (`diff`, `watch`, `doctor`, `snapshot` as standalone commands) is real but deferred — a flag or `--watch` mode on `generate` is cheaper to add later than a command is to remove.

| Command | Purpose |
|---|---|
| `webmcp-codegen init` | scaffold config (or detect + skip config entirely for the common case), detect sources |
| `webmcp-codegen generate` | run the pipeline, write/update files, run the audit checks from §5.5 by default (`--skip-audit` to bypass, `--dry-run` to preview without writing) |
| `webmcp-codegen generate --watch` | regenerate on source changes during local dev |

*Deferred, added only if real usage shows they're needed as distinct commands:* `audit` (standalone, for CI without regeneration — Phase 1), `diff` (standalone diff outside `--dry-run`), `snapshot` (schema-drift CI check — Phase 2, with the test module), `doctor` (diagnostics beyond what `init`/`generate` already report inline).

### 6.3 Type safety end to end
When the source is tRPC or `schema`, the generated `inputSchema` (JSON Schema) is derived *from* the same schema used at runtime, not a hand-maintained parallel definition, so there is exactly one source of truth and no drift possible between "what the type system thinks the input is" and "what's advertised to the agent."

### 6.4 Testing harness
A test module provides a mock agent for unit/integration tests:

```ts
import { mockAgent } from "@webmcp-stack/codegen/test";

test("get-order-status returns tracking info", async () => {
  const agent = mockAgent(tools);
  const result = await agent.call("get-order-status", { orderId: "123" });
  expect(result.content[0].text).toContain("Status:");
});
```

Plus a snapshot mode for CI schema-drift detection — fails the build if a tool's `inputSchema` changed without an accompanying changelog note, catching silent breaking changes to agent-facing contracts the same way API snapshot testing catches breaking REST changes.

### 6.5 Docs & playground
A documentation site with a live in-browser playground (generate from a sample OpenAPI spec, see the output instantly) is worth the investment early — this is a big part of why tools like better-auth and Drizzle convert casual visitors into users.

---

## 7. Extensibility / plugin system (designed now, built in Phase 2)

*This section is a design sketch to keep the pipeline seams honest. Building the plugin SDK before there's proven need is exactly the premature infrastructure §2.2 warns against.*

Modeled directly on better-auth's plugin shape: a plugin can hook into any stage of the pipeline.

```ts
interface CodegenPlugin {
  name: string;
  onCandidateTools?(tools: CandidateTool[]): CandidateTool[] | Promise<CandidateTool[]>;
  safetyRules?: SafetyRule[];
  outputs?: ToolGenerator[];
}
```

Example community/first-party plugins:
- **Stripe** — special-cases payment endpoints (always `destructive-confirm`, always redacts card fields, injects idempotency-key handling)
- **audit-log** — auto-wraps every generated `execute()` with a structured audit log call
- **rate-limit** — injects per-tool rate limiting using a project's existing rate limiter
- **registry-publish** — pushes the generated manifest to a WebMCP registry on `generate --publish`

A plugin registry/marketplace (even a simple curated list on the docs site to start) helps this compound the way better-auth's plugin ecosystem did.

---

## 8. Natural extensions: observability (phase 2, not phase 0)

Since the pipeline already knows each tool's risk tier, source route, and PII exposure, it's a small step to correlate that with runtime call logs:

- a thin telemetry client emitting OpenTelemetry spans around tool discovery and execution (tool name, caller origin, latency, success/failure, risk tier)
- self-hostable dashboard (open-core) answering: which tools are agents actually calling in production, which ones fail schema validation most often, what fraction of "conversions" are agent-assisted
- explicitly **not** phase 0 — it reuses the same tool metadata rather than being a separate system bolted on later

---

## 9. Comparison to existing ecosystem projects

| Project | What it does | How the codegen differs |
|---|---|---|
| `GoogleChromeLabs/webmcp-tools` (Evals CLI) | Contract-tests tool definitions against expected agent behavior | The codegen generates the tools in the first place; the test harness (§6.4) is complementary |
| `basgr/cf-webmcp` (Cloudflare Worker) | Publishes discovery manifests, annotates declarative form attributes, and injects a registration bootstrap at the edge from one TOML, with no origin code changes | The no-code/edge lane for content sites and simple forms; this toolkit targets teams with real backend logic who need typed, reviewed tool code in their own repo |
| `@webmcp-registry/kit` (webmcp-registry.dev) | `defineTool` (Zod → JSON Schema), React registration hooks, `webmcp sync` CLI that pushes schemas to their registry | A definition + publishing kit: tools are still hand-authored, no derivation from OpenAPI/tRPC/Prisma, no safety classification. Our `manifest` output can publish *to* it |
| `use-webmcp-tool` (React hook) | Thin registration hook | The same pattern ships here as one small output |
| Directories/registries (webmcp.com, webmcpregistry.org) | Discovery/indexing of sites and tools | The codegen is a producer that can *publish to* these, not a competing directory |
| DevTools WebMCP panel / inspector extension | Local debugging of already-registered tools | Complementary — the codegen generates the tools they inspect |

The honest positioning: **the codegen sits upstream of everything else in the ecosystem.** It doesn't need to win a "which registry" or "which extension" fight — it needs to be the thing teams reach for before any of those become relevant.

---

## 10. Suggested project structure (inside the monorepo)

One package; sources and outputs ship as subpath exports, not a dozen npm packages. The multi-package split from earlier drafts is deferred per §2.2: do it only if external contributors start publishing their own sources or outputs.

```
packages/
  codegen/                # webmcp-codegen — pipeline, config loader, CLI bin
    src/
      sources/            # openapi, trpc, schema (prisma, graphql in phase 2)
      outputs/            # tools, form, reactHooks, manifest
      safety/             # default rule set
      test/               # mock agent + snapshot testing (phase 2)
examples/
  nextjs-openapi/
  trpc-app/
  express-manual/
docs/                     # section of the existing site, not a second site
```

---

## 11. Phased roadmap

**Phase 0 — prove the core loop (MVP)**
- `webmcp-codegen` core + CLI
- One source: OpenAPI (shipped source)
- One output: `tools` (imperative `registerTool()` call sites)
- Basic safety layer: risk classification from HTTP verb, `destructiveHint`/`readOnlyHint` generation, PII field heuristics
- `init` / `generate` / `generate --dry-run`
- Goal: a developer with an existing OpenAPI spec goes from zero to reviewed, working WebMCP tools in under 10 minutes

**Phase 1 — real DX**
- tRPC source (the type-safety showcase feature)
- `schema` source (Standard Schema: zod/valibot/arktype)
- `reactHooks` output
- Standalone `audit` command with real CI exit codes
- `diff` / merge-marker regeneration
- Docs section + playground

**Phase 2 — safety & extensibility depth**
- Plugin SDK (`CodegenPlugin` interface, §7)
- Consent/elicitation components
- Test module: mock agent + snapshot testing
- Prisma, GraphQL sources
- First community plugins (Stripe, audit-log)

**Phase 3 — observability**
- Telemetry client
- Self-hosted dashboard, open-core
- Registry-publish plugin

**Phase 4 — frontier**
- Multi-agent identity/delegation helpers (as the spec's open questions around agent identity mature)
- Prototype "skills" (multi-tool orchestration) support ahead of spec standardization
- Cross-browser polyfill-aware outputs, once non-Chrome support materializes

---

## 12. Naming

**`@webmcp-stack/codegen`** — the package lives in the webmcp-stack npm org; the binary stays `webmcp-codegen`. The family is `webmcp-stack`, and future products take scoped functional names (`@webmcp-stack/audit`, `@webmcp-stack/telemetry`). The zero-install command is `npx @webmcp-stack/codegen`.

Namespace note: product names say what the thing does. The scope carries the family name; the suffix carries the function.

Tagline: *"Generate the tool. Review the tool. You own the tool."*

---

## 13. What "developers will love this" looks like in practice

- A dev can run one command against an API they already have and get tools that are correct, safely classified, and readable — not a black box
- Regenerating never destroys hand-written logic
- The audit pass catches the mistake before a destructive tool ships without a confirmation step, the same relief `tsc` or `eslint` give today
- The generated code looks like code the team would have written themselves, not framework boilerplate
- Adopting it for one endpoint costs an afternoon; adopting it for the whole API is a natural extension of the same workflow, not a rewrite

---

## 14. Open questions to resolve early

- How opinionated should the default safety rules be — err toward blocking more (safer, more friction) or advisory-only (more adoption, more risk)? Likely: **block on `generate`, never silently downgrade risk tier, but let `--force` override with a loud warning.**
- Should description drafting use an LLM at all, or stay purely template-based from OpenAPI `summary`/`description` fields? Leaning toward: **template-first, with an optional `--suggest-descriptions` flag that calls an LLM and always requires human acceptance before writing to disk** — consistent with the "not magic" principle from the start of this doc.
- Open-core boundaries: which parts are the sustainable "give away for free" core vs. which (hosted dashboard, registry publishing at scale) support a business, if monetization is a goal later.
