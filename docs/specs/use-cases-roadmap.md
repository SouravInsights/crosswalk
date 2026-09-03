# Beyond generate: supporting the journeys WebMCP is actually for

> Source: "WebMCP use cases" on developer.chrome.com (May 2026), saved at
> `docs/references/google-dev-webmcp-use-cases.md`. The codegen gets a developer
> from spec to tool files. This spec is about what comes after: the things the
> article tells developers to build with those tools, and how we help them do it.

---

## 1. What the article actually says

The Chrome team's use-case article walks through six worked journeys across three
verticals:

- **Purchases**: party-supply shopping across stores (`search_products`,
  `add_to_wishlist`, `refine_search`), reordering from history
  (`get_order_history`, `add_to_wishlist`, `delivery`).
- **Form filling**: a timesheet, a car search, a warranty claim, a catering
  inquiry. The first two are plain HTML forms turned into tools with four
  attributes: `toolname`, `tooldescription`, `toolparamdescription`,
  `toolautosubmit`. The article's promise: "it takes just two steps to transform
  your form into a WebMCP tool."
- **Filtering large collections**: apartment hunting (`search` +
  `apply_filters`), hotel booking (`search_hotels` + `filter_search_results`).

The details that matter for us:

1. **Tool sets are journey-shaped, not endpoint-shaped.** The warranty claim is
   `start_claim_process` → `populate_product_details` → `describe_issue` →
   `populate_contact_info`. The catering inquiry is `start_event_request` →
   `create_wedding_reception` → `add_dietary_restrictions` →
   `select_drink_package` → `submit_event_request`. Steps accumulate into one
   submission.
2. **Constraints are written into parameter text.** The timesheet's minutes
   field carries `toolparamdescription="Minutes worked on this date and task,
   with a minimum of 30 and maximum of 600."` Agents pass valid input the first
   time when the allowed values are stated in plain language.
3. **Agents are expected to say what is missing.** "If the Agent needs more
   information it can ask the user." Tool results should make that possible.
4. **A human reviews before anything commits.** Jesse's agent builds a wishlist,
   not a cart. The warranty agent can fill the form and let Charlie press
   submit. `toolautosubmit` is a choice, not a default.
5. **Results must be structured.** Dana's agent returns map pins with links and
   distances. That only works if tool output is machine-readable, not prose.
6. **The agent arrives knowing nothing about your site.** Charlie files a
   warranty claim "without a need to understand where to find a warranty claim
   form." Tools must stand alone: self-describing names, constrained inputs.

## 2. What the article confirms about decisions we already made

Worth stating, because it means this spec is a continuation, not a pivot:

- **The confirmation gate on mutations** (in the generated region, uneditable)
  is the article's review-before-commit pattern. `add_to_wishlist` and the
  warranty form's manual submit are the same idea: the agent proposes, the
  human disposes.
- **The audit pass on descriptions** is the article's core advice ("agents pick
  tools by description") turned into a CI gate.
- **The dev dashboard** is the natural home for the testing the article implies:
  replaying a journey the way an agent would run it.

## 3. The gap

What the codegen does today, measured against the article:

| Article pattern | Today | Gap |
|---|---|---|
| Journey-shaped tool sets with shared state | One tool per endpoint, no shared state | No way to express ordered steps accumulating into a submission |
| Forms as tools, "two steps" | OpenAPI is the only source | No declarative lane at all |
| Constraints in parameter text | Field descriptions pass through from the spec, constraints stay in schema JSON | Agents see `minutes_worked: number`, not "30 to 600" |
| Find + refine split | One tool per endpoint | Nothing; see follow-ups (§7) |
| Structured results | `outputSchema` passes through when the spec has one | No pressure on reads to return structured data |
| Agent asks for what's missing | Tools return success or error | No "here is what I still need" result shape |

None of these are reasons to add surface area for its own sake. Each one maps to
a concrete journey in the article, which is the evidence of need the design
doc's simplicity rule asks for.

## 4. Feature 1: constraint-rich field descriptions

**Small, pure pipeline win. Ships first.**

