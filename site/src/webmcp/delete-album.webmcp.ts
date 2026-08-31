import { getModelContext, requestUserConfirmation, callApi, toolResult, toolDisabled } from "./runtime.webmcp";

// ─── webmcp-codegen: generated. Do not edit this region. ───
/**
 * Delete an album
 *
 * Source: DELETE /albums/{id} (openapi). Risk: destructive-confirm.
 * Starts disabled (see executeDeleteAlbum below).
 * Regenerate with: npx @webmcp-stack/codegen generate
 */

/** The exact contract advertised to the agent. Derived from the API spec. Do not hand-edit. */
export const deleteAlbumInputSchema = {
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Album ID"
    }
  },
  "required": [
    "id"
  ]
};

/** What `execute` receives. The browser validates agent input against the schema above. */
export type DeleteAlbumInput = { "id": string };

/** Safety hints computed by webmcp-codegen. Informational metadata for hosts and UIs. */
export const deleteAlbumHints = {"readOnlyHint":false,"destructiveHint":true,"idempotentHint":true} as const;

/** The tool definition, minus `execute` (which is yours, below the marker). */
export const deleteAlbumTool = {
  name: "delete-album",
  description: "Delete an album",
  inputSchema: deleteAlbumInputSchema,
};

/**
 * Register this tool with WebMCP. Call it once on page load, or use
 * registerAllTools() from the generated index.ts.
 *
 * Pass an AbortSignal to unregister later: controller.abort().
 */
export async function registerDeleteAlbum(signal?: AbortSignal): Promise<void> {
  const modelContext = getModelContext();
  await modelContext.registerTool(
    {
      ...deleteAlbumTool,
      execute: async (input) => {
        // This tool changes things, so the user is always asked first. The
        // confirmation lives in the generated region: it cannot be edited away.
        const confirmed = await requestUserConfirmation(
          "Allow the agent to: Delete an album",
        );
        if (!confirmed) {
          return {
            content: [{ type: "text", text: "The user declined this action." }],
            isError: true,
          };
        }
        // The browser has already validated the agent's input against the schema.
        return executeDeleteAlbum(input as DeleteAlbumInput);
      },
    },
    { signal },
  );
}

// ─── webmcp-codegen: end generated. Your code below survives regeneration. ───

/**
 * What actually happens when the agent calls "delete-album".
 *
 * Source: DELETE /albums/{id}. Call your existing client code here.
 * Return { content: [{ type: "text", text: ... }] } (the MCP result shape).
 *
 * ⚠ This tool is destructive-confirm: it cannot easily be undone.
 * Ask the user before acting. See requestUserConfirmation() in runtime.webmcp.ts.
 */
export async function executeDeleteAlbum(input: DeleteAlbumInput) {
  // TODO: implement using your app's existing code, e.g.:
  //   const response = await fetch("/albums/" + input.id + "", { method: "DELETE" });
  //   if (!response.ok) throw new Error("Request failed: " + response.status);
  //   return { content: [{ type: "text", text: "Done" }] };
  throw new Error("Not implemented: executeDeleteAlbum");
}