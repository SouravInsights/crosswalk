/** JSON Schema object describing a tool's input. Kept loose on purpose. */
export type InputSchema = Record<string, unknown>;

export interface ToolDefinition {
  /** Tool name as exposed to agents, e.g. "getCartState". */
  name: string;
  /** One or two sentences an agent reads to decide when to call this. */
  description: string;
  /** JSON Schema for the tool's arguments. Omit for zero-arg tools. */
  inputSchema?: InputSchema;
  /** True when the tool cannot mutate app state (observables). */
  readOnly: boolean;
  /** The implementation. Result must be JSON-serializable. */
  execute: (args: Record<string, unknown>) => unknown | Promise<unknown>;
}

export interface ToolInfo {
  name: string;
  description: string;
  inputSchema?: InputSchema;
  readOnly: boolean;
}

export type ToolCallResult = { ok: true; result: unknown } | { ok: false; error: string };

export interface GroundstateOptions {
  /** Shown to agents in tool descriptions, e.g. "beenthere". */
  appName?: string;
}

/** Removes a previously registered tool. */
export type Unregister = () => void;

/**
 * Minimal shape of the WebMCP model context API. The spec moved from
 * navigator.modelContext to document.modelContext in the July 2026 draft;
 * we adapt to either and stay tolerant of shape drift.
 */
export interface ModelContextLike {
  registerTool?: (tool: {
    name: string;
    description: string;
    inputSchema?: InputSchema;
    execute: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  }) => unknown;
  unregisterTool?: (name: string) => unknown;
}

/** The window binding the bridge talks to over CDP. */
export interface GroundstateWindowBinding {
  version: string;
  appName?: string;
  list: () => ToolInfo[];
  call: (name: string, args?: Record<string, unknown>) => Promise<ToolCallResult>;
}

declare global {
  interface Window {
    __GROUNDSTATE__?: GroundstateWindowBinding;
  }
  interface Document {
    modelContext?: ModelContextLike;
  }
  interface Navigator {
    modelContext?: ModelContextLike;
  }
}
