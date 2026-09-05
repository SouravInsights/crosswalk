/**
 * The text of the code the `tools` output writes.
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
 *   - ownedRegionScaffold()  the execute() body (written once, then owned)
 *   - runtimeSource() / barrelSource()   fully-generated support files
 *
 * The contract the output fulfills: read tools work out of the box (a real
 * request to the endpoint), mutation tools start disabled with the working
 * code generated but commented out, and the user-confirmation step for
 * mutations lives in the generated region so it cannot be edited away.
 * Registration skips quietly on browsers without WebMCP, the execute
 * context's signal reaches fetch, and failures return readable error
 * results. That error contract is load-bearing: the browser maps a
 * rejected execute to a bare UnknownError with the message discarded,
 * so a thrown failure would teach the agent nothing.
 */

import { jsonSchemaToTs, pascalCase } from "../json-schema.js";
import type { ReviewedTool } from "../types.js";
import { GENERATED_END, GENERATED_START } from "./tools.js";

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
  const mutates = tool.riskTier !== "safe-read";

  // The imports cover what this file's regions use: the generated register()
  // and the owned execute() scaffold. A developer who replaces the scaffold
  // with their own API client can trim the imports they stop using.
  const runtimeImports = [
    "getModelContext",
    ...(mutates ? ["requestUserConfirmation"] : []),
    "callApi",
    "toolResult",
    "asToolError",
    ...(tool.enabledByDefault ? [] : ["toolDisabled"]),
  ].join(", ");

  const registerBody = mutates
    ? [
        `  await modelContext.registerTool(`,
        `    {`,
        `      ...${camel}Tool,`,
        `      execute: async (input, context) => {`,
        `        // Cancellation wins over everything, including the confirmation.`,
        `        context?.signal?.throwIfAborted();`,
        `        // This tool changes things, so the user is always asked first. The`,
        `        // confirmation lives in the generated region: it cannot be edited away.`,
        `        const confirmed = await requestUserConfirmation(`,
        `          ${JSON.stringify(`Allow the agent to: ${tool.description}`)},`,
        `        );`,
        `        if (!confirmed) {`,
        `          return {`,
        `            content: [{ type: "text", text: "The user declined this action." }],`,
        `            isError: true,`,
        `          };`,
        `        }`,
        `        // The browser has already validated the agent's input against the schema.`,
        `        // A failure returns a readable result; it never throws (see asToolError).`,
        `        try {`,
        `          return await execute${pascal}(input as ${tool.inputTypeName}, context?.signal);`,
        `        } catch (error) {`,
        `          return asToolError(error);`,
        `        }`,
        `      },`,
        `    },`,
        `    { signal },`,
        `  );`,
      ]
    : [
        `  await modelContext.registerTool(`,
        `    {`,
        `      ...${camel}Tool,`,
        `      // The browser has already validated the agent's input against the schema.`,
        `      // A failure returns a readable result; it never throws (see asToolError).`,
        `      execute: async (input, context) => {`,
        `        try {`,
        `          return await execute${pascal}(input as ${tool.inputTypeName}, context?.signal);`,
        `        } catch (error) {`,
        `          return asToolError(error);`,
        `        }`,
        `      },`,
        `    },`,
        `    { signal },`,
        `  );`,
      ];

  return [
    `import { ${runtimeImports} } from "./runtime.webmcp";`,
    ``,
    GENERATED_START,
    `/**`,
    ` * ${tool.description}`,
    ` *`,
    ` * Source: ${tool.source.ref} (${tool.source.kind}). Risk: ${tool.riskTier}.`,
    ` * Starts ${tool.enabledByDefault ? "enabled" : "disabled"} (see execute${pascal} below).`,
    ` * Regenerate with: npx @webmcp-stack/codegen generate`,
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
    `  annotations: {`,
    `    readOnlyHint: ${tool.hints.readOnlyHint},`,
    `    untrustedContentHint: ${tool.hints.untrustedContentHint},`,
    `  },`,
    `};`,
    ``,
    `/**`,
    ` * Register this tool with WebMCP. Call it once on page load, or use`,
    ` * registerAllTools() from the generated index.ts. Skips quietly when the`,
    ` * browser has no WebMCP runtime.`,
    ` *`,
    ` * Pass an AbortSignal to unregister later: controller.abort().`,
    ` */`,
    `export async function register${pascal}(signal?: AbortSignal): Promise<void> {`,
    `  const modelContext = getModelContext();`,
    `  if (!modelContext) return;`,
    ...registerBody,
    `}`,
    ``,
    GENERATED_END,
  ].join("\n");
}

