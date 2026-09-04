---
"@webmcp-stack/codegen": minor
---

**Breaking:** in `codegen.config.mjs`, `generate:` is now `outputs:`, `js()` is now `tools()`, and the import subpath is now `@webmcp-stack/codegen/outputs`. An old config fails with the exact fix printed. Generated files and `.webmcp-codegen.json` carry over unchanged.

New:

- Declare tools straight from your zod schemas, no OpenAPI spec required: `schema({ tools: [{ name: "create-trip", schema: CreateTripInput }] })`.
- Add `operation: "createTrip"` to fuse a schema entry with its OpenAPI operation: your schema owns the input contract and descriptions, the spec owns the endpoint mechanics, one tool comes out.
- Field text is now assembled, not passed through: your `.describe()` stays verbatim, constraints render as prose ("A number from 30 to 600."), undocumented fields get a draft the audit flags as machine-written.
- New `form` output: annotate a literal `<form>` with WebMCP's declarative attributes instead of generating a file. The agent fills the visible form; a human submits writes.
- New audit rules: a merge target that doesn't exist is an error; a field pointing at an undeclared producer tool warns; a read with no output schema warns; a tool whose fields are all machine-drafted warns.
- Opt-in LLM layer (`llm` in config): drafts and suggestions printed as `◦` proposal lines. Never applied to files, never blocks a run, off without a key.
- `generate --suggest ./src/schemas.ts` proposes which exported schemas are worth declaring. Nothing is auto-declared.
- `init` detects zod/valibot/arktype, and scaffolds the schema source when no OpenAPI spec exists.
