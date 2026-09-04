---
"@webmcp-stack/codegen": minor
---

**Breaking:** In `codegen.config.mjs`, `generate:` is now `outputs:`, `js()` is now `tools()`, and imports come from `@webmcp-stack/codegen/outputs` (not `/generators`). An old config fails with the exact fix printed.

**What's new:**

- **Tool names now read as intent, not routing.** Specs without `operationId`s used to produce names like `post-trips-trip-id-story-generate`. Now the same route produces `generate-story`: the generator recognizes action endpoints and plain REST, drops version prefixes and path params, understands `me` and lookup keys (`GET /trips/{username}/{slug}` → `get-trip-by-slug`), and resolves collisions by adding parent context, with every rename shown in the report.

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

- **Override an OpenAPI tool with your own schema.** If you have a zod schema that's better than what the OpenAPI spec describes, declare it with `operation: "createTrip"` and the tool uses your schema instead:

  ```js
  schema({
    tools: [
      {
        name: "create-trip",
        schema: CreateTripInput,  // your zod schema with .describe() text
        operation: "createTrip",  // the OpenAPI operation this replaces
      },
    ],
  })
  ```

  The tool gets your descriptions and constraints, but still calls the right endpoint.

- **Field descriptions are now useful.** Your `.describe()` text stays as-is. Constraints like `min(30)` become "A number from 30 to 600." Fields with no description get a draft the audit flags, so you know what to fix.

- **Working with a real `<form>`?** The new `form` output annotates it with WebMCP's attributes instead of generating a file. The agent fills the form; a human clicks submit on writes.

- **The audit catches mistakes.** If you reference an OpenAPI operation that doesn't exist, that's an error. If a field needs another tool you didn't declare, that's a warning. If a read has no output schema, that's a warning. If all a tool's descriptions are machine-generated, that's a warning.

- **Optional LLM help.** Add `llm: { apiKey: "..." }` to your config and the CLI can draft descriptions and suggest which schemas might work well as tools. It prints proposals (marked `◦`), never writes them, and works without a key (just skipped).

- **`generate --suggest ./src/schemas.ts`** asks the LLM which schemas in that file might be worth turning into tools. It proposes; you decide.

- **The CLI explains itself.** Verbose mode shows each step ("Reading sources", "Found 73 candidates", "Disabled 2 auth endpoints"). Tables replace walls of text. Colors auto-disable in CI logs.

- **`init` detects your setup.** Finds zod/valibot/arktype/TypeBox in `package.json` and scaffolds accordingly. No OpenAPI spec? It starts you with schemas instead of a placeholder.

Your generated files and `.webmcp-codegen.json` keep working unchanged.
