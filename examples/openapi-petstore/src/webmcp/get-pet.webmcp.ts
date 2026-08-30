import { getModelContext } from "./runtime.webmcp";

// ─── webmcp-codegen: generated. Do not edit this region. ───
/**
 * Get one pet, including its owner's contact details
 *
 * Source: GET /pets/{id} (openapi). Risk: safe-read.
 * Regenerate with: npx webmcp-codegen generate
 */

/** The exact contract advertised to the agent. Derived from the API spec. Do not hand-edit. */
export const getPetInputSchema = {
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    }
  },
  "required": [
    "id"
  ]
};

/** What `execute` receives. The browser validates agent input against the schema above. */
export type GetPetInput = { "id": string };

/** Safety hints computed by webmcp-codegen. Informational metadata for hosts and UIs. */
export const getPetHints = {"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true} as const;

/** The tool definition, minus `execute` (which is yours, below the marker). */
export const getPetTool = {
  name: "get-pet",
  description: "Get one pet, including its owner's contact details",
  inputSchema: getPetInputSchema,
};

/**
 * Register this tool with WebMCP. Call it once on page load, or use
 * registerAllTools() from the generated index.ts.
 *
 * Pass an AbortSignal to unregister later: controller.abort().
 */
export async function registerGetPet(signal?: AbortSignal): Promise<void> {
  const modelContext = getModelContext();
  await modelContext.registerTool(
    {
      ...getPetTool,
      // The browser has already validated the agent's input against the schema.
      execute: (input) => executeGetPet(input as GetPetInput),
    },
    { signal },
  );
}

// ─── webmcp-codegen: end generated. Your code below survives regeneration. ───

/**
 * What actually happens when the agent calls "get-pet".
 *
 * Source: GET /pets/{id}. Call your existing client code here.
 * Return { content: [{ type: "text", text: ... }] } (the MCP result shape).
 */
//
// ⚠ webmcp-codegen flagged these response fields as likely PII: owner.email.
// Everything you return reaches the agent. Leave those fields out unless
// the agent genuinely needs them, and say so in a comment if you keep them.
export async function executeGetPet(input: GetPetInput) {
  // TODO: implement using your app's existing code, e.g.:
  //   const response = await fetch("/pets/" + input.id + "");
  //   if (!response.ok) throw new Error("Request failed: " + response.status);
  //   return { content: [{ type: "text", text: "Done" }] };
  throw new Error("Not implemented: executeGetPet");
}