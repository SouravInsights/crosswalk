import { getModelContext, requestUserConfirmation, callApi, toolResult, toolDisabled } from "./runtime.webmcp";

// ─── webmcp-codegen: generated. Do not edit this region. ───
/**
 * Add a new pet to the store
 *
 * Source: POST /pets (openapi). Risk: write-confirm.
 * Starts disabled (see executeCreatePet below).
 * Regenerate with: npx webmcp-codegen generate
 */

/** The exact contract advertised to the agent. Derived from the API spec. Do not hand-edit. */
export const createPetInputSchema = {
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "tag": {
      "type": "string"
    }
  },
  "required": [
    "name"
  ]
};

/** What `execute` receives. The browser validates agent input against the schema above. */
export type CreatePetInput = { "name": string; "tag"?: string };

/** Safety hints computed by webmcp-codegen. Informational metadata for hosts and UIs. */
export const createPetHints = {"readOnlyHint":false,"destructiveHint":false,"idempotentHint":false} as const;

/** The tool definition, minus `execute` (which is yours, below the marker). */
export const createPetTool = {
  name: "create-pet",
  description: "Add a new pet to the store",
  inputSchema: createPetInputSchema,
};

/**
 * Register this tool with WebMCP. Call it once on page load, or use
 * registerAllTools() from the generated index.ts.
 *
 * Pass an AbortSignal to unregister later: controller.abort().
 */
export async function registerCreatePet(signal?: AbortSignal): Promise<void> {
  const modelContext = getModelContext();
  await modelContext.registerTool(
    {
      ...createPetTool,
      execute: async (input) => {
        // This tool changes things, so the user is always asked first. The
        // confirmation lives in the generated region: it cannot be edited away.
        const confirmed = await requestUserConfirmation(
          "Allow the agent to: Add a new pet to the store",
        );
        if (!confirmed) {
          return {
            content: [{ type: "text", text: "The user declined this action." }],
            isError: true,
          };
        }
        // The browser has already validated the agent's input against the schema.
        return executeCreatePet(input as CreatePetInput);
      },
    },
    { signal },
  );
}

// ─── webmcp-codegen: end generated. Your code below survives regeneration. ───

/**
 * What actually happens when the agent calls "create-pet".
 *
 * Default implementation: calls POST /pets from this page, with the
 * signed-in user's session. Replace it with your app's own API client
 * whenever you like; the contract above never changes.
 *
 * This tool is write-confirm: it changes things.
 * The user is asked to confirm every call (built into the generated region).
 */
//
// ⚠ webmcp-codegen flagged these response fields as likely PII: owner.email.
// Everything you return reaches the agent. Leave those fields out of what you
// return unless the agent genuinely needs them, and say so in a comment if you keep them.
export async function executeCreatePet(input: CreatePetInput) {
  // This tool starts disabled: it changes things. Agents can see it, and calling it tells
  // them it is disabled. To enable it, delete the line below and uncomment the code.
  return toolDisabled("create-pet.webmcp.ts");

  // const data = await callApi("/pets", { method: "POST", body: { name: input.name, tag: input.tag } });
  // return toolResult(data);
}