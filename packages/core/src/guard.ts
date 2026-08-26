/**
 * Production guard.
 *
 * Groundstate exposes internal state and MUTATING actions to agents. That is
 * only acceptable in dev/preview environments, so init() refuses to start in
 * anything that looks like production. There is deliberately no override flag.
 */

interface EnvLike {
  PROD?: boolean;
  MODE?: string;
  NODE_ENV?: string;
}

function readImportMetaEnv(): EnvLike | undefined {
  try {
    // Vite (and vite-compatible bundlers) define import.meta.env; elsewhere
    // this is just an undefined property read.
    return (import.meta as unknown as { env?: EnvLike }).env;
  } catch {
    return undefined;
  }
}

function readNodeEnv(): string | undefined {
  try {
    // Bundlers statically replace process.env.NODE_ENV; in plain Node it
    // resolves at runtime. Guard against `process` not existing in browsers.
    return typeof process !== "undefined" ? process.env?.NODE_ENV : undefined;
  } catch {
    return undefined;
  }
}

export function isProductionEnvironment(): boolean {
  const metaEnv = readImportMetaEnv();
  if (metaEnv?.PROD === true) return true;
  if (metaEnv?.MODE === "production") return true;
  if (readNodeEnv() === "production") return true;
  return false;
}

export class GroundstateProductionError extends Error {
  constructor() {
    super(
      "Groundstate refused to initialize: this looks like a production build. " +
        "Groundstate exposes internal app state and mutating actions to agents and must " +
        "only run in dev/preview environments. Exclude the init() call from production " +
        "bundles (e.g. `if (import.meta.env.DEV) { ... }`).",
    );
    this.name = "GroundstateProductionError";
  }
}