Today a field's description is whatever the spec author wrote, and most spec
authors write nothing. The agent sees a bare name and type, guesses, and the
call fails validation. (Validation failures per tool is exactly the metric the
analytics direction note wants to close the loop on; this is the codegen half
of that loop.)

Build:

- A shared helper, `describeConstraints(schema)`, that renders JSON Schema
  constraints as plain text: enum values, min/max, format, pattern.
  `"{ type: 'number', minimum: 30, maximum: 600 }"` → `"A number from 30 to 600."`
- A normalize step that appends this to every field description, after the
  source has produced candidates and before safety review. Sources stay dumb;
  every source benefits at once. Existing spec text is kept and the constraint
  sentence is appended, never replaced.
- Fields with no description at all get one built from name + type +
  constraints, marked so the audit pass can see it was machine-written (same
  honesty rule as `descriptionSource: "generated-template"` for tools).

Two new audit rules, both warnings:

1. **Read tool with no `outputSchema`**: "The agent gets unstructured text back
   and has to guess at the shape. Add a response schema to your spec so agents
   can use the results reliably."
2. **Tool whose input fields are all undocumented**: "No input field has a
   description. Constraints were synthesized from the schema; one line of prose
   per field in your spec is better."

Both rules are facts about the spec, not opinions about style. That keeps the
audit pass in its current register.

## 5. Feature 2: the schema source (own spec)

Now its own spec: `docs/specs/schema-source.md`. Tools are declared from the
validation schemas an app already maintains (or should), with two output lanes
over the same pipeline: `js` (the contract generated, `execute()` wired to the
app's own actions) and `form` (literal `<form>` elements annotated with the
declarative attributes).

## 6. Feature 3: journeys

**The pattern endpoint-per-tool generation cannot express.**

Two of the article's six journeys are multi-step flows where tools share state:
the warranty claim accumulates product details, an issue description, and
contact info before one submission; the catering inquiry accumulates reception
details, dietary restrictions, and a drink package. The wishlist pattern from
the shopping journeys is the same shape: stage items, review, commit. One
concept covers all three.

### 6.1 Declared, not detected

Inferring journeys from spec paths (`POST /claims`, `POST /claims/{id}/items`,
`POST /claims/{id}/submit`) is fragile magic, and the wrong inference is worse
than none. Journeys are declared in config:

```js
// codegen.config.mjs
export default defineConfig({
  sources: [openapi({ spec: "./openapi.yaml" })],
  outputs: [tools({ outDir: "./src/webmcp" })],
  journeys: [
    {
      name: "warranty-claim",
      steps: [
        { tool: "start-claim" },
        { tool: "add-product-details", fills: ["serialNumber", "purchaseDate"] },
        { tool: "describe-issue", fills: ["issueDescription"] },
        { tool: "submit-claim", submits: true },
      ],
    },
  ],
});
```

Each step names a tool the pipeline already generated (or scaffolds one when
the spec has no matching endpoint), and `fills` declares which draft fields the
step is responsible for.

### 6.2 What gets generated

One file per journey, `warranty-claim.journey.ts`, alongside the tool files:

- **A draft store**: a module-level object the step tools read and write.
  Memory-only in v1; sessionStorage persistence waits until someone asks.
- **One tool per step**, registered like any other generated tool. Each step
  merges its input into the draft and returns
  `{ saved: [...fields], missing: [...fields] }`. The `missing` list is the
  article's "the agent asks the user for more information" loop, expressed as a
  tool result the agent can act on without guessing.
- **The submit step**: its input schema is derived from the union of every
  step's `fills`. Called with an incomplete draft, it returns `isError` with the
  missing fields listed. Called with a complete draft, it runs the confirmation
  gate (it is a write, so the gate is non-negotiable, same as any mutation)
  with the accumulated draft rendered into the confirm message, then executes.

Additivity note: the catering example calls `add_dietary_restrictions` once per
restriction group. Step tools that fill list-valued fields append rather than
replace. This falls out of the draft model naturally; it just needs to be the
written-down behavior.

### 6.3 What journeys deliberately are not

