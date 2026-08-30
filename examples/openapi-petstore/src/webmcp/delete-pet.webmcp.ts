import { getModelContext } from "./runtime.webmcp";

// ─── webmcp-codegen: generated — do not edit this region ───
/**
 * Remove a pet from the store permanently
 *
 * Source: DELETE /pets/{id} (openapi) · risk: destructive-confirm
 * Regenerate with: npx webmcp-codegen generate
 */

/** The exact contract advertised to the agent. Derived from the API spec — do not hand-edit. */
export const deletePetInputSchema = {
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
export type DeletePetInput = { "id": string };

/** Safety hints computed by webmcp-codegen. Informational metadata for hosts and UIs. */
export const deletePetHints = {"readOnlyHint":false,"destructiveHint":true,"idempotentHint":true} as const;

/** The tool definition, minus `execute` (which is yours, below the marker). */
export const deletePetTool = {
  name: "delete-pet",
  description: "Remove a pet from the store permanently",
  inputSchema: deletePetInputSchema,
};

/**
 * Register this tool with WebMCP. Call it once on page load, or use
 * registerAllTools() from the generated index.ts.
 *
 * Pass an AbortSignal to unregister later: controller.abort().
 */
export async function registerDeletePet(signal?: AbortSignal): Promise<void> {
  const modelContext = getModelContext();
  await modelContext.registerTool(
    {
      ...deletePetTool,
      // The browser has already validated the agent's input against the schema.
      execute: (input) => executeDeletePet(input as DeletePetInput),
    },
    { signal },
  );
}

// ─── webmcp-codegen: end generated — your code below survives regeneration ───

/**
 * What actually happens when the agent calls "delete-pet".
 *
 * Source: DELETE /pets/{id} — call your existing client code here.
 * Return { content: [{ type: "text", text: ... }] } (the MCP result shape).
 *
 * ⚠ This tool is destructive-confirm: it cannot easily be undone.
 * Ask the user before acting — see requestUserConfirmation() in runtime.webmcp.ts.
 */
export async function executeDeletePet(input: DeletePetInput) {
  // TODO: implement using your app's existing code, e.g.:
  //   const response = await fetch("/pets/" + input.id + "", { method: "DELETE" });
  //   if (!response.ok) throw new Error("Request failed: " + response.status);
  //   return { content: [{ type: "text", text: "Done" }] };
  throw new Error("Not implemented: executeDeletePet");
}