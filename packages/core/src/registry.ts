import type { ToolCallResult, ToolDefinition, ToolInfo, Unregister } from "./types.js";

const TOOL_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

/**
 * The canonical tool registry. Native WebMCP registration (when available)
 * is additive on top of this — the bridge and the inspector both read from
 * here via the window binding, so Groundstate works with or without native
 * browser support.
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): Unregister {
    if (!TOOL_NAME_PATTERN.test(tool.name)) {
      throw new Error(
        `Invalid tool name "${tool.name}": use letters, digits, "_" or "-", starting with a letter.`,
      );
    }
    if (this.tools.has(tool.name)) {
      throw new Error(
        `A tool named "${tool.name}" is already registered. Tool names must be unique.`,
      );
    }
    this.tools.set(tool.name, tool);
    return () => {
      this.tools.delete(tool.name);
    };
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): ToolInfo[] {
    return [...this.tools.values()].map(({ name, description, inputSchema, readOnly }) => ({
      name,
      description,
      inputSchema,
      readOnly,
    }));
  }

  async call(name: string, args: Record<string, unknown> = {}): Promise<ToolCallResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      const known = this.list()
        .map((t) => t.name)
        .join(", ");
      return { ok: false, error: `Unknown tool "${name}". Registered tools: ${known || "none"}.` };
    }
    try {
      const raw = await tool.execute(args);
      return { ok: true, result: toJsonSafe(raw, name) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  clear(): void {
    this.tools.clear();
  }
}

/**
 * Results cross a serialization boundary (WebMCP / CDP), so enforce
 * JSON-safety here with an actionable error instead of a cryptic one later.
 */
function toJsonSafe(value: unknown, toolName: string): unknown {
  if (value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    throw new Error(
      `Tool "${toolName}" returned a value that is not JSON-serializable. ` +
        "Return plain data (objects, arrays, primitives) — not class instances, functions, or cyclic structures.",
    );
  }
}
