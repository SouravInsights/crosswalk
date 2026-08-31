import { getModelContext, callApi, toolResult } from "./runtime.webmcp";

// ─── webmcp-codegen: generated. Do not edit this region. ───
/**
 * List all albums
 *
 * Source: GET /albums (openapi). Risk: safe-read.
 * Starts enabled (see executeGetAllAlbums below).
 * Regenerate with: npx @webmcp-stack/codegen generate
 */

/** The exact contract advertised to the agent. Derived from the API spec. Do not hand-edit. */
export const getAllAlbumsInputSchema = {
  "type": "object",
  "properties": {
    "shared": {
      "type": "boolean",
      "description": "Only return shared albums"
    }
  },
  "required": []
};

/** What `execute` receives. The browser validates agent input against the schema above. */
export type GetAllAlbumsInput = { "shared"?: boolean };

/** Safety hints computed by webmcp-codegen. Informational metadata for hosts and UIs. */
export const getAllAlbumsHints = {"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true} as const;

/** The tool definition, minus `execute` (which is yours, below the marker). */
export const getAllAlbumsTool = {
  name: "get-all-albums",
  description: "List all albums",
  inputSchema: getAllAlbumsInputSchema,
};

/**
 * Register this tool with WebMCP. Call it once on page load, or use
 * registerAllTools() from the generated index.ts.
 *
 * Pass an AbortSignal to unregister later: controller.abort().
 */
export async function registerGetAllAlbums(signal?: AbortSignal): Promise<void> {
  const modelContext = getModelContext();
  await modelContext.registerTool(
    {
      ...getAllAlbumsTool,
      // The browser has already validated the agent's input against the schema.
      execute: (input) => executeGetAllAlbums(input as GetAllAlbumsInput),
    },
    { signal },
  );
}

// ─── webmcp-codegen: end generated. Your code below survives regeneration. ───

/**
 * What actually happens when the agent calls "get-all-albums".
 *
 * Source: GET /albums. Call your existing client code here.
 * Return { content: [{ type: "text", text: ... }] } (the MCP result shape).
 */
export async function executeGetAllAlbums(input: GetAllAlbumsInput) {
  // TODO: implement using your app's existing code, e.g.:
  //   const response = await fetch("/albums");
  //   if (!response.ok) throw new Error("Request failed: " + response.status);
  //   return { content: [{ type: "text", text: "Done" }] };
  throw new Error("Not implemented: executeGetAllAlbums");
}