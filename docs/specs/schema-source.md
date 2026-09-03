# The schema source: tools from your app's own contracts

> Today the codegen derives tools from an OpenAPI spec. This spec adds a second
> way: you point at a validation schema your app already has (or writes), and
> the codegen turns it into a tool. Grounded in a real core-flow analysis:
> `docs/research/2026-09-03-beenthere-core-flow-agent-surface.md`.

**Read this in one pass.** The problem, the one rule, how it works on a real
app, then the details. Everything after "How it works" is reference.


## The problem

The codegen only speaks OpenAPI today. That leaves out two real situations,
both seen on real apps:

**1. There is no spec.** Most React/Next.js apps have route handlers, server
actions, and forms, but no OpenAPI document. Nothing to point the codegen at.

**2. There is a spec, but the endpoint is the wrong tool.** beenthere has a
great spec (73 operations). But an agent calling the raw `create-trip`
endpoint tool would bypass the app: no cover-photo upload, no cache refresh,
no navigation into the editor. The endpoint succeeds; the product behavior
doesn't. Chrome's own docs say tools should use the app's existing
capabilities, not replace them.

Both situations need the same thing: a way to say "an agent should be able to
do *this*, in my product's own terms," backed by a contract you control.


## The one rule: contracts, not codebases

We will not scan your source files to guess what your app does. Markup and
fetch calls are the least stable things in a repo, and every heuristic miss
becomes a silently wrong tool.

So every source consumes a **contract you already maintain**, and nothing
else. For React/Next.js apps, that contract is the **validation schema**: the
zod (or valibot, or arktype) object your form or action already validates
against. It has everything a tool needs: field names, types, what's required,
min/max, enum values, and `.describe()` text. And because it's the object your
app validates against at runtime, it is the truth itself, not a parallel
description of it.

That makes the ask to a developer identical in spirit to the OpenAPI one, just
smaller:

> To make something a tool, it needs a schema, and that schema is **your own
> code**. Most apps validate by hand (`if (!title.trim()) ...`) scattered
> across components; one shared schema replaces that whether or not WebMCP is
> involved.

**Scope, so it can't be misread:** you write the schema, in your codebase, for
your own reasons. We only read it and produce tools. We never generate your
app's validation logic and never will.


## How it works (on beenthere's real flow)

Three steps. The running example is beenthere's create-trip flow.

**Step 1: you write the schema (once, for your app).** This is the adoption
step and it's app code, not ours:

```ts
// packages/shared/src/schemas/trip.ts
import { z } from "zod";

export const CreateTripInput = z.object({
  title: z.string().min(1).max(40)
    .describe("Name of the trip, e.g. 'Kyoto in autumn'. 40 characters max."),
  startDate: z.string().optional()
    .describe("When the trip happened, e.g. '2026-03-14'. Optional."),
  locationObject: z.record(z.string(), z.unknown()).optional()
    .describe("Resolved place object. Always get this from the search-places tool; never invent it."),
});
```

**Step 2: you point the codegen at it.** One config entry per tool, explicit:

```js
// apps/web/codegen.config.mjs
import { defineConfig } from "@webmcp-stack/codegen";
import { schema } from "@webmcp-stack/codegen/sources";
import { tools } from "@webmcp-stack/codegen/outputs";
import { CreateTripInput, SearchPlacesInput } from "@beenthere/shared/schemas";

export default defineConfig({
  sources: [
    schema({
      tools: [
        { name: "create-trip", schema: CreateTripInput },
        { name: "search-places", schema: SearchPlacesInput },
      ],
    }),
  ],
  outputs: [tools({ outDir: "./src/webmcp" })],
});
```

**Step 3: you run `generate`.** You get a `create-trip.webmcp.ts` whose
contract (name, description, input schema, safety) is generated and whose
`execute()` you wire to your app's own action layer, the same calls your
Create button already makes:

```ts
export async function executeCreateTrip(input: CreateTripInput) {
  // Same sequence the Create button runs: create, then land the user in the editor.
  const trip = await apiClient.createTrip({ id: crypto.randomUUID(), ...input });
  router.push(`/me/${trip.id}`);
  return toolResult(`Trip "${input.title}" created and opened in the editor.`);
}
```

The codegen owns the contract, you own the behavior, and regeneration never
touches your `execute()` (the marker split already guarantees this).

**What the agent experience becomes:** "Create a trip for my Kyoto week" →
agent calls `search-places("Kyoto")`, then `create-trip`, you confirm (it's a
write), and the app does what it always does, ending with the editor open.


## What the codegen does under the hood

- **Imports the schema as a value.** No parsing, no AST. The config is
  executable JS, so the schema object arrives directly and we convert it to
  JSON Schema at generate time.
- **Treats it exactly like an OpenAPI-derived tool.** Same safety review, same
  audit pass, same confirmation gate for writes. Nothing is special-cased.
- **Derives descriptions** from `.describe()` where present, from constraint
  synthesis where absent (owned by the description-layer spec).
