import { getModelContext, requestUserConfirmation, callApi, toolResult, asToolError, toolDisabled } from "./runtime.webmcp";

// ─── webmcp-codegen: generated. Do not edit this region. ───
/**
 * Remove a pet from the store permanently
 *
 * Source: DELETE /pets/{id} (openapi). Risk: destructive-confirm.
 * Starts disabled (see executeDeletePet below).
 * Regenerate with: npx @webmcp-stack/codegen generate
 */

/** The exact contract advertised to the agent. Derived from the API spec. Do not hand-edit. */
export const deletePetInputSchema = {
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
export type DeletePetInput = { "id": string };

/** Safety hints computed by webmcp-codegen. Informational metadata for hosts and UIs. */
export const deletePetHints = {"readOnlyHint":false,"destructiveHint":true,"idempotentHint":true,"untrustedContentHint":false} as const;

/** The tool definition, minus `execute` (which is yours, below the marker). */
export const deletePetTool = {
  name: "delete-pet",
  description: "Remove a pet from the store permanently",
  inputSchema: deletePetInputSchema,
  annotations: {
    readOnlyHint: false,
    untrustedContentHint: false,
  },
};

/**
 * Register this tool with WebMCP. Call it once on page load, or use
 * registerAllTools() from the generated index.ts. Skips quietly when the
 * browser has no WebMCP runtime.
 *
 * Pass an AbortSignal to unregister later: controller.abort().
 */
export async function registerDeletePet(signal?: AbortSignal): Promise<void> {
  const modelContext = getModelContext();
  if (!modelContext) return;
  await modelContext.registerTool(
    {
      ...deletePetTool,
      execute: async (input, context) => {
        // Cancellation wins over everything, including the confirmation.
        context?.signal?.throwIfAborted();
        // This tool changes things, so the user is always asked first. The
        // confirmation lives in the generated region: it cannot be edited away.
        const confirmed = await requestUserConfirmation(
          "Allow the agent to: Remove a pet from the store permanently",
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
          return await executeDeletePet(input as DeletePetInput, context?.signal);
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
 * What actually happens when the agent calls "delete-pet".
 *
 * Default implementation: calls DELETE /pets/{id} from this page, with the
 * signed-in user's session. Replace it with your app's own API client
 * whenever you like; the contract above never changes.
 *
 * This tool is destructive-confirm: it cannot easily be undone.
 * The user is asked to confirm every call (built into the generated region).
 */
export async function executeDeletePet(input: DeletePetInput) {
  // This tool starts disabled: it changes things. Agents can see it, and calling it tells
  // them it is disabled. To enable it, delete the line below and uncomment the code.
  return toolDisabled("delete-pet.webmcp.ts");

  // const data = await callApi(`/pets/${input.id}`, { method: "DELETE" });
  // return toolResult(data);
}