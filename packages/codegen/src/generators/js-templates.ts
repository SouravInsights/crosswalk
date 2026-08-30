/**
 * The text of the code the `js` generator writes.
 *
 * Heads up before reading on: every function here returns *TypeScript source
 * code as a string*. When you see `export const ...` inside quotes, that's
 * the output a user's repo will contain, not this module's own logic.
 * Building output from arrays of lines (rather than nested template strings)
 * keeps the quoting readable; the only escaping left is for code samples
 * inside the generated comments.
 *
 * Three kinds of output are built here:
 *   - generatedRegion()      the per-tool contract (regenerated freely)
 *   - ownedRegionScaffold()  the execute() stub (written once, then owned)
 *   - runtimeSource() / barrelSource()   fully-generated support files
 */

import { jsonSchemaToTs, pascalCase } from "../schema.js";
import type { ReviewedTool } from "../types.js";
import { GENERATED_END, GENERATED_START } from "./js.js";

/**
 * Everything above the end-marker of a per-tool file: the parts that must
 * track the API contract exactly: name, description, schema, input type,
 * hints, and the register() wrapper.
 */
export function generatedRegion(tool: ReviewedTool): string {
  const pascal = pascalCase(tool.name);
  const camel = lowercaseFirst(pascal);
  const schemaJson = JSON.stringify(tool.inputSchema, null, 2);
  const inputType = jsonSchemaToTs(tool.inputSchema, undefined);

  return [
    `import { getModelContext } from "./runtime.webmcp";`,
    ``,
    GENERATED_START,
    `/**`,
    ` * ${tool.description}`,
    ` *`,
    ` * Source: ${tool.source.ref} (${tool.source.kind}). Risk: ${tool.riskTier}.`,
    ` * Regenerate with: npx webmcp-codegen generate`,
    ` */`,
    ``,
    `/** The exact contract advertised to the agent. Derived from the API spec. Do not hand-edit. */`,
    `export const ${camel}InputSchema = ${schemaJson};`,
    ``,
    `/** What \`execute\` receives. The browser validates agent input against the schema above. */`,
    `export type ${tool.inputTypeName} = ${inputType};`,
    ``,
    `/** Safety hints computed by webmcp-codegen. Informational metadata for hosts and UIs. */`,
    `export const ${camel}Hints = ${JSON.stringify(tool.hints)} as const;`,
    ``,
    `/** The tool definition, minus \`execute\` (which is yours, below the marker). */`,
    `export const ${camel}Tool = {`,
    `  name: ${JSON.stringify(tool.name)},`,
    `  description: ${JSON.stringify(tool.description)},`,
    `  inputSchema: ${camel}InputSchema,`,
    `};`,
    ``,
    `/**`,
    ` * Register this tool with WebMCP. Call it once on page load, or use`,
    ` * registerAllTools() from the generated index.ts.`,
    ` *`,
    ` * Pass an AbortSignal to unregister later: controller.abort().`,
    ` */`,
    `export async function register${pascal}(signal?: AbortSignal): Promise<void> {`,
    `  const modelContext = getModelContext();`,
    `  await modelContext.registerTool(`,
    `    {`,
    `      ...${camel}Tool,`,
    `      // The browser has already validated the agent's input against the schema.`,
    `      execute: (input) => execute${pascal}(input as ${tool.inputTypeName}),`,
    `    },`,
    `    { signal },`,
    `  );`,
    `}`,
    ``,
    GENERATED_END,
  ].join("\n");
}

/**
 * The scaffold below the marker, written exactly once (when the file is
 * first created). After that the developer owns it and regeneration never
 * touches it. That promise is the whole reason the marker split exists.
 */
export function ownedRegionScaffold(tool: ReviewedTool): string {
  const pascal = pascalCase(tool.name);
  const lines: string[] = [
    ``,
    `/**`,
    ` * What actually happens when the agent calls "${tool.name}".`,
    ` *`,
    ` * Source: ${tool.source.ref}. Call your existing client code here.`,
    ` * Return { content: [{ type: "text", text: ... }] } (the MCP result shape).`,
  ];

  if (tool.riskTier !== "safe-read") {
    lines.push(
      ` *`,
      ` * ⚠ This tool is ${tool.riskTier}: it ${
        tool.riskTier === "destructive-confirm" ? "cannot easily be undone" : "changes things"
      }.`,
      ` * Ask the user before acting. See requestUserConfirmation() in runtime.webmcp.ts.`,
    );
  }
  lines.push(` */`);

  if (tool.piiInOutput.length > 0) {
    lines.push(
      `//`,
      `// ⚠ webmcp-codegen flagged these response fields as likely PII: ${tool.piiInOutput.join(", ")}.`,
      `// Everything you return reaches the agent. Leave those fields out unless`,
      `// the agent genuinely needs them, and say so in a comment if you keep them.`,
    );
  }

  lines.push(
    `export async function execute${pascal}(input: ${tool.inputTypeName}) {`,
    ...usageExample(tool),
    `  throw new Error("Not implemented: execute${pascal}");`,
    `}`,
  );

  return lines.join("\n");
}

