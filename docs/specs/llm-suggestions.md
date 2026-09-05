# LLM suggestions: persist, review, apply

> Where `generate --llm` suggestions live after the run ends, and where you
> accept or reject them. Builds on the describe layers in
> `docs/specs/generation-pipeline.md` and the dev dashboard
> (`npx @webmcp-stack/codegen dev`). Ships as 0.9.0.
>
> Status: spec, not yet implemented.

Today `generate --llm` prints its suggestions as `◦` lines and forgets them. The code says this is deliberate ("the acceptance surface is a deliberate follow-up", `src/llm.ts`); this spec is that follow-up. It covers four holes in the CLI flow, one prompt bug found in a real run, and the dashboard repairs that have to land first, because the new UI builds on that pane.

Evidence throughout comes from a real run against a production spec: `docs/temp/latest-llm-output.txt`, 93 suggestion lines across 12 tools, ending early on a rate limit.

## The problems

### 1. The run ends with no next step

After the `◦` lines the CLI prints the summary and exits. Nothing says what the suggestions are for, where they went, or what to do with them. They also print before the summary table, so on a real spec they scroll away behind it.

### 2. There is no way to apply a suggestion

Not all at once, not one by one. The only path today is retyping text out of the terminal into `.webmcp-codegen.json` by hand. Two details make even a future apply path harder than it should be:

- A suggestion's text exists only inside its human-readable `message` string (`create-trip.id: draft: "Unique identifier for the trip."`). Applying means re-parsing prose. `LlmSuggestion` needs to carry the proposed text as data.
- The model proposes nested fields (`theme.background.type`, `photos[].capturedAt`), but field overrides are flat top-level keys. Applied naively, every nested suggestion lands in the typo report and does nothing.

### 3. Suggestions do not persist

`LlmSuggestion`s live in memory for the length of one process, and the in-run answer cache is per-process by design. So:

- Closing the terminal loses the suggestions. There is nothing to come back to.
- Re-running `generate --llm` asks every question again and bills every answer again.
- A rate limit makes this expensive, not just annoying. The real run ended with `LLM describe failed (HTTP 429)`: the describe loop stops at the first failure (by design; hammering a broken endpoint helps nobody), every tool after that point got nothing, and a re-run starts from zero.

### 4. The terminal is the wrong surface for this work

Generation is batch work; the terminal is fine for that. Review is per-item judgment: read the current text, read the suggestion, keep one, drop one, edit a third before taking it. A 93-line scrolling list supports none of that. The dashboard is the right surface, and it is already the editing surface: accepting a suggestion is exactly "save an override", which the dashboard does today. Generation should also be available per tool there (one button, one call), because "improve this one tool" is the common case and a full `--llm` run is the expensive way to get it. So: generation lives in both places (CLI for batch, dashboard per tool), review lives only in the dashboard.

### 5. The describe prompt sends nested fields to the model as `undefined`

`proposeDescriptions` looks up each synthesized field in the top-level `inputSchema.properties`. Nested paths (`theme.background`) are never top-level keys, so the lookup misses and the prompt literally contains `"theme.background": undefined`. The model then invents text from the field name alone, without the enum, constraints, or shape it is describing. This is why parts of the real output read as guesses.

### 6. The dashboard detail pane repeats itself, and one repetition is a real bug

- **Every field renders twice.** The Field descriptions section and the Test section both enumerate all fields with the same `param` markup and the same input styling. The page looks like a duplicated form, because visually it is one.
- **The duplication leaks into behavior.** The run handler collects values with `querySelectorAll("[data-field]")`, which matches the description editors too. Any field left empty in the Test form sends its description text as the input value. Running `get-trip` with an empty `tripId` calls the API with `tripId: "The unique identifier for the trip."`.
- **Descriptions render as pre-filled input values.** A wall of inputs that already contain text reads as a form to fill in, not text to review. Field text should present as text, with an edit affordance.
- **The header repeats itself.** The provenance line re-states the verb and path already shown on the route line ("merged: createTrip + POST /v1/trips/{tripId}" directly under "POST /v1/trips/{tripId}"). Enabled state appears three times: the sidebar `off` badge, a header badge, and the Status toggle.
- **The Test section renders for tools with nothing to call.** Schema-only tools and form-output tools get a Run this tool form whose only possible outcome is an error.
- Minor: `.search-wrap` is declared twice in the stylesheet; `⌘S` saves the description but not field edits.

