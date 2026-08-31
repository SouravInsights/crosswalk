# @webmcp-stack/codegen

Generate safe, typed, human-reviewed [WebMCP](https://github.com/webmachinelearning/webmcp) tools from the API contracts you already have, instead of hand-writing `registerTool()` calls for every action. Part of [webmcp-stack](https://github.com/SouravInsights/webmcp-stack).

> Your spec already knows your tools. One command writes them, wires them into your app, and gets out of the way.

## Quick start

Zero install, zero config:

```bash
npx @webmcp-stack/codegen generate
```

One run finds your OpenAPI spec (monorepos included), finds the package that is your web app, and:

- **generates working tools** in `src/webmcp/`: reads call your API out of the box, mutations are generated disabled (working code, one uncomment away)
- **filters what shouldn't be a tool**: webhooks skipped, auth and admin endpoints flagged and disabled
- **wires registration into your app** (two additive lines for Next.js and Vite, reported with undo instructions)

Preview first, write nothing:

```bash
npx @webmcp-stack/codegen generate --dry-run
```

Then start your app, open it in Chrome with `#enable-webmcp-testing`, and ask the agent to use one of your tools.

## The dashboard

```bash
npx @webmcp-stack/codegen dev
```

A local control panel for your tools: browse them, edit descriptions, toggle tools on and off, and run any tool directly to check it works. Edits save to `.webmcp-codegen.json` and survive regeneration. Nothing is added to your app.

## What a generated tool looks like

One file per endpoint, like `delete-pet.webmcp.ts`:

```ts
// ─── webmcp-codegen: generated. Do not edit this region. ───
export const deletePetInputSchema = { /* derived from your spec */ };
export type DeletePetInput = { id: string };
export async function registerDeletePet(signal?: AbortSignal) {
  // Registers the tool; mutations ask the user to confirm, always.
}
// ─── webmcp-codegen: end generated. Your code below survives regeneration. ───

export async function executeDeletePet(input: DeletePetInput) {
  // This tool starts disabled: it changes things. To enable it, delete the
  // line below and uncomment the code.
  return toolDisabled("delete-pet.webmcp.ts");

  // const data = await callApi(`/pets/${input.id}`, { method: "DELETE" });
  // return toolResult(data);
}
```

- **Real files in your repo**: readable, editable, no runtime dependency on this package
- **Working implementations**: path params, query strings, and JSON bodies built from the spec; session cookies included
- **Safety classification on every tool**: read/write/destructive, with WebMCP hints computed
- **An audit pass built into `generate`**: PII-in-response warnings, agent-instructing description linting, auth-boundary checks; errors block generation (exit codes for CI)
- **Regeneration never clobbers your code**: the contract regenerates above the marker, your code below it survives; hand-edited generated regions produce a `.new` file, never a silent overwrite

## CLI

| Command | What it does |
|---|---|
| `webmcp-codegen generate` | Generate/update tools, wire registration (audit runs by default) |
| `generate --dry-run` | Preview everything, write nothing |
| `generate --watch` | Re-generate when source files change |
| `generate --force` | Write files even when the audit reports errors |
| `generate --spec PATH` / `--out DIR` | Overrides without a config file |
| `webmcp-codegen dev` | Open the tools dashboard (`--port N` to change the port) |
| `webmcp-codegen init` | Write `codegen.config.mjs` for full control (needs the package installed) |

## Config

Structure lives in `codegen.config.mjs` (code); remembered choices and per-tool
overrides live in `.webmcp-codegen.json` (data, safe with npx, commit it).

```js
// codegen.config.mjs
import { defineConfig } from "@webmcp-stack/codegen";
import { openapi } from "@webmcp-stack/codegen/sources";
import { js } from "@webmcp-stack/codegen/generators";

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
