import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { PageConnection } from "./cdp.js";

/**
 * Serve a page's Groundstate tools over MCP stdio.
 *
 * Tools are fetched from the live page on every list request — registrations
 * change as the app navigates and re-renders, so nothing is cached.
 */
export async function serve(page: PageConnection): Promise<void> {
  const server = new Server(
    { name: "groundstate-bridge", version: "0.0.1" },
    { capabilities: { tools: { listChanged: false } } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = await page.listTools();
    return {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: (t.inputSchema ?? { type: "object", properties: {} }) as {
          type: "object";
          [key: string]: unknown;
        },
        annotations: { readOnlyHint: t.readOnly },
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const result = await page.callTool(name, (args as Record<string, unknown>) ?? {});
    if (!result.ok) {
      return {
        content: [{ type: "text", text: result.error }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result.result, null, 2) }],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