## What the real output says about quality

Reviewing `docs/temp/latest-llm-output.txt` line by line:

**Good.** The tool descriptions are the strongest output: imperative, one sentence, most state what comes back ("Create a new trip and return the trip details."). The model also handled nested objects and arrays when asked (`theme.background.type`, `photos[].capturedAt`), which the deterministic layers struggle to write well.

**Bad, with root causes:**

- Inconsistent voice across fields: "Enter the username…" next to "The unique identifier…" next to the lazy "Trip id.", all in the real file. The prompt never pins a voice.
- Type-restating filler: "Boolean indicating whether to show indicators…", "Object containing location details…", "An array of story groups…". The type is in the schema the agent already has; the words should carry meaning.
- Noise constraints: "; must include required fields." says nothing and risks contradicting the schema later.
- Nested drafts read as name-guesses, because they are: problem 5 sent those fields to the model as `undefined`.

Both root causes are fixable in code and prompt, in this release.

## The design

One sentence: suggestions become a persisted staging area between the model and your overrides, and the dashboard is where you dispose of them.

Accepting a suggestion writes a normal override into `.webmcp-codegen.json` through the exact path dashboard edits already use. Overrides survive regeneration and always win, so an accepted suggestion is permanent. Nothing else about the trust model changes: the model proposes, the developer disposes, nothing auto-applies, exit codes never move, plain `generate` never makes a network call.

### 1. A suggestions file: `.webmcp-codegen.suggestions.json`

A new plain-data file at the project root, next to `.webmcp-codegen.json`. Separate from it on purpose: the data file is committed choices, this file is transient working state. The CLI recommends gitignoring it when the file first appears; committing it is harmless.

Each entry:

```json
{
  "task": "describe",
  "tool": "create-trip",
  "field": "theme.background",
  "value": "Background settings for the theme.",
  "questionHash": "sha256 of the exact question asked",
  "status": "pending",
  "createdAt": "2026-09-05T10:41:35.000Z"
}
```

- `questionHash` keys the question exactly the way the in-run cache does (task + system prompt + question text, and the question names the tool and its current text). It is what makes re-runs cheap: a later run recomputes its questions first and never re-asks one with a pending or rejected entry. A schema edit changes the question, which changes the hash, which asks again.
- `status` is `pending` or `rejected`. Rejected entries are kept, so "no" is remembered and never re-billed. Accepted entries are deleted at accept time, because the override takes over from there: the field stops being synthesized, so the question stops existing.
- `value` is the proposed text as data. `LlmSuggestion` gains a `value` field so no consumer ever re-parses `message`. The report line for a replayed suggestion re-renders from the structured fields.

### 2. `generate --llm` saves and points

- Suggestions persist to the suggestions file at the end of the run, merged by question hash. Existing decisions (pending, rejected) survive.
- Re-running reuses the file: pending suggestions replay into the report without a new call, rejected questions are skipped silently. A 429 stops costing anything: run again later and only the missing questions are asked.
- The last line of the run says where to go:

  ```
  12 suggestions saved to .webmcp-codegen.suggestions.json (9 new, 3 kept). Review them: npx @webmcp-stack/codegen dev
  ```

- No apply flag comes to the CLI. Applying is review, and review lives in the dashboard (the follow-ups section covers the terminal-only case).
- The CLI docs page (`site/content/docs/cli.mdx`) updates to describe this lifecycle.

### 3. The dashboard becomes the review surface

Server (`src/dev/server.ts`), all localhost-only like the existing endpoints:

- `GET /api/state` includes each tool's pending suggestions from the suggestions file.
- `POST /api/suggestions/generate` with `{ name }` runs the describe task for that one tool (one provider call), or for every tool that needs one when no name is given. Writes results to the suggestions file.
- `POST /api/suggestions/accept` with `{ name, field? }` writes the override through the same code path as `/api/override` and deletes the entry.
- `POST /api/suggestions/reject` with `{ name, field? }` marks the entry rejected.

