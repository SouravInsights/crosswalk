/**
 * Config: `defineConfig` for authoring, `loadConfig` for the CLI.
 *
 * Config files are plain JavaScript (`codegen.config.mjs`) so the CLI can
 * load them with a plain dynamic import. No TypeScript loader, no build
 * step, no extra dependencies. If you want types while authoring, that is
 * what `defineConfig` is for:
 *
 *   import { defineConfig } from "@webmcp-stack/codegen";
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
    let module: { default?: unknown };
    try {
      module = (await import(pathToFileURL(candidate).href)) as { default?: unknown };
    } catch (error) {
      throw new Error(withLoadingGuidance(candidate, error));
    }
    const config = module.default;
    if (!isCodegenConfig(config)) {
      throw new Error(
        `${candidate} must default-export defineConfig({ sources: [...], outputs: [...] }).`,
      );
    }
    return { config, path: candidate };
  }

  throw new Error(
    explicitPath
      ? `No config file at "${explicitPath}".`
      : `No codegen.config.mjs found in ${cwd}. Run \`npx @webmcp-stack/codegen init\` to create one.`,
  );
}

/**
 * Config imports can pull in the app's TypeScript (schema modules). Node's
 * native type stripping (22.18+ / 23.6+) is the only TS loader this CLI
 * ships; anything else gets the recourse spelled out instead of a stack
 * trace. The tradeoff is deliberate: zero dependencies over a bundled loader.
 */
function withLoadingGuidance(candidate: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  // A 0.4 config fails at import time: the /generators subpath no longer
  // exists. Say what changed and the exact fix; never "please report this".
  if (message.includes("./generators")) {
    return (
      `Failed to load ${candidate}: it imports "@webmcp-stack/codegen/generators", removed in 0.5.\n` +
      "Three edits:\n" +
      '  1. import from "@webmcp-stack/codegen/outputs" instead\n' +
      "  2. rename `js(...)` to `tools(...)`\n" +
      "  3. rename the `generate: [...]` key to `outputs: [...]`"
    );
  }
  const looksLikeTs = /\.ts\b|unknown file extension/i.test(message);
  if (!looksLikeTs) return `Failed to load ${candidate}: ${message}`;
  return (
    `Failed to load ${candidate}: it (or something it imports) is TypeScript this runtime cannot load.\n` +
    "Run on Node 22.18+ (or 23.6+), which loads TypeScript natively, and import schema files directly\n" +
    "(explicit .ts extension; extensionless barrel re-exports need a bundler), or use plain JS modules.\n" +
    `Underlying error: ${message}`
  );
}

/** The lightest possible shape check: a clear error beats deep validation. */
function isCodegenConfig(value: unknown): value is CodegenConfig {
  if (value === null || typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  // 0.4 configs used `generate:` and the /generators subpath. Renamed in 0.5.
  // Fail loud with the exact fix rather than a confusing "not a config" error;
  // there is no silent dual support, by design.
  if (Array.isArray(config.generate) && !Array.isArray(config.outputs)) {
    throw new Error(
      "This config uses `generate: [...]`, renamed in 0.5. Three edits:\n" +
        "  1. rename the key to `outputs: [...]`\n" +
        '  2. import from "@webmcp-stack/codegen/outputs" instead of "/generators"\n' +
        "  3. rename `js(...)` to `tools(...)`",
    );
  }
  return Array.isArray(config.sources) && Array.isArray(config.outputs);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
