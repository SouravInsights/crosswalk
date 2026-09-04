import { getModelContext, callApi, toolResult } from "./runtime.webmcp";

// ─── webmcp-codegen: generated. Do not edit this region. ───
/**
 * Retrieve an asset
 *
 * Source: GET /assets/{id} (openapi). Risk: safe-read.
 * Starts enabled (see executeGetAssetInfo below).
 * Regenerate with: npx @webmcp-stack/codegen generate
 */

/** The exact contract advertised to the agent. Derived from the API spec. Do not hand-edit. */
export const getAssetInfoInputSchema = {
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Id. A UUID."
    }
  },
  "required": [
    "id"
  ]
};

/** What `execute` receives. The browser validates agent input against the schema above. */
export type GetAssetInfoInput = { "id": string };

/** Safety hints computed by webmcp-codegen. Informational metadata for hosts and UIs. */
export const getAssetInfoHints = {"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true} as const;

/** The tool definition, minus `execute` (which is yours, below the marker). */
export const getAssetInfoTool = {
  name: "get-asset-info",
  description: "Retrieve an asset",
  inputSchema: getAssetInfoInputSchema,
};

/**
 * Register this tool with WebMCP. Call it once on page load, or use
 * registerAllTools() from the generated index.ts.
 *
 * Pass an AbortSignal to unregister later: controller.abort().
 */
export async function registerGetAssetInfo(signal?: AbortSignal): Promise<void> {
  const modelContext = getModelContext();
  await modelContext.registerTool(
    {
      ...getAssetInfoTool,
      // The browser has already validated the agent's input against the schema.
      execute: (input) => executeGetAssetInfo(input as GetAssetInfoInput),
    },
    { signal },
  );
}

// ─── webmcp-codegen: end generated. Your code below survives regeneration. ───

/**
 * What actually happens when the agent calls "get-asset-info".
 *
 * Source: GET /assets/{id}. Call your existing client code here.
 * Return { content: [{ type: "text", text: ... }] } (the MCP result shape).
 */
export async function executeGetAssetInfo(input: GetAssetInfoInput) {
  // TODO: implement using your app's existing code, e.g.:
  //   const response = await fetch("/assets/" + input.id + "");
  //   if (!response.ok) throw new Error("Request failed: " + response.status);
  //   return { content: [{ type: "text", text: "Done" }] };
  throw new Error("Not implemented: executeGetAssetInfo");
}