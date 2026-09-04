---
"@webmcp-stack/codegen": minor
---

**Breaking:** In `codegen.config.mjs`, `generate:` is now `outputs:`, `js()` is now `tools()`, and imports come from `@webmcp-stack/codegen/outputs` (not `/generators`). An old config fails with the exact fix printed.

**What's new:**

- **No OpenAPI spec? Use your validation schemas.** If your app validates with zod, valibot, arktype, or TypeBox, you can declare agent-facing actions directly from those schemas:

  ```js
  import { schema } from "@webmcp-stack/codegen/sources";
  import { CreateTripInput } from "./src/schemas";

  export default defineConfig({
    sources: [
      schema({ tools: [{ name: "create-trip", schema: CreateTripInput }] })
    ],
  });
  ```

- **Have both a spec and schemas? Merge them.** Add `operation: "createTrip"` to a schema entry and it fuses with the OpenAPI operation: your schema's descriptions and constraints, the endpoint's URL and method. One tool, best of both.

- **Field descriptions are now useful.** Your `.describe()` text stays as-is. Constraints like `min(30)` become "A number from 30 to 600." Fields with no description get a draft the audit flags, so you know what to fix.

- **Working with a real `<form>`?** The new `form` output annotates it with WebMCP's attributes instead of generating a file. The agent fills the form; a human clicks submit on writes.

- **The audit catches more.** A merge target that doesn't exist is an error. A field pointing at an undeclared tool warns. A read with no output schema warns. A tool with all machine-drafted fields warns.

- **Optional LLM help.** Add `llm: { apiKey: "..." }` to your config and the CLI can draft descriptions and suggest tool relationships. It prints proposals (marked `◦`), never writes them, and works without a key (just skipped).

- **`generate --suggest ./src/schemas.ts`** asks the LLM which schemas in that file are worth declaring as tools. It proposes; you decide.

- **The CLI explains itself.** Verbose mode shows each step ("Reading sources", "Found 73 candidates", "Disabled 2 auth endpoints"). Tables replace walls of text. Colors auto-disable in CI logs.

- **`init` detects your setup.** Finds zod/valibot/arktype/TypeBox in `package.json` and scaffolds accordingly. No OpenAPI spec? It starts you with schemas instead of a placeholder.

Your generated files and `.webmcp-codegen.json` keep working unchanged.