- Not a routing or navigation system. The article's `start_claim_process`
  "navigates to the correct form"; whether a step should navigate the page is
  an app concern. Open question (§8), default no.
- Not a new runtime dependency. The draft store is generated code in the user's
  repo, readable and ownable like everything else.

## 7. Follow-ups, not now

Each of these is real; each waits for a named trigger instead of a ban:

- **Automatic journey detection from specs.** Fragile inference; declaration is
  one config block. Trigger: declaration proves painful in practice.
- **Auto-splitting search endpoints into find + refine tools.** The split is a
  design decision about your UI, not a mechanical transform. A future audit
  rule can suggest it when an endpoint has many optional filter params.
  Trigger: real specs showing filter bloat.
- **LLM-written descriptions.** Owned by the constraint-descriptions spec
  (under discussion): an opt-in enrichment layer over the deterministic
  baseline in §4, developer-controlled, never a hard dependency.
- **Telemetry and analytics.** Tracked in
  `docs/notes/2026-08-31-agent-analytics-direction.md`. The overlap: better
  input text (§4) reduces the validation failures analytics would report.
- **Cross-site comparison tooling.** The agent's job, not the site's. Our
  contribution is tools that stand alone well enough to be composed, which is
  §4 and the docs guide.

## 8. Open questions

- **toolautosubmit on write forms**: we default off, the article's timesheet
  defaults on. Our default is safer and consistent with the confirmation gate;
  revisit only if users report friction. (Owned by `schema-source.md`.)
- **Journey drafts**: memory-only vs sessionStorage. Memory-only v1.
- **Navigate steps**: does a journey step ever generate page navigation, or is
  that always app code? Default app code.
- **The `navigate` side effect** exists in the design doc's `SideEffect` type
  but not in code. Journeys are where it would first matter.

## 9. Naming

Every new name says what the thing is, per project convention: the `schema`
source consumes validation schemas, the `form` output annotates forms, a
`journey` is
the article's own word (critical user journey), journeys have `steps`, steps
`fills` fields of a `draft`. One concept, one name.

## 10. Phasing

Ordered by value per unit of work, each phase shippable on its own:

**Phase 1: constraint-rich descriptions + the two audit rules (§4).**
Pure pipeline work, no new subsystems, touches every tool we generate. Include
a docs page, "Design your tools around a journey", that maps the article's CUJ
method onto the codegen workflow: pick one journey, generate, review, test,
ship. Docs are the cheapest "beyond codegen" help there is.

**Phase 2: the schema source (§5, own spec).**
Both lanes: `tools` output wired to the app's own actions, `form` output
annotating literal forms. The zero-to-one gap: developers without an OpenAPI spec, or
whose raw endpoints would bypass the product, currently get nothing.

**Phase 3: journeys (§6) + journey runs in the dev dashboard.**
The dashboard gains "run a journey": pick a declared journey, execute the steps
in order, edit inputs between steps, inspect each result. This is how a
developer replays the article's scenarios (search, filter, add, submit) against
their own tools without needing an agent in the loop. Journey declarations give
the dashboard its script for free, so the two ship together. Exporting a run as
a CI test file waits for the design doc's mock-agent test module.

**Phase 4: examples, landing with the features they demonstrate.**
- `examples/shop`: search, order history, a wishlist journey, checkout.
  Mostly buildable today on the tools output; the journey lands with Phase 3.
- `examples/timesheet-form`: the form lane, mirroring the article's
  timesheet. Lands with Phase 2.
- `examples/apartments`: search + filters. Only after the first two are solid.

These slot into the design doc's existing roadmap without displacing it: the
tRPC source and `reactHooks` output stay in Phase 1 as planned, analytics stays
post-hackathon.

## 11. What success looks like

A developer with a warranty-claim flow on their site should be able to rebuild
the article's own example, start to finish, in under an hour: generate the
tools from their spec (or annotate their form), declare the journey, watch the
audit pass catch their thin descriptions, replay the whole flow in the
dashboard as if they were Charlie's agent, and ship it knowing a human confirms
the final submission. If they can do that without reading our source code, the
stack is doing its job.
