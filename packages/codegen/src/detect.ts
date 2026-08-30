/**
 * Spec auto-detection — the reason `npx webmcp-codegen generate` works with
 * zero arguments, zero config, and zero install.
 *
 * The rule is deliberately boring: walk the project (skipping the obvious
 * noise), recognize the usual spec filenames, and return what we find
 * shallowest-first. When exactly one spec exists we just use it; the CLI
 * layer decides what to do about zero or several.
 */

import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

/** Filenames we recognize as API specs. */
export const SPEC_FILE_PATTERN = /^(openapi|swagger|api)\.(ya?ml|json)$/i;

/** Directories never worth descending into. */
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".turbo",
  ".next",
  "dist",
  "build",
  "coverage",
]);

/**
 * How deep we look. Enough for monorepo layouts like
 * apps/server/openapi/openapi.json (depth 3) without wandering forever.
 */
const MAX_DEPTH = 5;

/**
 * Find API spec files under `cwd`, returned as paths relative to `cwd`,
 * shallowest first — a root-level spec is a likelier intent than one
 * buried six folders deep.
 */
export async function findSpecs(cwd: string): Promise<string[]> {
  const found: { path: string; depth: number }[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH) return;
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // Unreadable directory — skip it, never die on detection.
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) await walk(join(dir, entry.name), depth + 1);
      } else if (SPEC_FILE_PATTERN.test(entry.name)) {
        found.push({ path: join(dir, entry.name), depth });
      }
    }
  }

  await walk(cwd, 0);
  return found.sort((a, b) => a.depth - b.depth).map((entry) => relative(cwd, entry.path));
}
