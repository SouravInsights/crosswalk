# The tool standard

> The quality bar every generated tool meets, and the `verify` command that
> measures it locally. Depends on `docs/specs/generation-pipeline.md` (the
> fixes land inside its stages). The journeys spec
> (`docs/specs/journeys.md`) owns the one gap this release deliberately
> leaves open. Ships as 0.7.0.
>
> Status: spec, not yet implemented.

The landing page makes a promise: every generated tool meets every line of the same standard. This spec defines that standard precisely, closes the places the current output falls short of it, and adds a `verify` command so you can measure the bar before you ship.

The standard, stated as an agent experiences it:

| What an agent relies on | What that demands of a tool |
|---|---|
| Picking a tool for a human-phrased intent | Names that say what the tool does, and a surface small enough to choose from |
| Deciding whether to call it | A description that says what it does, when to use it, and what it returns |
| Calling it correctly | Every parameter described, constraints in words |
| Trusting the result | Declared annotations: read-only tools marked read-only, user-written content marked untrusted |
| The human watching alongside | A call that leaves a visible effect on the page, not a silent fetch |

Measured against a real generated surface (72 tools from a production spec), today's output falls short in four places: tool descriptions never say what comes back, eight names are not verb-first (and one collision shipped as `get-pricing-2`), the untrusted-content hint misses content nested inside arrays and objects, and withheld tools still register, doubling the selection space with dead ends. Each fix below names its finding, the change, and what you see as a user.

## The fixes

### 1. Descriptions say what comes back

The bar for a tool description: what it does, when to use it, **and what it returns**. Our describe stage writes parameter prose but passes the tool description through untouched, so the third clause is missing everywhere.

Three changes, all in the describe stage:

1. **The return-shape sentence.** When a tool has an `outputSchema` and its description says nothing about what comes back, append a synthesized sentence. List-shaped output: "Returns an array of trips." Member-shaped: "Returns the trip." Typed envelope: "Returns the stamp eligibility breakdown." Synthesized text is always marked as such, and authored text always wins (the standing describe rules).
2. **Nested fields get descriptions.** The walk today stops at top-level properties, so `photos[].capturedAt` ships with nothing. The describe walk now covers array items and nested object properties, two levels deep, with the same synthesis rules.
3. **UI labels become sentences.** Spec summaries written as Title Case labels ("Get My Unlocked Stamps") are normalized to sentence form ("Get my unlocked stamps.") and a trailing period is guaranteed. Inherited text should meet the same bar as synthesized text.

What you see: richer tool descriptions in the report and in generated files, marked `(suggested)` where they were drafted, exactly as field descriptions work today.

### 2. Names that select well

Root causes found in the algorithm itself, each with a named fix:

1. **`post: { member: "post" }` is a bug masquerading as a mapping.** `METHOD_VERBS` maps POST on a member path to the literal string "post", which is how `post-trip` and `post-destination` shipped. POST on a member path creates an association, so the verb is `add`, and the name absorbs parent context because association names are ambiguous without it: `POST /v1/bucket-list/destinations/{slug}` becomes `add-bucket-list-destination`, not `post-destination`.
2. **The action dictionary grows up.** New entries: `signup`, `signin`, `signout`, `login`, `logout`, and `all` as a scope modifier. `POST /v1/auth/signup` becomes `sign-up`. `GET /v1/pricing/all` becomes `list-all-pricing` (context spent on collision), never `get-all`.
3. **Collisions resolve by meaning, never by number.** When two operations derive the same name, the resolver spends the path segment that distinguishes them (`/v1/admin/pricing/` becomes `get-admin-pricing`). If no distinguishing segment exists, that is a report error telling you to name one of them in config. A `-2` suffix never ships again.
4. **The 30-character ceiling.** Names longer than 30 characters are re-derived spending less context (the verb and the most specific noun always survive). `list-current-user-featured-trips` (32) becomes `list-featured-trips` (the `me` scope already implies "current user"). When the ceiling fires, the report says so.
5. **`batch` is a modifier, not a verb.** Batch endpoints name as `{verb}-{noun}-batch` with the verb from the method: `update-trip-blocks-batch`, verb-first.

**Getting the fixes to existing surfaces.** Names re-derive on every run, so better rules improve a surface on the next `generate` automatically. The hazard is the opposite one: a silent rename breaks code that imported the old tool and orphans the tool's dashboard overrides (keyed by name in `.webmcp-codegen.json`). So each run records the tool names it produced; when a name changes between runs, the report prints `old → new` and the override entry is re-keyed automatically. A rename is always a report line, never a silent event.

### 3. Disabled tools do not register

Today a disabled tool still registers and answers every call with "this tool is currently disabled." Measured on a real surface, that put 36 gated tools into the agent's selection space alongside 36 live ones, and agents chose badly: they had to pick from a catalog where half the entries are dead ends, including admin and billing endpoints that should never have been visible to an agent at all.

The change:

- A tool marked disabled in the review file **is not registered**. The generated file keeps the tool's full code, with the registration block clearly fenced and commented: uncommenting one block enables it, no regeneration required.
- The report counts them: "36 generated, 36 withheld until you enable them."
- `safety.registerDisabled: true` restores the visible-but-gated behavior for anyone who wants agents to know a capability exists.
- The catalog warning threshold drops from 40 to 25 **registered** tools, and its recourse text now says why: agents choose measurably worse from large flat sets. Narrow with `safety.exclude` or by withholding tools you have not reviewed.

This is the single largest lever in the release: a surface with 36 gated tools registers 36 live ones, nothing else.

### 4. `untrustedContentHint` walks deeper

