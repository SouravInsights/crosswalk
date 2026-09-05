---
"@webmcp-stack/codegen": minor
---

**Generated tools now meet the full authoring standard.** This release closes every measured quality gap in generated output and adds `verify`, a command that measures your tools locally before you ship.

**Unreviewed tools no longer register.** Writes, destructive, auth, and admin tools are generated withheld: the working code is there, commented, but the tool is not registered, so agents never see or pick it. Enable a tool in the dashboard or by uncommenting its registration fence. Set `safety.registerDisabled: true` to keep the old visible-but-gated behavior. On a 72-endpoint spec this halves the surface agents choose from.

**Better names.** POST on a member path names the association (`add-bucket-list-destination`, not `post-destination`). Batch endpoints put the verb first (`update-trip-blocks-batch`, not `batch-trip-blocks`). `signup` becomes `sign-up`. `GET /pricing/all` becomes `list-all-pricing`, not `get-all`. Collisions spend real context (`get-admin-pricing`) instead of numbering (`get-pricing-2`); a collision that truly cannot be resolved is a report error, never a silent suffix. Names stay within Chrome's 30-character guidance. Renames between runs are reported, and your dashboard edits follow the renamed tool automatically.

**Descriptions say what a tool returns.** "List all trips for the authenticated user" becomes "List all trips for the authenticated user. Returns an array of trips." Title Case spec labels become sentences ("Get My Unlocked Stamps" becomes "Get my unlocked stamps."). Nested input fields (array items, object properties) get the same synthesized descriptions top-level fields already did.

**Annotations see through unions.** A nullable string (`anyOf: [string, null]`, how validators spell optional text) now correctly marks a tool's output as potentially user-written content.

**Generated tools carry the co-browsing pattern.** Each endpoint tool's `execute()` ends with a marked spot to update the UI, so the human watching the page sees what the agent did. New docs page: "Make the effect visible."

**New command: `verify`.** Runs the pipeline without writing and reports a scorecard: name shape, description coverage, field text, annotations, surface size. Exits 1 on error-level findings so CI can gate on it. `verify --url <deployed-url>` also checks the page serves an origin trial token, because "generated" and "live in a visitor's browser" are different facts.

**Fixed:** the CLI now applies dashboard edits (`.webmcp-codegen.json` overrides) on every `generate` run; previously only the dashboard itself read them, so a CLI regeneration silently dropped your edits. Tool files are matched to tools by endpoint identity, not filename: a rename between runs carries your `execute()` to the new filename instead of a different tool inheriting it, files whose endpoints are gone are reported as orphans, and nothing is ever deleted silently. The registration wiring recreates a missing `register.tsx` instead of trusting a stale layout that mounts it.
