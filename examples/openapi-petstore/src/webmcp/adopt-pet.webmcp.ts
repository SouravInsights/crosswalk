import { getModelContext, requestUserConfirmation, callApi, toolResult, asToolError, toolDisabled } from "./runtime.webmcp";

// ─── webmcp-codegen: generated. Do not edit this region. ───
/**
 * Adopt a pet — this finalizes the adoption paperwork
 *
 * Source: POST /pets/{id}/adopt (openapi). Risk: write-confirm.
 * Starts disabled (see executeAdoptPet below).
 * Regenerate with: npx @webmcp-stack/codegen generate
 */

/** The exact contract advertised to the agent. Derived from the API spec. Do not hand-edit. */
export const adoptPetInputSchema = {
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Id."
    }
  },
  "required": [
    "id"
  ]
};

/** What `execute` receives. The browser validates agent input against the schema above. */
export type AdoptPetInput = { "id": string };

/** Safety hints computed by webmcp-codegen. Informational metadata for hosts and UIs. */
export const adoptPetHints = {"readOnlyHint":false,"destructiveHint":false,"idempotentHint":false,"untrustedContentHint":true} as const;

/** The tool definition, minus `execute` (which is yours, below the marker). */
export const adoptPetTool = {
  name: "adopt-pet",
  description: "Adopt a pet — this finalizes the adoption paperwork",
  inputSchema: adoptPetInputSchema,
  annotations: {
    readOnlyHint: false,
    untrustedContentHint: true,
  },
};

/**
 * Register this tool with WebMCP. Call it once on page load, or use
 * registerAllTools() from the generated index.ts. Skips quietly when the
 * browser has no WebMCP runtime.
 *
 * Pass an AbortSignal to unregister later: controller.abort().
 */
export async function registerAdoptPet(signal?: AbortSignal): Promise<void> {
  const modelContext = getModelContext();
  if (!modelContext) return;
  await modelContext.registerTool(
    {
      ...adoptPetTool,
      execute: async (input, context) => {
        // Cancellation wins over everything, including the confirmation.
        context?.signal?.throwIfAborted();
        // This tool changes things, so the user is always asked first. The
        // confirmation lives in the generated region: it cannot be edited away.
        const confirmed = await requestUserConfirmation(
          "Allow the agent to: Adopt a pet — this finalizes the adoption paperwork",
        );
        if (!confirmed) {
          return {
            content: [{ type: "text", text: "The user declined this action." }],
            isError: true,
          };
        }
        // The browser has already validated the agent's input against the schema.
        // A failure returns a readable result; it never throws (see asToolError).
        try {
          return await executeAdoptPet(input as AdoptPetInput, context?.signal);
        } catch (error) {
          return asToolError(error);
        }
      },
    },
    { signal },
  );
}

// ─── webmcp-codegen: end generated. Your code below survives regeneration. ───

/**
 * What actually happens when the agent calls "adopt-pet".
 *
 * Default implementation: calls POST /pets/{id}/adopt from this page, with the
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
export async function executeAdoptPet(input: AdoptPetInput) {
  // This tool starts disabled: it changes things. Agents can see it, and calling it tells
  // them it is disabled. To enable it, delete the line below and uncomment the code.
  return toolDisabled("adopt-pet.webmcp.ts");

  // const data = await callApi(`/pets/${input.id}/adopt`, { method: "POST" });
  // return toolResult(data);
}