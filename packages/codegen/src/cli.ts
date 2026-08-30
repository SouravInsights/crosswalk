#!/usr/bin/env node

/**
 * The webmcp-codegen CLI.
 *
 * Deliberately three commands, learnable in one sitting:
 *
 *   webmcp-codegen init       detect your API spec, write codegen.config.mjs
 *   webmcp-codegen generate   run the pipeline, write the files
 *   webmcp-codegen generate --watch   re-run when source files change
 *
 * Plus the flags you'd expect on a codegen tool: --dry-run to preview,
 * --skip-audit to bypass the safety report, --force to write through
 * audit errors, --config to point at a config file somewhere else.
 */

import { existsSync, watch } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { parseArgs } from "node:util";
import { loadConfig } from "./config.js";
import { type GenerateResult, runGenerate } from "./pipeline.js";

const HELP = `webmcp-codegen — generate WebMCP tools from the API contracts you already have

Usage:
  webmcp-codegen init                  Detect your spec and write codegen.config.mjs
  webmcp-codegen generate              Generate (or update) your WebMCP tools
  webmcp-codegen generate --watch      Re-generate when files change

Flags for generate:
  --dry-run      Preview what would be written, write nothing
  --skip-audit   Skip the safety report
  --force        Write files even when the audit reports errors
  --config PATH  Use a config file at PATH
`;

const CONFIG_FILE = "codegen.config.mjs";

/** Spec filenames we recognize during `init`, most common first. */
const SPEC_FILE_PATTERN = /^(openapi|swagger|api)\.(ya?ml|json)$/i;

async function main(): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      "skip-audit": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      watch: { type: "boolean", default: false },
      config: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });

  const command = positionals[0];
  if (values.help || !command) {
    console.log(HELP);
    return 0;
  }

  switch (command) {
    case "init":
      return init();
    case "generate":
      return generate({
        dryRun: values["dry-run"],
        skipAudit: values["skip-audit"],
        force: values.force,
        watch: values.watch,
        configPath: values.config,
      });
    default:
      console.error(`Unknown command "${command}".\n`);
      console.log(HELP);
      return 1;
  }
}

/** Detect the project's API spec and write a starter config. */
async function init(): Promise<number> {
  const cwd = process.cwd();
  const configPath = join(cwd, CONFIG_FILE);

  if (existsSync(configPath)) {
    console.error(`${CONFIG_FILE} already exists — nothing to do.`);
    return 1;
  }

  const specFile = (await readdir(cwd)).find((name) => SPEC_FILE_PATTERN.test(name));
  const specPath = specFile ? `./${specFile}` : "./openapi.yaml";

  await writeFile(
    configPath,
    `import { defineConfig } from "webmcp-codegen";
import { openapi } from "webmcp-codegen/sources";
import { js } from "webmcp-codegen/generators";

export default defineConfig({
  sources: [openapi({ spec: "${specPath}" })],
  generate: [js({ outDir: "./src/webmcp" })],
  safety: {
    // Extra field names to treat as PII, on top of the built-in list:
    // piiFields: ["internalId"],
    // Tools to skip entirely (matched against name and route):
    // exclude: ["internal"],
  },
});
`,
  );

  if (specFile) {
    console.log(`Found ${specFile} — wrote ${CONFIG_FILE}.`);
    console.log(`\nNext: npx webmcp-codegen generate --dry-run`);
  } else {
    console.log(`No OpenAPI spec found, so ${CONFIG_FILE} points at ./openapi.yaml.`);
    console.log("Edit the `spec` path to point at your spec, then run:");
    console.log(`\n  npx webmcp-codegen generate --dry-run`);
  }
  return 0;
}

interface GenerateFlags {
  dryRun: boolean;
  skipAudit: boolean;
  force: boolean;
  watch: boolean;
  configPath?: string;
}

async function generate(flags: GenerateFlags): Promise<number> {
  const cwd = process.cwd();

  if (flags.watch) {
    // Watch mode never exits; it re-runs generate on every relevant change.
    await watchLoop(cwd, flags);
    return 0;
  }

  const result = await runOnce(cwd, flags);
  return result.blocked ? 1 : 0;
}

/** One generate pass: load config, run the pipeline, print the report. */
async function runOnce(cwd: string, flags: GenerateFlags): Promise<GenerateResult> {
  const { config, path } = await loadConfig(cwd, flags.configPath);
  const result = await runGenerate(config, {
    cwd,
    dryRun: flags.dryRun,
    skipAudit: flags.skipAudit,
    force: flags.force,
  });
  printReport(result, flags, basename(path), cwd);
  return result;
}

/**
 * The report is the product's voice: plain language, one line per file,
 * findings grouped by severity, and a summary that says what to do next.
 */
function printReport(
  result: GenerateResult,
  flags: GenerateFlags,
  configName: string,
  cwd: string,
): void {
  const { tools, findings, files, blocked } = result;

  console.log(`\nwebmcp-codegen (${configName}) — ${tools.length} tool(s)\n`);

  for (const tool of tools) {
    console.log(`  ${tool.name}  [${tool.riskTier}]  ← ${tool.source.ref}`);
  }

  if (findings.length > 0) {
    console.log("");
    for (const finding of findings) {
      const icon = finding.level === "error" ? "✖" : "⚠";
      const where = finding.tool ? ` (${finding.tool})` : "";
      console.log(`  ${icon} ${finding.message}${where}`);
    }
  }

  if (files.length > 0) {
    console.log("");
    for (const file of files) {
      if (file.action === "unchanged" && !file.conflict) continue;
      const shown = file.conflict
        ? `conflict → wrote ${relative(cwd, file.conflict)}`
        : file.action;
      console.log(`  ${shown}: ${relative(cwd, file.path)}`);
    }
  }

  if (blocked) {
    console.log(
      "\nGeneration blocked by audit errors. Fix them, or re-run with --force to write anyway.",
    );
  } else if (flags.dryRun) {
    console.log("\nDry run — nothing written. Re-run without --dry-run to write these files.");
  } else {
    console.log("\nDone. Fill in each execute() below the marker, then registerAllTools().");
  }
}

/**
 * Re-run generate when anything relevant changes. Node's recursive watcher
 * covers Linux/macOS/Windows on Node 20+, which is our engine floor anyway.
 */
async function watchLoop(cwd: string, flags: GenerateFlags): Promise<void> {
  await runOnce(cwd, { ...flags, dryRun: false });
  console.log("\nWatching for changes… (Ctrl+C to stop)");

  let timer: NodeJS.Timeout | undefined;
  watch(cwd, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    // Only source-ish changes are worth regenerating for.
    if (/node_modules|\.git|\/dist|\/src\/webmcp/.test(filename)) return;
    if (!/\.(ya?ml|json|ts|tsx|mts|mjs)$/.test(filename)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      runOnce(cwd, { ...flags, dryRun: false }).catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
      });
    }, 300);
  });
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
