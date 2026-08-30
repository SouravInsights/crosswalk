# Example: OpenAPI → WebMCP tools

The smallest possible end-to-end demo of `webmcp-codegen`: a trimmed Petstore
OpenAPI spec, one config file, and the generated output (committed so you can
read it without running anything).

## Try it

```bash
cd examples/openapi-petstore

# config already exists (created by `npx webmcp-codegen init`) — preview first:
node ../../packages/codegen/dist/cli.js generate --dry-run

# then for real:
node ../../packages/codegen/dist/cli.js generate
```

## What to look at

- `openapi.yaml` — the source of truth. Note it never mentions WebMCP.
- `codegen.config.mjs` — three lines of actual configuration.
- `src/webmcp/*.webmcp.ts` — the generated tools. Compare them:
  - `list-pets` is `safe-read` — plain and simple.
  - `delete-pet` is `destructive-confirm` — its scaffold carries the
    confirmation warning.
  - `get-pet` / `adopt-pet` show the PII warning (`owner.email`) in the
    scaffold, because the response schema includes it.
- `src/webmcp/index.ts` — `registerAllTools()`, the only import an app needs.

## The regeneration promise

Edit the `throw new Error("Not implemented…")` in any tool's `execute()` to
return something real, then change a description in `openapi.yaml` and re-run
`generate`. The description updates; your `execute()` is untouched. That split
is the point of the tool.
