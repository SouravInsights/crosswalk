import { getModelContext, requestUserConfirmation, callApi, toolResult, toolDisabled } from "./runtime.webmcp";

// ─── webmcp-codegen: generated. Do not edit this region. ───
/**
 * Create a user
 *
 * Source: POST /admin/users (openapi). Risk: write-confirm.
 * Starts disabled (see executeCreateUserAdmin below).
 * Regenerate with: npx @webmcp-stack/codegen generate
 */

/** The exact contract advertised to the agent. Derived from the API spec. Do not hand-edit. */
export const createUserAdminInputSchema = {
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "format": "email"
    },
    "name": {
      "type": "string"
    },
    "password": {
      "type": "string"
    }
  },
  "required": [
    "email",
    "name",
    "password"
  ]
};

/** What `execute` receives. The browser validates agent input against the schema above. */
export type CreateUserAdminInput = { "email": string; "name": string; "password": string };

/** Safety hints computed by webmcp-codegen. Informational metadata for hosts and UIs. */
export const createUserAdminHints = {"readOnlyHint":false,"destructiveHint":false,"idempotentHint":false} as const;

/** The tool definition, minus `execute` (which is yours, below the marker). */
export const createUserAdminTool = {
  name: "create-user-admin",
  description: "Create a user",
  inputSchema: createUserAdminInputSchema,
};

/**
 * Register this tool with WebMCP. Call it once on page load, or use
 * registerAllTools() from the generated index.ts.
 *
 * Pass an AbortSignal to unregister later: controller.abort().
 */
export async function registerCreateUserAdmin(signal?: AbortSignal): Promise<void> {
  const modelContext = getModelContext();
  await modelContext.registerTool(
    {
      ...createUserAdminTool,
      execute: async (input) => {
        // This tool changes things, so the user is always asked first. The
        // confirmation lives in the generated region: it cannot be edited away.
        const confirmed = await requestUserConfirmation(
          "Allow the agent to: Create a user",
        );
        if (!confirmed) {
          return {
            content: [{ type: "text", text: "The user declined this action." }],
            isError: true,
          };
        }
        // The browser has already validated the agent's input against the schema.
        return executeCreateUserAdmin(input as CreateUserAdminInput);
      },
    },
    { signal },
  );
}

// ─── webmcp-codegen: end generated. Your code below survives regeneration. ───

/**
 * What actually happens when the agent calls "create-user-admin".
 *
 * Source: POST /admin/users. Call your existing client code here.
 * Return { content: [{ type: "text", text: ... }] } (the MCP result shape).
 *
 * ⚠ This tool is write-confirm: it changes things.
 * Ask the user before acting. See requestUserConfirmation() in runtime.webmcp.ts.
 */
export async function executeCreateUserAdmin(input: CreateUserAdminInput) {
  // TODO: implement using your app's existing code, e.g.:
  //   const response = await fetch("/admin/users", { method: "POST" });
  //   if (!response.ok) throw new Error("Request failed: " + response.status);
  //   return { content: [{ type: "text", text: "Done" }] };
  throw new Error("Not implemented: executeCreateUserAdmin");
}