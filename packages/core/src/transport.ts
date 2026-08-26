import type { ModelContextLike, ToolDefinition, Unregister } from "./types.js";

/**
 * Resolve the native WebMCP model context, if any.
 *
 * Order matters (see AGENTS.md): document.modelContext is the current spec
 * location (July 2026 draft); navigator.modelContext is deprecated but still
 * served by the Chrome origin trial. Feature-detect only — never UA-sniff.
 */
export function getNativeModelContext(): ModelContextLike | undefined {
  if (typeof document !== "undefined" && document.modelContext?.registerTool) {
    return document.modelContext;
  }
  if (typeof navigator !== "undefined" && navigator.modelContext?.registerTool) {
    return navigator.modelContext;
  }
  return undefined;
}

/**
 * Best-effort native registration. The native layer is additive — the
 * canonical registry keeps working when this fails or is absent — so a
 * misbehaving experimental API must never break the app.
 */
export function registerNative(tool: ToolDefinition): Unregister {
  const mc = getNativeModelContext();
  if (!mc?.registerTool) return () => {};
  try {
    mc.registerTool({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute: tool.execute,
    });
  } catch {
    return () => {};
  }
  return () => {
    try {
      mc.unregisterTool?.(tool.name);
    } catch {
      // Tolerate shape drift in the experimental API.
    }
  };
}