/**
 * The scaffold below the marker, written exactly once (when the file is
 * first created). After that the developer owns it and regeneration never
 * touches it. That promise is the whole reason the marker split exists.
 *
 * The scaffold is real code, not a TODO: the spec knows the method, the
 * path, and which fields go where, so the default implementation actually
 * calls the endpoint from the page, with the signed-in user's session.
 * Reads are born working; mutations are born disabled (the working code is
 * right there, commented out, one deliberate edit away from live).
 */
export function ownedRegionScaffold(tool: ReviewedTool): string {
  const pascal = pascalCase(tool.name);
  const call = requestCall(tool);
  // An endpoint-backed tool scaffolds a call to its route. A standalone schema
  // tool has no route: the honest scaffold says "wire this to your app's own
  // action" and names nothing we made up.
  const endpointBacked = Boolean(tool.endpointRef) || tool.source.kind === "openapi";
  const calledWhat = tool.endpointRef ?? tool.source.ref;
  const lines: string[] = [
    ``,
    `/**`,
    ` * What actually happens when the agent calls "${tool.name}".`,
    ` *`,
    ...(endpointBacked
      ? [
          ` * Default implementation: calls ${calledWhat} from this page, with the`,
          ` * signed-in user's session. Replace it with your app's own API client`,
          ` * whenever you like; the contract above never changes.`,
        ]
      : [
          ` * This tool was declared from a schema, not derived from an endpoint,`,
          ` * so there is no default request to scaffold. Wire it to your app's own`,
          ` * action (the function your UI already calls), with the signed-in`,
          ` * user's session. The contract above never changes.`,
        ]),
  ];

  if (endpointBacked && tool.serverUrl) {
    lines.push(` *`, ` * Calls the API at ${tool.serverUrl} (from your spec's servers list).`);
  }

  if (tool.riskTier !== "safe-read") {
    lines.push(
      ` *`,
      ` * This tool is ${tool.riskTier}: it ${
        tool.riskTier === "destructive-confirm" ? "cannot easily be undone" : "changes things"
      }.`,
      ` * The user is asked to confirm every call (built into the generated region).`,
    );
  }
  lines.push(` */`);

  if (tool.piiInOutput.length > 0) {
    lines.push(
      `//`,
      `// ⚠ webmcp-codegen flagged these response fields as likely PII: ${tool.piiInOutput.join(", ")}.`,
      `// Everything you return reaches the agent. Leave those fields out of what you`,
      `// return unless the agent genuinely needs them, and say so in a comment if you keep them.`,
    );
  }

  if (tool.enabledByDefault) {
    lines.push(
      `export async function execute${pascal}(input: ${tool.inputTypeName}, signal?: AbortSignal) {`,
      `  ${call}`,
      `  return toolResult(data);`,
      `}`,
    );
  } else {
    lines.push(
      `export async function execute${pascal}(input: ${tool.inputTypeName}, signal?: AbortSignal) {`,
      `  // This tool starts disabled: it ${
        tool.endpointRole === "endpoint"
          ? "changes things"
          : `wraps an ${tool.endpointRole} endpoint`
      }. Agents can see it, and calling it tells`,
      `  // them it is disabled. To enable it, delete the line below and uncomment the code.`,
      `  void signal; // passed to fetch once you enable the call below`,
      `  return toolDisabled("${tool.name}.webmcp.ts");`,
      ``,
      `  // ${call}`,
      `  // return toolResult(data);`,
      `}`,
    );
  }

  return lines.join("\n");
}

/**
 * The one working request line inside a scaffold, built from what the spec
 * knows: the path template becomes a template literal, query params become
 * the search string, body fields become the JSON body.
 *
 *   "/pets/{id}" + DELETE  →  const data = await callApi(`/pets/${input.id}`, { method: "DELETE" });
 *
 * When the source carries no route information, we fall back to an honest
 * TODO instead of inventing a URL.
 */
