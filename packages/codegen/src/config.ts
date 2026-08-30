/**
 * Config: `defineConfig` for authoring, `loadConfig` for the CLI.
 *
 * Config files are plain JavaScript (`codegen.config.mjs`) so the CLI can
 * load them with a plain dynamic import — no TypeScript loader, no build
 * step, no extra dependencies. If you want types while authoring, that is
 * what `defineConfig` is for:
 *
 *   import { defineConfig } from "webmcp-codegen";
 *   export default defineConfig({ ... });
 */

import { access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { CodegenConfig } from "./types.js";

/** Identity function whose only job is type-checking the config object. */
export function defineConfig(config: CodegenConfig): CodegenConfig {
  return config;
}

export const CONFIG_FILE_NAMES = ["codegen.config.mjs", "codegen.config.js"];

/**
 * Find and load the config file. Resolving relative to `cwd` keeps the CLI
 * usable from any directory, the same way `eslint -c` behaves.
 */
export async function loadConfig(
  cwd: string,
  explicitPath?: string,
): Promise<{ config: CodegenConfig; path: string }> {
  const candidates = explicitPath
    ? [resolve(cwd, explicitPath)]
    : CONFIG_FILE_NAMES.map((name) => join(cwd, name));

  for (const candidate of candidates) {
    if (!(await exists(candidate))) continue;
    const module = (await import(pathToFileURL(candidate).href)) as { default?: unknown };
    const config = module.default;
    if (!isCodegenConfig(config)) {
      throw new Error(
        `${candidate} must default-export defineConfig({ sources: [...], generate: [...] }).`,
      );
    }
    return { config, path: candidate };
  }

  throw new Error(
    explicitPath
      ? `No config file at "${explicitPath}".`
      : `No codegen.config.mjs found in ${cwd}. Run \`npx webmcp-codegen init\` to create one.`,
  );
}

/** The lightest possible shape check — clear error beats deep validation. */
function isCodegenConfig(value: unknown): value is CodegenConfig {
  if (value === null || typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  return Array.isArray(config.sources) && Array.isArray(config.generate);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
