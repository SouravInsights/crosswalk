# Real-world review: running 0.5 against beenthere

> The 0.5 pipeline (the commit on `feat/schema-source`) run for real against
> the beenthere web app on branch `webmcp-tools-v2`: 73 OpenAPI operations,
> one config (`openapi({ spec })` + `tools({ outDir })`). This document is the
> honest review of that run: what the tool got right, what it got wrong, and
> what it changed as a result. beenthere is the first real test, not the
> target — the findings below are universal to any OpenAPI spec, not
> beenthere-specific. Specs: `docs/specs/generation-pipeline.md`.

## What's right

**The safety posture on a real app is close to right without any tuning.** 72
tools generated (one webhook skipped with a real reason), and the
classification held: 9 auth endpoints disabled, 6 admin endpoints disabled, 2
PII-in-response warnings (`username` profiles expose `email`), 3 search-style
POSTs flagged as reads with "verify this is correct". Destructive ops (delete
trip, cancel subscription, batch delete media) all generated disabled with the
confirmation gate. Nothing dangerous shipped enabled by default.

**The set-level audit fires at the right moment.** 72 tools is more than an
agent can hold well, and the run says so once: "Agents hold a handful well; a
catalog this size degrades tool selection." The finding names the recourse
(`safety.exclude`, per-page splits, the schema source for goal-shaped
actions). It is the difference between a tool that generates and a tool that
advises.

**The generated files are clean TypeScript** that reads like a tool file, with
the marker split intact and the confirmation gate in the generated region. The
`post-trips` tool (the trip creation flow) shows the full shape: input schema
with constraints, typed `PostTripsInput`, hints metadata, the registration
wrapper, and the scaffolded `execute` calling `POST /v1/trips/` with the
signed-in user's session.

**The run is honest at scale.** 63 warnings for 72 tools is a lot, but each
one is specific, names the tool, and says what to do. Verbose mode groups them
per tool. Nothing hid.

## What's wrong

Ordered by how wrong it is, not by where it sits in the code.

**1. "Trip id." is not a description.** Every path parameter gets a
synthesized "Trip id." / "Username to fetch" sentence, and the tool's
`inputSchema` ships it as the field text. An agent reading `inputSchema` gets
"Trip id." — the one thing it already knew from the name. Worse: when the id
is a uuid (common), nothing says so; the agent has no way to know where it
comes from. The synthesized text should either carry the format ("A trip id
(uuid); comes from the get-trips list or the current page URL") or the audit
should warn harder when the only text a field has is a restated name. Right
now the "No input field has a description" warning fires, but the shipped
text is still filler, and filler reads as done. This happens on any spec with
undocumented path parameters.

**2. Spec noise leaks into contracts.** `post-system-feedback` ships `x` and
`y` coordinates with descriptions "X." and "Y." — the spec author's canvas
coordinates, meaningless to an agent. The pipeline passes spec text through
verbatim (correct rule), but a `.` description is not author intent, it's a
stub, and it should be treated as absent (synthesize or warn), not kept.
Any spec with minimal placeholder descriptions hits this.

**3. Naming is path-shaped, not intent-shaped.** `post-trips` is the tool name
for trip creation. It describes the route, not the action ("create-trip"). The
merge layer exists precisely for this — a declared schema tool named
`create-trip` beats the generated one — but nothing in the run nudges toward
it. A soft finding on names over N segments would help. Any OpenAPI spec
without operationIds produces path-shaped names.

**4. The runtime import line assumes file output.** Every generated file
imports from `./runtime.webmcp`. That is correct for the `tools` output, but
the same import shows up in files for tools that will never be executed
(they're form-annotated elsewhere) — cosmetic, but it means the output
template doesn't know its own mode.

## What this run did not exercise (honest gaps in the test)

- **The schema source**: this minimal config used only the `openapi` source.
  The schema source is for the genuinely client-side shapes (a story
  generation payload, a form submission shape) that no endpoint expresses.
  Apps with runtime validation schemas (zod, TypeBox, valibot) will exercise
  it; apps with compile-time types only (typed sdk clients) won't need it.
- **The `form` output**: this app has no literal `<form>` elements in its core
  flow. Untested here.
- **The LLM layer**: no key configured on this run, so proposals were off by
  design.

## Fixes made from this review

Tracked as commits on `feat/schema-source`; each links the line above.

1. Stub descriptions (`"X."`, `"The id."`) treated as absent: synthesize and
   warn, never pass through. (Fixes 2.)
2. Synthesized drafts carry the format when the name already says the noun
   ("Trip id. A UUID."), so the one thing an agent cannot guess ships. (Fixes
   1.)
3. New set-level audit finding when a run exceeds a sane tool count. (Fixes
   the audit gap.)
4. Standalone schema tools scaffold "wire to your app's own action" instead
   of the self-referential "calls {name}" line. (From the earlier run, kept
   for completeness.)
