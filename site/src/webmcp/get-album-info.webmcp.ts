import { getModelContext } from "./runtime.webmcp";

// ─── webmcp-codegen: generated. Do not edit this region. ───
/**
 * Retrieve an album
 *
 * Source: GET /albums/{id} (openapi). Risk: safe-read.
 * Regenerate with: npx webmcp-codegen generate
 */

/** The exact contract advertised to the agent. Derived from the API spec. Do not hand-edit. */
export const getAlbumInfoInputSchema = {
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
export type GetAlbumInfoInput = { "id": string };

/** Safety hints computed by webmcp-codegen. Informational metadata for hosts and UIs. */
export const getAlbumInfoHints = {"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true} as const;

/** The tool definition, minus `execute` (which is yours, below the marker). */
export const getAlbumInfoTool = {
  name: "get-album-info",
  description: "Retrieve an album",
  inputSchema: getAlbumInfoInputSchema,
};

/**
 * Register this tool with WebMCP. Call it once on page load, or use
 * registerAllTools() from the generated index.ts.
 *
 * Pass an AbortSignal to unregister later: controller.abort().
 */
export async function registerGetAlbumInfo(signal?: AbortSignal): Promise<void> {
  const modelContext = getModelContext();
  await modelContext.registerTool(
    {
      ...getAlbumInfoTool,
      // The browser has already validated the agent's input against the schema.
      execute: (input) => executeGetAlbumInfo(input as GetAlbumInfoInput),
    },
    { signal },
  );
}

// ─── webmcp-codegen: end generated. Your code below survives regeneration. ───

/**
 * What actually happens when the agent calls "get-album-info".
 *
 * Source: GET /albums/{id}. Call your existing client code here.
 * Return { content: [{ type: "text", text: ... }] } (the MCP result shape).
 */
export async function executeGetAlbumInfo(input: GetAlbumInfoInput) {
  // TODO: implement using your app's existing code, e.g.:
  //   const response = await fetch("/albums/" + input.id + "");
  //   if (!response.ok) throw new Error("Request failed: " + response.status);
  //   return { content: [{ type: "text", text: "Done" }] };
  throw new Error("Not implemented: executeGetAlbumInfo");
}