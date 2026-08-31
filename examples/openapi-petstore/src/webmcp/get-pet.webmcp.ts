import { getModelContext, callApi, toolResult } from "./runtime.webmcp";

// ─── webmcp-codegen: generated. Do not edit this region. ───
/**
 * Get one pet, including its owner's contact details
 *
 * Source: GET /pets/{id} (openapi). Risk: safe-read.
 * Starts enabled (see executeGetPet below).
 * Regenerate with: npx @webmcp-stack/codegen generate
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
 * Default implementation: calls GET /pets/{id} from this page, with the
 * signed-in user's session. Replace it with your app's own API client
 * whenever you like; the contract above never changes.
 */
//
// ⚠ webmcp-codegen flagged these response fields as likely PII: owner.email.
// Everything you return reaches the agent. Leave those fields out of what you
// return unless the agent genuinely needs them, and say so in a comment if you keep them.
export async function executeGetPet(input: GetPetInput) {
  const data = await callApi(`/pets/${input.id}`, { method: "GET" });
  return toolResult(data);
}