import { getModelContext, requestUserConfirmation, callApi, toolResult, toolDisabled } from "./runtime.webmcp";

// ─── webmcp-codegen: generated. Do not edit this region. ───
/**
 * Create an album
 *
 * Source: POST /albums (openapi). Risk: write-confirm.
 * Starts disabled (see executeCreateAlbum below).
 * Regenerate with: npx @webmcp-stack/codegen generate
 */

/** The exact contract advertised to the agent. Derived from the API spec. Do not hand-edit. */
export const createAlbumInputSchema = {
  "type": "object",
  "properties": {
    "albumName": {
      "type": "string",
      "description": "Album name."
    },
    "description": {
      "type": "string",
      "description": "Description."
    }
  },
  "required": [
    "albumName"
  ]
};

/** What `execute` receives. The browser validates agent input against the schema above. */
export type CreateAlbumInput = { "albumName": string; "description"?: string };

/** Safety hints computed by webmcp-codegen. Informational metadata for hosts and UIs. */
export const createAlbumHints = {"readOnlyHint":false,"destructiveHint":false,"idempotentHint":false} as const;

/** The tool definition, minus `execute` (which is yours, below the marker). */
export const createAlbumTool = {
  name: "create-album",
  description: "Create an album",
  inputSchema: createAlbumInputSchema,
};

/**
 * Register this tool with WebMCP. Call it once on page load, or use
 * registerAllTools() from the generated index.ts.
 *
 * Pass an AbortSignal to unregister later: controller.abort().
 */
export async function registerCreateAlbum(signal?: AbortSignal): Promise<void> {
  const modelContext = getModelContext();
  await modelContext.registerTool(
    {
      ...createAlbumTool,
      execute: async (input) => {
        // This tool changes things, so the user is always asked first. The
        // confirmation lives in the generated region: it cannot be edited away.
        const confirmed = await requestUserConfirmation(
          "Allow the agent to: Create an album",
        );
        if (!confirmed) {
          return {
            content: [{ type: "text", text: "The user declined this action." }],
            isError: true,
          };
        }
        // The browser has already validated the agent's input against the schema.
        return executeCreateAlbum(input as CreateAlbumInput);
      },
    },
    { signal },
  );
}

// ─── webmcp-codegen: end generated. Your code below survives regeneration. ───

/**
 * What actually happens when the agent calls "create-album".
 *
 * Source: POST /albums. Call your existing client code here.
 * Return { content: [{ type: "text", text: ... }] } (the MCP result shape).
 *
 * ⚠ This tool is write-confirm: it changes things.
 * Ask the user before acting. See requestUserConfirmation() in runtime.webmcp.ts.
 */
export async function executeCreateAlbum(input: CreateAlbumInput) {
  // TODO: implement using your app's existing code, e.g.:
  //   const response = await fetch("/albums", { method: "POST" });
  //   if (!response.ok) throw new Error("Request failed: " + response.status);
  //   return { content: [{ type: "text", text: "Done" }] };
  throw new Error("Not implemented: executeCreateAlbum");
}