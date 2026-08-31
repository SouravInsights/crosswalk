# webmcp-stack

Tools for the WebMCP ecosystem. The first product is **codegen**: generate safe, typed, human-reviewed [WebMCP](https://github.com/webmachinelearning/webmcp) tools from the API contracts you already have, instead of hand-writing `registerTool()` calls for every action.

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

## The dashboard

```bash
npx @webmcp-stack/codegen dev
```

A local control panel for your tools: browse them, edit descriptions, toggle tools on and off, and run any tool directly to check it works. Edits save to `.webmcp-codegen.json` and survive regeneration. Nothing is added to your app.

## Why codegen

- **Real files in your repo**: readable, editable, no runtime dependency on this package
- **Working implementations**: path params, query strings, and JSON bodies built from the spec; session cookies included
- **Safety classification on every tool**: read/write/destructive, with WebMCP hints computed
- **An audit pass built into `generate`**: PII-in-response warnings, agent-instructing description linting, auth-boundary checks; errors block generation (exit codes for CI)
- **Regeneration never clobbers your code**: the contract regenerates above the marker, your code below it survives; hand-edited generated regions produce a `.new` file, never a silent overwrite

## Repository layout

| Path | npm name | What it is |
|---|---|---|
| `packages/codegen` | `@webmcp-stack/codegen` | The CLI and the generation pipeline: sources (OpenAPI today), generators, the safety audit, the dev dashboard. |
| `examples/openapi-petstore` | private | Example app with tools generated from the Petstore OpenAPI spec. |
| `site/` | private | Landing page and documentation (Next.js + Fumadocs). |
| `docs/` | — | Design specs (`specs/`) and decision notes (`notes/`). |

## Development

```bash
pnpm install
pnpm build        # turbo run build
pnpm test         # turbo run test
pnpm typecheck
pnpm lint:fix
```

### Example app

```bash
pnpm --filter openapi-petstore dev
```

### Landing page & docs

```bash
pnpm --filter site dev    # Next.js dev server on :3001
```

## Links

- [npm](https://www.npmjs.com/package/@webmcp-stack/codegen)
- [WebMCP spec](https://github.com/webmachinelearning/webmcp)

## License

MIT
