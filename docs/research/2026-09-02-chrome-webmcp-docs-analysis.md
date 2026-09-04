# Chrome's WebMCP documentation: what it asks developers to build

> Analysis of the Chrome team's WebMCP documentation series on
> developer.chrome.com, and what it means for the codegen. Written Sep 2 2026,
> extended Sep 3 after fetching the full series (the local save of the
> use-cases article, `docs/references/google-dev-webmcp-use-cases.md`, had
> lost the diagrams). This is research: the analysis and evidence. The specs
> it informed are `docs/specs/generation-pipeline.md` and
> `docs/specs/journeys.md`.

The series is four documents, not one:

1. **WebMCP use cases**: six worked journeys across three verticals.
2. **Build your user's agentic workflows**: the journey methodology (goal,
   initial state, role-play, evals, telemetry).
3. **Best practices**: how to shape individual tools.
4. **Imperative API reference**: including a React `usewebmcp` package and
   Angular Signal Forms support.


## The use-cases article

Six journeys across three verticals:

- **Purchases**: party-supply shopping across stores (`search_products`,
  `add_to_wishlist`, `refine_search`), reordering from history
  (`get_order_history`, `add_to_wishlist`, `delivery`).
- **Form filling**: a timesheet, a car search, a warranty claim, a catering
  inquiry. The first two are plain HTML forms turned into tools with four
  attributes: `toolname`, `tooldescription`, `toolparamdescription`,
  `toolautosubmit`. The article's promise: "it takes just two steps to
  transform your form into a WebMCP tool."
- **Filtering large collections**: apartment hunting (`search` +
  `apply_filters`), hotel booking (`search_hotels` +
  `filter_search_results`).

The details that matter for us:

1. **Tool sets are journey-shaped, not endpoint-shaped.** The warranty claim
   is `start_claim_process` → `populate_product_details` → `describe_issue` →
   `populate_contact_info`. The catering inquiry is `start_event_request` →
   `create_wedding_reception` → `add_dietary_restrictions` →
   `select_drink_package` → `submit_event_request`. Steps accumulate into one
   submission.
2. **Constraints are written into parameter text.** The timesheet's minutes
   field carries `toolparamdescription="Minutes worked on this date and task,
   with a minimum of 30 and maximum of 600."` Agents pass valid input the
   first time when the allowed values are stated in plain language.
3. **Agents are expected to say what is missing.** "If the Agent needs more
   information it can ask the user." Tool results should make that possible.
4. **A human reviews before anything commits.** Jesse's agent builds a
   wishlist, not a cart. The warranty agent can fill the form and let Charlie
   press submit. `toolautosubmit` is a choice, not a default.
5. **Results must be structured.** Dana's agent returns map pins with links
   and distances. That only works if tool output is machine-readable, not
   prose.
6. **The agent arrives knowing nothing about your site.** Charlie files a
   warranty claim "without a need to understand where to find a warranty
   claim form." Tools must stand alone: self-describing names, constrained
   inputs.


## The build-tools article: the journey methodology

The process Chrome recommends, in order:

1. **Define the user goal**: the outcome, the required context, the
   boundaries, and what matters most when they conflict.
2. **Define the initial state**: application state, agent context, system
   constraints.
3. **Role-play the conversation turn by turn** to discover which tools each
   step needs. The flight-booking sequence diagram lives here.
4. **Evals**, built from the documented goals, states, and transitions.
5. **Production telemetry**, feeding real failures back into evals.

Plus the error-handling rule: **fail gracefully.** A tool error should act as
a guide, never a dead end and never a raw API error.


## The best-practices article: shaping individual tools

- One function per tool; avoid overlapping tools.
- Tool count costs the agent context window.
- Naming should distinguish initiation from execution:
  `start-event-creation-process` vs `create-event`.
- Accept raw user input; do not make the model compute "11:00 to 15:00" into
  minutes. Prefer natural-language values over IDs.
- **"Validate strictly in code, loosely in schema"**, with descriptive errors
  so the model self-corrects.


## What the series confirms about decisions we already made

- **The confirmation gate on mutations** (in the generated region, uneditable)
  is the review-before-commit pattern. `add_to_wishlist` and the warranty
  form's manual submit are the same idea: the agent proposes, the human
  disposes.
- **The audit pass on descriptions** is the series' core advice ("agents pick
  tools by description") turned into a CI gate.
- **The dev dashboard** is the natural home for the testing the build-tools
  article prescribes: replaying a journey the way an agent would run it.


## The gap, measured against the series

| Series pattern | Codegen today | Where it is addressed |
|---|---|---|
| Constraints in parameter text | Field descriptions pass through from the spec, constraints stay in schema JSON | `generation-pipeline.md`, description assembly |
| Forms as tools, "two steps" | OpenAPI is the only source | `generation-pipeline.md`, schema source and form output |
| Structured results | `outputSchema` passes through when the spec has one | `generation-pipeline.md`, audit rule for reads without one |
| Journey-shaped tool sets with shared state | One tool per endpoint, no shared state | `journeys.md` |
| Agent asks for what's missing | Tools return success or error | `journeys.md`, the `{saved, missing}` result shape |
| Find + refine split | One tool per endpoint | open question in `generation-pipeline.md` |

None of these are reasons to add surface area for its own sake. Each maps to a
concrete journey in the series, which is the evidence of need the design doc's
simplicity rule asks for.


## Deliberately deferred

Each of these is real; each waits for a named trigger instead of a ban:

- **Telemetry and analytics.** Tracked in
  `docs/notes/2026-08-31-agent-analytics-direction.md`. The overlap: better
  input text (the pipeline's description assembly) reduces the validation
  failures analytics would report.
- **Cross-site comparison tooling.** The agent's job, not the site's. Our
  contribution is tools that stand alone well enough to be composed.
- **Evals.** The build-tools article's loop ends in evals built from the
  documented journey. Ours would grow out of the dashboard's journey runs
  (`journeys.md`). Trigger: journeys shipped and replayed.
