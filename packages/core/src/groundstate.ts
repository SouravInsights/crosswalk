import { GroundstateProductionError, isProductionEnvironment } from "./guard.js";
import { ToolRegistry } from "./registry.js";
import { registerNative } from "./transport.js";
import type { GroundstateOptions, InputSchema, ToolDefinition, Unregister } from "./types.js";

export const VERSION = "0.0.1";

interface FixtureEntry {
  description: string;
  setup: () => unknown | Promise<unknown>;
}

const registry = new ToolRegistry();
const fixtures = new Map<string, FixtureEntry>();

let initialized = false;
let options: GroundstateOptions = {};
let fixtureToolsRegistered = false;

/**
 * Initialize Groundstate. Call once, from dev/preview builds only —
 * throws GroundstateProductionError if this looks like production.
 */
export function init(opts: GroundstateOptions = {}): void {
  if (isProductionEnvironment()) {
    throw new GroundstateProductionError();
  }
  if (initialized) return;
  initialized = true;
  options = opts;

  if (typeof window !== "undefined") {
    window.__GROUNDSTATE__ = {
      version: VERSION,
      appName: options.appName,
      list: () => registry.list(),
      call: (name, args) => registry.call(name, args ?? {}),
    };
  }
}

function assertInitialized(method: string): void {
  if (!initialized) {
    throw new Error(
      `groundstate.${method}() called before init(). Call groundstate.init() once at app startup (dev builds only).`,
    );
  }
}

function registerEverywhere(tool: ToolDefinition): Unregister {
  const unregisterLocal = registry.register(tool);
  const unregisterNative = registerNative(tool);
  return () => {
    unregisterLocal();
    unregisterNative();
  };
}

function pascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export interface ObserveOptions {
  description?: string;
}

/**
 * Register an observable: a read-only view of real app state.
 * Exposed to agents as `get<Name>State`. The selector runs at call time,
 * so the result is always live — no re-registration needed.
 */
export function observe(
  name: string,
  selector: () => unknown,
  opts: ObserveOptions = {},
): Unregister {
  assertInitialized("observe");
  const toolName = `get${pascalCase(name)}State`;
  return registerEverywhere({
    name: toolName,
    description:
      opts.description ??
      `Returns the live "${name}" state of the app${options.appName ? ` (${options.appName})` : ""}, straight from its internal store. Ground truth — not inferred from the DOM.`,
    readOnly: true,
    execute: () => selector(),
  });
}

export interface ActOptions {
  description?: string;
  inputSchema?: InputSchema;
}

/**
 * Register an action: a developer-blessed operation an agent may perform,
 * e.g. `submitCheckoutWithCard`. Keep actions small and explicit.
 */
export function act(
  name: string,
  fn: (args: Record<string, unknown>) => unknown | Promise<unknown>,
  opts: ActOptions = {},
): Unregister {
  assertInitialized("act");
  return registerEverywhere({
    name,
    description: opts.description ?? `Performs the "${name}" action in the running app.`,
    inputSchema: opts.inputSchema,
    readOnly: false,
    execute: fn,
  });
}

export interface FixtureOptions {
  description?: string;
}

/**
 * Register a named fixture: a one-call jump to a known app state
 * ("cart_with_declined_card"). Served through the shared `loadFixture` and
 * `listFixtures` tools, which are registered on first use.
 */
export function fixture(
  name: string,
  setup: () => unknown | Promise<unknown>,
  opts: FixtureOptions = {},
): Unregister {
  assertInitialized("fixture");
  if (fixtures.has(name)) {
    throw new Error(
      `A fixture named "${name}" is already registered. Fixture names must be unique.`,
    );
  }
  fixtures.set(name, {
    description: opts.description ?? `Puts the app into the "${name}" state.`,
    setup,
  });
  ensureFixtureTools();
  return () => {
    fixtures.delete(name);
  };
}

function ensureFixtureTools(): void {
  if (fixtureToolsRegistered) return;
  fixtureToolsRegistered = true;

  registerEverywhere({
    name: "listFixtures",
    description:
      "Lists the named app states this app can jump to via loadFixture, with descriptions.",
    readOnly: true,
    execute: () =>
      [...fixtures.entries()].map(([name, f]) => ({ name, description: f.description })),
  });

  registerEverywhere({
    name: "loadFixture",
    description:
      "Puts the running app into a named, known state in one call — no UI interaction needed. Use listFixtures to see what is available.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Fixture name from listFixtures." },
      },
      required: ["name"],
    },
    readOnly: false,
    execute: async (args) => {
      const name = typeof args.name === "string" ? args.name : "";
      const entry = fixtures.get(name);
      if (!entry) {
        const known = [...fixtures.keys()].join(", ");
        throw new Error(`Unknown fixture "${name}". Available fixtures: ${known || "none"}.`);
      }
      await entry.setup();
      return { loaded: name };
    },
  });
}

/**
 * Register the app's way back to its baseline — its ground state.
 * Exposed to agents as `resetToGroundState`.
 */
export function reset(fn: () => unknown | Promise<unknown>): Unregister {
  assertInitialized("reset");
  return registerEverywhere({
    name: "resetToGroundState",
    description: "Resets the app to its known baseline state (its ground state).",
    readOnly: false,
    execute: async () => {
      await fn();
      return { reset: true };
    },
  });
}

/** Currently registered tools — used by the inspector and in tests. */
export function listTools() {
  return registry.list();
}

/** Test-only: wipe all state so each test starts clean. */
export function __resetForTests(): void {
  registry.clear();
  fixtures.clear();
  initialized = false;
  fixtureToolsRegistered = false;
  options = {};
  if (typeof window !== "undefined") {
    window.__GROUNDSTATE__ = undefined;
  }
}
