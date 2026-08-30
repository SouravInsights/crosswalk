import { getModelContext } from "./runtime.webmcp";

// ─── webmcp-codegen: generated — do not edit this region ───
/**
 * Add a new pet to the store
 *
 * Source: POST /pets (openapi) · risk: write-confirm
 * Regenerate with: npx webmcp-codegen generate
 */

/** The exact contract advertised to the agent. Derived from the API spec — do not hand-edit. */
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
      // The browser has already validated the agent's input against the schema.
      execute: (input) => executeCreatePet(input as CreatePetInput),
    },
    { signal },
  );
}

// ─── webmcp-codegen: end generated — your code below survives regeneration ───

/**
 * What actually happens when the agent calls "create-pet".
 *
 * Source: POST /pets — call your existing client code here.
 * Return { content: [{ type: "text", text: ... }] } (the MCP result shape).
 *
 * ⚠ This tool is write-confirm: it changes things.
 * Ask the user before acting — see requestUserConfirmation() in runtime.webmcp.ts.
 */
//
// ⚠ webmcp-codegen flagged these response fields as likely PII: owner.email.
// Everything you return reaches the agent. Leave those fields out unless
// the agent genuinely needs them, and say so in a comment if you keep them.
export async function executeCreatePet(input: CreatePetInput) {
  // TODO: implement using your app's existing code, e.g.:
  //   const response = await fetch("/pets", { method: "POST" });
  //   if (!response.ok) throw new Error("Request failed: " + response.status);
  //   return { content: [{ type: "text", text: "Done" }] };
  throw new Error("Not implemented: executeCreatePet");
}