The heuristic today fires only on top-level free-text string fields. Content hidden one level down (arrays of objects, nested objects, typed envelopes) slips through, and an agent then treats user-written words as the site speaking.

The walk becomes recursive: array items and nested object properties count, same conservative predicate (a string with no enum, format, or pattern is content-carrying). No new false positives at the top level; the change is depth, not strictness.

### 5. The co-browsing affordance

Endpoint-derived tools fetch in the background and nothing on the page changes, so the human watching the browser sees nothing happen. Two changes:

1. **Generated endpoint tools gain a marked extension point** at the end of `execute`, in the owned region so edits survive regeneration: a short comment teaching the pattern (navigate, invalidate a query, dispatch an event) with one concrete example.
2. **A docs page**: "Make the effect visible," the co-browsing recipe, linked from the scaffold comment.

What this does not do: invent UI behavior for apps we do not understand. The extension point is where the app's author wires their own interface.

### 6. The `verify` command

Every gap in this spec was invisible locally: nothing in the toolchain predicts how a generated surface measures up. `verify` is the local rubric:

```
npx @webmcp-stack/codegen verify
```

- **Runs the deterministic rubric** over the tools a run would register: name length and verb-first shape, description completeness (does it say what it does, when to use it, what it returns), parameter description coverage including nested fields, annotation coverage, untrusted-content coverage, registered count, withheld count. Same check vocabulary as the standard above, so the mapping to any external rubric is obvious.
- **Prints a scorecard**, one line per check with its finding and recourse, in the report's existing style.
- **`verify --url <deployed-url>`** adds one network fetch: checks the page for a current origin trial token and an `llms.txt`, because "tools registered" and "tools live in a visitor's browser" are different facts and the difference is otherwise invisible.
- **`verify --llm`** (follows in a later release; needs a key, same rules as the LLM layer): drafts three canonical intents from your tool set ("open the document I was working on most recently" is the shape), dry-runs selection against your registered tools, and reports which intents fail. Nothing executes. This is tool selection, tested locally.
- Exit code 1 on error-level findings, 0 otherwise, so CI can gate on it. The LLM pass never changes exit codes; that rule does not bend.

## What this release does not include

Two gaps are real and remain, by design:

1. **Intent-shaped tools (journeys).** The deepest selection gap is structural: a flat endpoint surface has no tool shaped like "the document I was working on most recently." That is the journeys work, with its own spec, and it is the next thing after this release. The fixes here take selection most of the way; journeys finish it.
2. **The app's own page experience.** A sparse or hydration-dependent landing page is the app author's fix. We ship the docs guidance; we cannot ship their markup.

## The honest prediction

Measured on the reference surface, by area:

| Area | Today | After this release | Residual |
|---|---|---|---|
| Names and descriptions | 89 | ~97 | none structural |
| Annotations | 82 | ~96 | none structural |
| Tool selection | 36 | ~70 | intent-shaped tools (journeys) |
| Page parity | 62 | ~80 | the app's own page quality |

Weighted, that lands around 86 to 89. `verify` is how you know your own number instead of trusting this table, and journeys plus the app-side page work are how the rest closes. This release's promise is narrower and stronger: **every gap that is ours closes in one go, and you can measure it locally.**

## Migration

This is a **0.7.0 minor** with two behavior changes, both loud:

1. **Disabled tools stop registering.** If you relied on agents seeing gated tools, set `safety.registerDisabled: true`.
2. **New naming rules apply on the next run.** Names re-derive automatically; every rename appears in the report as `old → new`, and dashboard overrides follow the renamed tool.

Everything else is additive. No config renames, no breaking type changes.

## Implementation map

| Area | Files |
|---|---|
| Naming rules | `src/naming.ts` (METHOD_VERBS, action dictionary, collision-by-meaning, 30-char ceiling, batch modifier), `src/naming.test.ts` (the case table grows) |
| Rename reporting | `src/data-file.ts` (record produced names, re-key overrides on rename), `src/pipeline.ts`, report lines in `src/cli-output.ts` |
| Describe | `src/describe.ts` (return-shape sentence, recursive field walk, label normalization), `src/describe.test.ts` |
| Disabled means absent | `src/outputs/tools-templates.ts` (fenced registration block), `src/safety.ts` (threshold 25, recourse text, `registerDisabled` option), `src/config.ts` |
| Annotations | the `untrustedContentHint` builder (recursive walk), template tests |
| Co-browsing | `src/outputs/tools-templates.ts` (extension-point comment), new docs page |
| `verify` | new `src/verify.ts`, `src/cli.ts` subcommand, scorecard rendering in `src/cli-output.ts`, `verify.test.ts` |
| Docs and release | docs pages, changelog via changeset (minor) |

## Open questions

1. **Verify's scorecard vocabulary.** Leaning: our own check names, grouped to mirror how external rubrics group theirs, so the mapping stays visible without borrowing anyone's weights.
2. **Intent probes without a key.** Leaning: no keyword-overlap imitation of selection. Deterministic checks always run; intent probes require the LLM opt-in, because a fake probe is worse than none.
3. **`registerDisabled` default.** Leaning: absent by default, opt in deliberately. Measured selection says visibility costs more than it pays.

## Success criteria

- A fresh `generate` on the reference app, deployed and measured externally: quality ≥ 95, trust ≥ 95, selection ≥ 65, overall ≥ 85, with zero `-2` names, zero names over 30 characters, zero method-prefixed names, and zero unrated descriptions that outputSchema could have answered.
- `verify` run locally on the same repo predicts every one of those outcomes before deploy.
- The 36 withheld tools do not appear in the page's registry at all.