Provider resolution is non-interactive here (no terminal prompts inside a server): config key, then env key, then the hosted tier when the developer clicks it in the UI. A missing key is a UI state naming the exact env var to set, never an error.

UI (`src/dev/ui.ts`):

- **Per tool:** a Suggestions section above Description. It holds a "Suggest improvements" button (one call, with a spinner) and the tool's pending suggestions as rows: field path, current text, suggested text, Accept / Reject per row, and Accept all for the tool. Accepting re-renders from state, so the new text immediately becomes the Description and Fields content below.
- **Across tools:** a Suggestions row at the top of the sidebar with the total pending count, opening a queue view of every pending suggestion grouped by tool, with the same rows and a global Accept all behind a confirm that names the count. This is the answer to "how do I apply them all" after a batch `--llm` run. Tools with pending suggestions get a small dot in the list.
- Suggestions from the other tasks (`relationship`, `semantic-review`) appear in the queue as notes with Dismiss only; there is no override to write for them.
- The embedded landing demo (which mounts this same UI without a server) hides every suggestion control.

### 4. Nested field paths work in overrides

Override application learns the paths the describe walk already uses (`theme.background`, `photos[].capturedAt`): walk `properties` and `items` the same way `describeCandidateInputs` does, and apply at the leaf. The typo check recognizes these paths instead of flagging them. This is what makes accepting `theme.background.type` work, and hand-written nested overrides start working too.

### 5. The describe prompt stops freelancing

- `proposeDescriptions` resolves each synthesized path through the schema tree and sends the real subschema. `undefined` never reaches the prompt.
- The describe prompt gains rules in the same flat style as today: never restate the type ("boolean", "object", "array of"), never open with "Enter", "Provide", or "Specify", one sentence per field, constraints only when they come from the given schema.

### 6. Dashboard repairs

Each maps to a defect in problem 6:

- Field descriptions become text-first rows: field name, the text, an `override` badge when the text is the developer's, and a per-row Edit that swaps in an input with Save. The wall of pre-filled inputs goes away.
- Run inputs get their own attribute (`data-param`) and the run handler reads only those. Description text can never reach a request payload again.
- The provenance line names the source only ("schema: createTrip", "merged: schema createTrip + route"); the route line owns the verb and path. The header's "starts disabled" badge goes away (the toggle says it); "withheld from agents" stays, because withholding is a safety decision, not a toggle position.
- The Test section renders only for tools with a route. Schema-only and form-output tools get a one-line note instead of a form that can only fail.
- The duplicate `.search-wrap` rule is removed, and `⌘S` inside a field edit saves that field.

Tests follow the standing rule (lint, typecheck, test before commit): path resolution and the suggestions-file merge/dedupe logic get unit tests, and the new endpoints get server tests like the existing ones.

## What you see

Batch flow: `generate --llm` ends with the saved-and-pointing line. `npx @webmcp-stack/codegen dev` opens with a Suggestions count in the sidebar; the queue shows every suggestion grouped by tool; you accept three, reject one, Accept all on `create-trip`. Each accept is an override, visible in `.webmcp-codegen.json` and live in the pane. The next `generate` writes them into the tools.

Single-tool flow: open a tool, click Suggest improvements, read the rows, accept the two that are good. One provider call, no terminal.

Interrupted flow: a 429 ends a batch run early; the suggestions that arrived are on disk; a later re-run asks only what is missing.

## Follow-ups, not now

- `generate --suggest` proposals (which schemas to declare) stay print-only. Trigger: the first person asks to declare a schema from the dashboard.
- Terminal-side apply (an interactive picker after `--llm`). Trigger: a user without a browser workflow asks for it.
- A real apply path for `relationship` suggestions needs a producer-link concept that does not exist yet. Trigger: that concept lands.
- Honoring `Retry-After` on hosted-tier 429s. Trigger: hosted usage data shows how common they are.
