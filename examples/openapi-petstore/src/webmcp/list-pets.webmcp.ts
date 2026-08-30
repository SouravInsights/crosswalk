import { getModelContext } from "./runtime.webmcp";

// ─── webmcp-codegen: generated. Do not edit this region. ───
/**
 * List all pets in the store
 *
 * Source: GET /pets (openapi). Risk: safe-read.
 * Regenerate with: npx webmcp-codegen generate
 */

/** The exact contract advertised to the agent. Derived from the API spec. Do not hand-edit. */
export const listPetsInputSchema = {
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": [
        "available",
        "adopted"
      ],
      "description": "Only show pets in this status"
    }
  },
  "required": []
};

/** What `execute` receives. The browser validates agent input against the schema above. */
export type ListPetsInput = { "status"?: "available" | "adopted" };

/** Safety hints computed by webmcp-codegen. Informational metadata for hosts and UIs. */
export const listPetsHints = {"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true} as const;

/** The tool definition, minus `execute` (which is yours, below the marker). */
export const listPetsTool = {
  name: "list-pets",
  description: "List all pets in the store",
  inputSchema: listPetsInputSchema,
};

/**
 * Register this tool with WebMCP. Call it once on page load, or use
 * registerAllTools() from the generated index.ts.
 *
 * Pass an AbortSignal to unregister later: controller.abort().
 */
export async function registerListPets(signal?: AbortSignal): Promise<void> {
  const modelContext = getModelContext();
  await modelContext.registerTool(
    {
      ...listPetsTool,
      // The browser has already validated the agent's input against the schema.
      execute: (input) => executeListPets(input as ListPetsInput),
    },
    { signal },
  );
}

// ─── webmcp-codegen: end generated. Your code below survives regeneration. ───

/**
 * What actually happens when the agent calls "list-pets".
 *
 * Source: GET /pets. Call your existing client code here.
 * Return { content: [{ type: "text", text: ... }] } (the MCP result shape).
 */
export async function executeListPets(input: ListPetsInput) {
  // TODO: implement using your app's existing code, e.g.:
  //   const response = await fetch("/pets");
  //   if (!response.ok) throw new Error("Request failed: " + response.status);
  //   return { content: [{ type: "text", text: "Done" }] };
  throw new Error("Not implemented: executeListPets");
}