function requestCall(tool: ReviewedTool): string {
  if (!tool.httpMethod || !tool.pathTemplate || !tool.paramLocations) {
    return `const data = null; // TODO: call your app's existing code here.`;
  }

  const { path: pathParams, query: queryParams, body: bodyParams } = tool.paramLocations;

  // "/pets/{id}" → `/pets/${input.id}`. Params the schema knows by name.
  let pathExpr = `\`${tool.pathTemplate.replace(/\{([^}]+)\}/g, (_m, param: string) => `\${${inputRef(param)}}`)}\``;
  if (pathParams.length === 0) pathExpr = JSON.stringify(tool.pathTemplate);

  // When the spec declares an absolute server URL, use it so the call goes
  // to the API even when the app and API are on different origins.
  if (tool.serverUrl) {
    const base = tool.serverUrl.endsWith("/") ? tool.serverUrl.slice(0, -1) : tool.serverUrl;
    pathExpr = `\`${base}\${${pathExpr}}\``;
  }

  const options: string[] = [`method: ${JSON.stringify(tool.httpMethod)}`];
  if (queryParams.length > 0) {
    const entries = queryParams.map((name) => `${safeKey(name)}: ${inputRef(name)}`).join(", ");
    options.push(`query: { ${entries} }`);
  }
  if (bodyParams.length > 0) {
    if (bodyParams.length === 1 && bodyParams[0] === "body") {
      // A non-object request body arrives as a single "body" field.
      options.push(`body: input.body`);
    } else {
      const entries = bodyParams.map((name) => `${safeKey(name)}: ${inputRef(name)}`).join(", ");
      options.push(`body: { ${entries} }`);
    }
  }
  // The execute context's signal reaches fetch, so a cancelled call stops.
  options.push("signal");

  return `const data = await callApi(${pathExpr}, { ${options.join(", ")} });`;
}

/**
 * How generated code reads a field off `input`. Dot access for identifier
 * names ("input.limit"), bracket access for the rest ("input["pet-id"]").
 */
function inputRef(name: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)
    ? `input.${name}`
    : `input[${JSON.stringify(name)}]`;
}

/** Quote an object key only when it needs it. */
function safeKey(name: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

/**
 * The shared runtime: the minimal WebMCP browser types plus the helpers the
 * generated files use. Kept tiny on purpose: this is the only browser
 * coupling in the output.
 */
export function runtimeSource(): string {
  return `/**
 * Generated by webmcp-codegen. This file is fully regenerated on every run.
 * Do not edit by hand; your changes will be lost.
 */

/** The result shape tools return (same as MCP tool results). */
export interface WebMcpToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
  [key: string]: unknown;
}

/** A tool as the browser runtime understands it. */
export interface WebMcpToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  /** Hints the agent reads to decide how careful to be with this tool. */
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (
    input: Record<string, unknown>,
    context?: { signal?: AbortSignal },
  ) => unknown | Promise<unknown>;
}

/** The slice of the WebMCP draft spec the generated code uses. */
export interface ModelContext {
  registerTool(
    tool: WebMcpToolDefinition,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
}

/* Most browsers do not have WebMCP yet, so a missing model context is a
 * normal page load, not an error. It gets one quiet log line per load,
 * never one per tool. */
let announcedUnavailable = false;

/**
 * The page's WebMCP model context, or null when the browser has none.
 * Registration callers skip quietly on null; a missing runtime must never
 * surface in the human-facing page (no throws, no console spam).
 */
export function getModelContext(): ModelContext | null {
  const modelContext = (document as unknown as { modelContext?: ModelContext }).modelContext;
  if (!modelContext && !announcedUnavailable) {
    announcedUnavailable = true;
    console.info(
      "[webmcp-codegen] WebMCP is not available in this browser; tools were not registered.",
    );
  }
  return modelContext ?? null;
}

/**
 * Call your API from the page. Same origin by default (pass a full URL when
 * the API lives on another host), always with the signed-in user's session
 * cookies. Throws on HTTP errors; returns the parsed JSON body, or raw text
 * when the response is not JSON. Pass the signal from execute's context so
 * a cancelled tool call stops the request.
 */
export async function callApi(
  path: string,
  options: {
    method?: string;
    query?: Record<string, unknown>;
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<unknown> {
  const url = new URL(path, window.location.origin);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error("Request failed: " + response.status + " " + response.statusText);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Wrap a result in the MCP shape, so tool bodies stay one line. */
export function toolResult(data: unknown): WebMcpToolResult {
  return {
    content: [
      { type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) },
    ],
  };
}

/**
 * A failure the agent can read and act on. The one hard rule of the execute
 * contract: never throw for failure. The browser maps a rejected execute to
 * a bare UnknownError and discards the message, so a thrown failure teaches
 * the agent nothing. Cancellation is the only exception, which is why
 * asToolError re-throws AbortError.
 */
export function toolError(message: string): WebMcpToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** Convert any thrown failure into a readable error result. */
export function asToolError(error: unknown): WebMcpToolResult {
  if (error instanceof DOMException && error.name === "AbortError") throw error;
  return toolError(error instanceof Error ? error.message : "The tool failed.");
}

/**
 * What a disabled tool tells the agent. The tool stays visible (so the agent
 * knows it exists and can ask the human to enable it) but does nothing.
 */
export function toolDisabled(fileName: string): WebMcpToolResult {
  return {
    content: [
      {
        type: "text",
        text:
          "This tool is currently disabled by the app developer. Ask them to enable it " +
          "(uncomment the implementation in " + fileName + ").",
      },
    ],
    isError: true,
  };
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