- **Catches inputs agents can't fill.** `create-trip` needs a `locationObject`
  that only `search-places` can produce. Declare one without the other and you
  get a warning, not a broken tool:

  ```
    ⚠ create-trip   field "locationObject" needs search-places; declare it or document the source
  ```

- **Stays out of your codebase.** The only file written is the `.webmcp.ts`
  tool. Your schema, your component, your `execute()` wiring: all yours.


## The form lane (when a literal form exists)

Some surfaces really are `<form>` elements. For those, the `form` output adds
the four declarative attributes to the component in place, instead of
generating a `.webmcp.ts` file:

```diff
  <form action="/api/timesheets" method="post"
+   toolname="add-to-timesheet"
+   tooldescription="Report billing task and time to add to the timesheet.">
    <input name="minutes_worked" type="number" min="30" max="600"
+     toolparamdescription="Minutes worked on this task. A number from 30 to 600."
    />
```

The payoff is unique to this lane: **the human is already in the loop.** The
agent fills the visible form, you review it, you press submit.

You opt in per tool (`form: "./src/components/ContactForm.tsx"` on the entry,
`form` in `generate`). The rules it follows, validated against a real React
form with a custom `Input`, a controlled field, and a button group:

- Matches fields by `name` or `id`; adds a missing `name` and reports it
  (the declarative API addresses fields by name).
- Custom wrapper components (a design-system `<Input>`) get the attributes;
  whether they forward to the DOM is your component's contract, verified in
  the dashboard test run, not by silent failure.
- Non-form controls (button groups, custom pickers) get a report line naming
  the fix, never guessed attributes.
- No `<form>` at the path you pointed to is a clear error, not a guess.
- `toolautosubmit` is added to read forms (search/filter), withheld from write
  forms so a human always confirms a mutation. Override per tool with
  `autosubmit: true`.
- Regeneration only fills attributes that are absent. Your hand-edits win.


## The LLM layer (advisory, always optional)

Everything above works with no model, no key, no network: same input, same
output, same exit codes, in CI or offline. That deterministic core is not
negotiable, because the audit pass is only trustworthy if it's reproducible.

But some judgments are semantic, and rules can't make them. For those there's
an optional LLM layer with one hard rule: **the model proposes, you dispose.**
Nothing it produces reaches a file or a classification without your review.

What it adds here:

1. **Description drafting** for fields/tools with no `.describe()` (mechanism
   owned by the description-layer spec).
2. **Relationship suggestions** beyond the declared-structure check ("this
   looks producible by `search-places`, link them?"). Suggestions, not
   findings.
3. **Semantic description review** ("the description says 'fetch a trip' but
   the schema writes one").
4. **Tool-worthiness proposals** (`generate --suggest`): pointed at a schema
   module you name, it proposes what's worth declaring. Never auto-declared.

What it never does: classify risk, write files, block a run, or affect the
audit. No key configured means it's off and the run is exactly the
deterministic one. Suggestions render apart from findings in the report.


## Reference

### The source family

| Source | Contract consumed | Status |
|---|---|---|
| `openapi` | OpenAPI 3.x spec | shipped |
| `schema` | Standard Schema modules | this spec |
| `manual` | a small hand-written tools file | escape hatch |
| `trpc` | the router's own schemas | planned |

New sources are added only when a contract type proves common.

### Follow-ups, not now

- **Label text as description input** for annotated forms. Markup association
  is the inference slope this spec avoids. Trigger: schema-only descriptions
  prove insufficient.
- **A real markup parser** replacing the small tag scanner used for the form
  lane. The scanner fails loud, never guesses. Trigger: real codebases defeat it.
- **valibot and arktype converters.** Trigger: asked for.
- **Editor-store-aware helpers** for apps where agent actions should go
  through a client store (beenthere's autosaving editor). Trigger: a second
  app with the same shape.

### Open questions

- **Loading TypeScript schemas from the CLI**: Node native type stripping (no
  dependency, needs recent Node; floor is 20), a tiny loader like jiti (works
  everywhere, ends the zero-dependency streak), or requiring plain JS modules
  (friction). Leaning native stripping with the loader as fallback.
- **zod v3 vs v4**: v4 converts to JSON Schema natively; v3 needs
  `zod-to-json-schema`. Real monorepos mix both (beenthere: v3 in
  `packages/shared`, v4 in `apps/web`). Detect per schema from the `~standard`
  marker.
- **Per-field description overrides**: tool-level overrides live in
  `.webmcp-codegen.json`; field-level would extend that shape. Waits for the
  description-layer spec.

### What success looks like

A developer with a Next.js app (no spec, or one whose raw endpoints would
bypass the product) declares three schemas, runs `generate`, and gets
contract-correct tools wired to the app's own actions, with the audit catching
the input no agent could have produced. Where a literal form exists, its
attributes are written in place and a human keeps the final click. Nobody
parsed anybody's codebase.