/**
 * The TODO example inside a fresh scaffold. When the source knows the route
 * (OpenAPI always does), the example shows the actual call. Seeing
 * `fetch("/pets/" + input.id, …)` beats an abstract placeholder every time.
 */
function usageExample(tool: ReviewedTool): string[] {
  if (!tool.httpMethod) {
    return [`  // TODO: implement using your app's existing code.`];
  }
  const path = tool.source.ref.replace(/^[A-Z]+ /, "");
  // Turn "/pets/{id}" into '"/pets/" + input.id': a copy-pasteable example.
  const exampleUrl = path
    .replace(/\{(\w+)\}/g, (_match, param: string) => `" + input.${param} + "`)
    // Trim the empty-string concat a leading/trailing placeholder leaves behind.
    .replace(/^"" \+ /, "")
    .replace(/ \+ ""$/, "");
  const fetchArgs =
    tool.httpMethod === "GET"
      ? `"${exampleUrl}"`
      : `"${exampleUrl}", { method: "${tool.httpMethod}" }`;
  return [
    `  // TODO: implement using your app's existing code, e.g.:`,
    `  //   const response = await fetch(${fetchArgs});`,
    `  //   if (!response.ok) throw new Error("Request failed: " + response.status);`,
    `  //   return { content: [{ type: "text", text: "Done" }] };`,
  ];
}

/**
 * The shared runtime: the minimal WebMCP browser types plus getModelContext().
 * Kept tiny on purpose: this is the only browser coupling in the output.
 */
export function runtimeSource(): string {
  return `/**
 * Generated by webmcp-codegen. This file is fully regenerated on every run.
 * Do not edit by hand; your changes will be lost.
 */

/** The result shape tools return (same as MCP tool results). */
export interface WebMcpToolResult {
  content: { type: "text"; text: string }[];
  [key: string]: unknown;
}

/** A tool as the browser runtime understands it. */
export interface WebMcpToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
}

/** The slice of the WebMCP draft spec the generated code uses. */
export interface ModelContext {
  registerTool(
    tool: WebMcpToolDefinition,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
}

/**
 * Access the page's WebMCP model context, with a helpful error when the
 * browser doesn't have one (rather than an undefined-callsite mystery).
 */
export function getModelContext(): ModelContext {
  const modelContext = (document as unknown as { modelContext?: ModelContext }).modelContext;
  if (!modelContext) {
    throw new Error(
      "WebMCP is not available in this browser. " +
        "Enable chrome://flags/#enable-webmcp-testing (Chrome 146+), " +
        "or add the WebMCP polyfill to your app.",
    );
  }
  return modelContext;
}

/**
 * Default "agent proposes, human confirms" gate for write/destructive tools.
 * Deliberately minimal (window.confirm). Replace it with your app's own
 * dialog when you outgrow it. The point is that the user always gets a say.
 */
export function requestUserConfirmation(message: string): Promise<boolean> {
  return Promise.resolve(window.confirm(message));
}
`;
}

/** The barrel: one import that registers every generated tool. */
export function barrelSource(tools: ReviewedTool[]): string {
  const imports = tools
    .map((tool) => `import { register${pascalCase(tool.name)} } from "./${tool.name}.webmcp";`)
    .join("\n");
  const names = tools.map((tool) => `register${pascalCase(tool.name)}`).join(",\n  ");

  return `/**
 * Generated by webmcp-codegen. This file is fully regenerated on every run.
 * Import registerAllTools() once at app startup:
 *
 *   import { registerAllTools } from "./webmcp";
 *   await registerAllTools();
 */

${imports}

const registrations = [
  ${names}
];

/**
 * Register every generated tool with WebMCP. One tool failing (for example
 * because the page's Permissions-Policy disables tools) never takes the
 * others down with it. The failure is logged and registration continues.
 */
export async function registerAllTools(signal?: AbortSignal): Promise<void> {
  for (const register of registrations) {
    try {
      await register(signal);
    } catch (error) {
      console.warn("[webmcp-codegen] a tool failed to register:", error);
    }
  }
}
`;
}

/** "GetOrderStatus" → "getOrderStatus" (for the generated const names). */
function lowercaseFirst(pascal: string): string {
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
