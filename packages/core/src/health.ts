import type { ToolRegistry } from "./registry.js";
import type { ToolInfo } from "./types.js";

export interface ToolHealth {
  name: string;
  readOnly: boolean;
  /** Read-only tools are executed; mutating tools are presence-checked only. */
  checked: boolean;
  ok: boolean;
  error?: string;
}

export interface HealthReport {
  version: string;
  appName?: string;
  tools: ToolHealth[];
  fixtures: string[];
  recordedSources: string[];
  healthy: boolean;
}

/**
 * The answer to tool rot: execute every read-only tool and report which ones
 * still work. A selector broken by a store refactor fails HERE, loudly,
 * instead of silently feeding an agent garbage.
 */
export async function runHealthCheck(
  registry: ToolRegistry,
  meta: {
    version: string;
    appName?: string;
    fixtures: string[];
    recordedSources: string[];
  },
): Promise<HealthReport> {
  const tools: ToolHealth[] = [];
  for (const info of registry.list()) {
    if (info.name === "getGroundstateHealth") continue;
    if (!info.readOnly) {
      tools.push({ name: info.name, readOnly: false, checked: false, ok: true });
      continue;
    }
    const result = await registry.call(info.name, defaultArgsFor(info));
    tools.push({
      name: info.name,
      readOnly: true,
      checked: true,
      ok: result.ok,
      error: result.ok ? undefined : result.error,
    });
  }
  return {
    version: meta.version,
    appName: meta.appName,
    tools,
    fixtures: meta.fixtures,
    recordedSources: meta.recordedSources,
    healthy: tools.every((t) => t.ok),
  };
}

function defaultArgsFor(info: ToolInfo): Record<string, unknown> {
  // Read-only built-ins with optional args run fine with none.
  void info;
  return {};
}
