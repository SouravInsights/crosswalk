# webmcp-codegen

Generate safe, typed, human-reviewed [WebMCP](https://github.com/webmachinelearning/webmcp) tools from the API contracts you already have — OpenAPI specs, tRPC routers, Zod schemas — instead of hand-writing `registerTool()` calls for every action.

> Generate the tool. Review the tool. You own the tool.

**Status: under active development.** This package is published as a placeholder to claim the name; the CLI and adapters are being built in the open. Design document: [`notes/webmcp-codegen-design.md`](https://github.com/SouravInsights/groundstate/blob/main/notes/webmcp-codegen-design.md).

## What it will do

```bash
npx webmcp-codegen init       # detect your API layer, scaffold config
npx webmcp-codegen generate   # generate reviewed, safety-classified tool files
```

- Real TypeScript files in your repo — readable, editable, no runtime magic
- Schemas derived from your existing types, never hand-typed twice
- Automatic risk classification (`readOnlyHint`, `destructiveHint`), PII field detection, and an audit pass built for CI
- Regeneration that never clobbers your hand-written logic

## License

MIT
