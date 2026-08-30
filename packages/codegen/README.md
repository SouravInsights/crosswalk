# webmcp-codegen

Generate safe, typed, human-reviewed [WebMCP](https://github.com/webmachinelearning/webmcp) tools from the API contracts you already have — instead of hand-writing `registerTool()` calls for every action.

> Generate the tool. Review the tool. You own the tool.

## Quick start

Zero install, zero config — the CLI detects your OpenAPI spec:

```bash
npx webmcp-codegen generate --dry-run   # preview the tools it would generate
npx webmcp-codegen generate             # write them into ./src/webmcp
```

Then implement each `execute()` (below the marker — it's yours, regeneration never touches it) and register everything at app startup:

```ts
import { registerAllTools } from "./webmcp";

await registerAllTools();
```

### Full control

When you want to choose the spec, the output directory, or safety options,
install the package and let `init` write a config file:

```bash
npm install -D webmcp-codegen
npx webmcp-codegen init
```

(The config file imports from `webmcp-codegen`, which is why the install is
needed in this mode. The generated code never depends on the package — you
own it.)

## What you get

For every operation in your spec, one file like `get-order-status.webmcp.ts`:

```ts
// ─── webmcp-codegen: generated — do not edit this region ───
export const getOrderStatusInputSchema = { /* derived from your spec */ };
export type GetOrderStatusInput = { orderId: string };
export const getOrderStatusTool = { name: "get-order-status", /* ... */ };
export async function registerGetOrderStatus(signal?: AbortSignal) { /* ... */ }
// ─── webmcp-codegen: end generated — your code below survives regeneration ───

export async function executeGetOrderStatus(input: GetOrderStatusInput) {
  // You own this. Regeneration never touches it.
}
```

- **Real files in your repo** — readable, editable, no runtime magic
- **Schemas derived from your spec**, never hand-typed twice; `$ref`s fully resolved
- **Safety classification on every tool** — read/write/destructive from the HTTP verb and naming heuristics, with `readOnlyHint`/`destructiveHint`/`idempotentHint` computed for you
- **An audit pass built into `generate`** — PII-in-response warnings, agent-instructing description linting, auth-boundary checks; errors block generation (like `npm audit`, with exit codes for CI)
- **Regeneration never clobbers your code** — contracts regenerate, your `execute()` survives; hand-edited generated regions produce a `.new` file instead of a conflict

## CLI

| Command | What it does |
|---|---|
| `webmcp-codegen init` | Detect your spec, write `codegen.config.mjs` |
| `webmcp-codegen generate` | Generate/update tool files (audit runs by default) |
| `generate --dry-run` | Preview everything, write nothing |
| `generate --watch` | Re-generate when source files change |
| `generate --force` | Write files even when the audit reports errors |
| `generate --skip-audit` | Skip the audit pass |

## Config

```js
// codegen.config.mjs
import { defineConfig } from "webmcp-codegen";
import { openapi } from "webmcp-codegen/sources";
import { js } from "webmcp-codegen/generators";

export default defineConfig({
  sources: [openapi({ spec: "./openapi.yaml" })],
  generate: [js({ outDir: "./src/webmcp" })],
  safety: {
    piiFields: ["internalId"],  // extend the built-in PII heuristics
    exclude: ["internal"],      // skip tools by name or route substring
  },
});
```

## Requirements

- Node.js ≥ 20
- To *use* the generated tools in a browser: Chrome 146+ with `#enable-webmcp-testing` (or the WebMCP polyfill)

## License

MIT
