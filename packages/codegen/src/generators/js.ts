/**
 * The `js` generator, named after what lands in your repo: plain JavaScript/
 * TypeScript files that call the spec's imperative API
 * (`document.modelContext.registerTool`).
 *
 * Output layout for `js({ outDir: "./src/webmcp" })`:
 *
 *   src/webmcp/
 *   ├── runtime.webmcp.ts          ← fully generated, never edit
 *   ├── index.ts                   ← fully generated, registers everything
 *   ├── get-order-status.webmcp.ts ← generated contract + YOUR execute()
 *   └── ...
 *
 * Each per-tool file has two regions, divided by marker comments:
 *
 *   generated region   schema, input type, tool definition, register()
 *   ── end generated ── everything below survives regeneration
 *   your region        execute(), scaffolded once, then owned by you
 *
 * This file contains only the *file mechanics*: which files exist, and how to
 * update them without destroying hand-written code. The text of the generated
 * code itself lives in js-templates.ts, keeping "what the output looks like"
 * separate from "how files get written" is what keeps both readable.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { GeneratedFile, ReviewedTool, ToolGenerator } from "../types.js";
import {
  barrelSource,
  generatedRegion,
  ownedRegionScaffold,
  runtimeSource,
} from "./js-templates.js";

export interface JsGeneratorOptions {
  /** Where the tool files go, relative to the project root. */
  outDir: string;
}

/**
 * The marker lines that split a per-tool file in two. They are the merge
 * contract: we may rewrite everything up to and including GENERATED_END,
 * and we must never touch anything after it. js-templates.ts imports these
 * so the marker text is defined in exactly one place.
 */
export const GENERATED_START = "// ─── webmcp-codegen: generated. Do not edit this region. ───";
export const GENERATED_END =
  "// ─── webmcp-codegen: end generated. Your code below survives regeneration. ───";

/** Create the `js` generator for the config's `generate` array. */
export function js(options: JsGeneratorOptions): ToolGenerator {
  return {
    kind: "js",
    async generate(tools, cwd) {
      const outDir = join(cwd, options.outDir);
      const files: GeneratedFile[] = [];

      // The runtime and the barrel are regenerated wholesale every run;
      // their headers say "do not edit", and we mean it.
      files.push(await plainFile(join(outDir, "runtime.webmcp.ts"), runtimeSource()));
      files.push(await plainFile(join(outDir, "index.ts"), barrelSource(tools)));

      for (const tool of tools) {
        files.push(await toolFile(tool, outDir));
      }
      return files;
    },
  };
}

/** A fully-generated file: create if missing, overwrite if changed, skip if same. */
async function plainFile(path: string, contents: string): Promise<GeneratedFile> {
  try {
    const existing = await readFile(path, "utf8");
    return { path, contents, action: existing === contents ? "unchanged" : "update" };
  } catch {
    return { path, contents, action: "create" };
  }
}

/**
 * Build (or merge) one per-tool file. The only I/O here is reading the
 * existing file to check for a hand-written region worth keeping.
 */
async function toolFile(tool: ReviewedTool, outDir: string): Promise<GeneratedFile> {
  const path = join(outDir, `${tool.name}.webmcp.ts`);
  const head = generatedRegion(tool);

  let existing: string | undefined;
  try {
    existing = await readFile(path, "utf8");
  } catch {
    // No file yet: brand new tool, so we also lay down the execute() scaffold.
    return { path, contents: `${head}\n${ownedRegionScaffold(tool)}`, action: "create" };
  }

  const markerIndex = existing.indexOf(GENERATED_END);
  if (markerIndex === -1) {
    // Someone removed the markers or hand-wrote this path from scratch.
    // Never clobber their work: report a conflict and let the pipeline put
    // our version in a `.new` sibling for a human to merge.
    return { path, contents: existing, action: "unchanged", conflict: `${path}.new` };
  }

  // Keep everything the developer wrote below the marker, word for word.
  const preservedTail = existing.slice(markerIndex + GENERATED_END.length);
  const contents = head + preservedTail;
  return { path, contents, action: contents === existing ? "unchanged" : "update" };
}
