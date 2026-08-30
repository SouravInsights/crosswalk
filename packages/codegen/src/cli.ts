#!/usr/bin/env node

/**
 * The webmcp-codegen CLI.
 *
 * The path we optimize for is the zero-everything first run:
 *
 *   npx webmcp-codegen generate
 *
 * No install, no config file, no flags. The CLI finds your API spec, finds
 * the package that is your web app, writes working tools into it, wires the
 * registration into your app's entry file, and tells you how to see it all
 * working. Choices we had to ask for are remembered in .webmcp-codegen.json
 * so we never ask twice.
 *
 * When you outgrow the defaults:
 *
 *   --spec/--out    quick overrides without a config file
 *   init            writes codegen.config.mjs for full control (needs the
 *                   package installed, since the config imports from it)
 *
 * Plus the flags you'd expect on a codegen tool: --dry-run to preview,
 * --watch to re-run on change, --skip-audit to bypass the safety report,
 * --force to write through audit errors, --config to point at a config
 * file somewhere else.
 */

import { existsSync, watch } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { CONFIG_FILE_NAMES, loadConfig } from "./config.js";
import { loadDataFile, saveDataFile } from "./data-file.js";
import { findSpecs } from "./detect.js";
import { js } from "./generators/js.js";
import { type GenerateResult, runGenerate } from "./pipeline.js";
import { type GenerateFlags, resolveSetup, type Setup } from "./setup.js";
import { openapi } from "./sources/openapi.js";
import type { CodegenConfig, ReviewedTool } from "./types.js";
import { applyWiring, planWiring, type WirePlan } from "./wire.js";

const HELP = `webmcp-codegen: generate WebMCP tools from the API contracts you already have

Fastest start (no install, no config):
  npx webmcp-codegen generate --dry-run   Detect your spec, preview the tools
  npx webmcp-codegen generate             Write the tool files, wire them up

Commands:
  init                         Write a codegen.config.mjs for full control
  generate                     Generate (or update) your WebMCP tools
  generate --watch             Re-generate when files change
  dev                          Open the tools dashboard (list, edit, try tools)

Flags for generate:
  --spec PATH    Which OpenAPI spec to use (auto-detected when omitted)
  --out DIR      Where the tool files go (default: your web app's src/webmcp)
  --dry-run      Preview what would be written, write nothing
  --skip-audit   Skip the safety report
  --force        Write files even when the audit reports errors
  --config PATH  Use a config file at PATH

Flags for dev:
  --port N       Dashboard port (default: 4700)
`;

const CONFIG_FILE = "codegen.config.mjs";

/** How many tools to list before folding the rest into a count. */
const MAX_LISTED_TOOLS = 15;

async function main(): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      "skip-audit": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      watch: { type: "boolean", default: false },
      config: { type: "string" },
      spec: { type: "string" },
      out: { type: "string" },
      port: { type: "string" },
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
    case "dev":
      return dev(Number.parseInt(values.port ?? "4700", 10));
    case "generate":
      return generate({
        dryRun: values["dry-run"],
        skipAudit: values["skip-audit"],
        force: values.force,
        watch: values.watch,
        configPath: values.config,
        spec: values.spec,
        out: values.out,
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
    console.error(`${CONFIG_FILE} already exists. Nothing to do.`);
    return 1;
  }

  const specs = await findSpecs(cwd);
  const specPath = specs.length > 0 ? `./${specs[0]}` : "./openapi.yaml";

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

  // The config imports from the package, so keeping it means installing it.
  console.log("Installed the package? A config file needs it:");
  console.log("  npm install -D webmcp-codegen\n");
  if (specs.length > 0) {
    console.log(`Found ${specs[0]}. Wrote ${CONFIG_FILE}.`);
    console.log("\nNext: npx webmcp-codegen generate --dry-run");
  } else {
    console.log(`No OpenAPI spec found, so ${CONFIG_FILE} points at ./openapi.yaml.`);
    console.log("Edit the `spec` path to point at your spec, then run:");
    console.log("\n  npx webmcp-codegen generate --dry-run");
  }
  return 0;
}

async function generate(flags: GenerateFlags): Promise<number> {
  const cwd = process.cwd();

  if (flags.watch) {
    // Watch mode never exits; it re-runs generate on every relevant change.
    // Wiring is idempotent, so it is part of every pass and quietly no-ops
    // after the first.
    await watchLoop(cwd, flags);
    return 0;
  }

  const result = await runOnce(cwd, flags);
  return result.blocked ? 1 : 0;
}

/** One generate pass: resolve setup, run the pipeline, wire, report. */
async function runOnce(cwd: string, flags: GenerateFlags): Promise<GenerateResult> {
  const setup = await resolveSetup(cwd, flags);
  const data = await loadDataFile(cwd);
  const result = await runGenerate(setup.config, {
    cwd,
    dryRun: flags.dryRun,
    skipAudit: flags.skipAudit,
    force: flags.force,
    overrides: data.overrides,
  });

  // Registration wiring: additive, idempotent, and only for real runs.
  let wiring: WirePlan | null = null;
  if (!result.blocked && setup.app) {
    const outDir = findOutDir(setup.config);
    if (outDir) {
      wiring = await planWiring(cwd, setup.app, outDir);
      if (wiring && wiring.edits.length > 0 && !flags.dryRun && result.wrote) {
        await applyWiring(wiring);
      }
    }
  }

  // Remember the choices detection made, so the next run never re-asks.
  if (!setup.fromConfigFile && !flags.dryRun && result.wrote) {
    await saveDataFile(cwd, setup.remember);
  }

  printReport(result, flags, setup, wiring, cwd);
  return result;
}

/** Pull the outDir back out of the resolved config (there is one generator). */
function findOutDir(config: CodegenConfig): string | undefined {
  return config.generate[0]?.outDir;
}

/**
 * The report is the product's voice: plain language, no jargon, one line per
 * file, findings grouped by severity, and a summary that says what happens
 * next — including the one command's worth of "try it" at the end.
 */
function printReport(
  result: GenerateResult,
  flags: GenerateFlags,
  setup: Setup,
  wiring: WirePlan | null,
  cwd: string,
): void {
  const { tools, skipped, findings, files, notes, blocked } = result;

  console.log(`\nwebmcp-codegen (${setup.label}): ${tools.length} tool(s)`);

  for (const note of notes) {
    console.log(`\n  note: ${note}`);
  }

  if (skipped.length > 0) {
    console.log(`\n  ${skipped.length} endpoint(s) skipped:`);
    for (const entry of skipped) {
      console.log(`    ${entry.ref}: ${entry.reason}`);
    }
  }

  console.log("");
  const listed = tools.slice(0, MAX_LISTED_TOOLS);
  for (const tool of listed) {
    const state = tool.enabledByDefault ? "" : "  starts disabled";
    console.log(`  ${tool.name}  [${tool.sideEffect}]${state}  ← ${tool.source.ref}`);
  }
  if (tools.length > listed.length) {
    console.log(`  …and ${tools.length - listed.length} more`);
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

  if (wiring) {
    if (wiring.alreadyWired) {
      console.log("\n  registration: already wired into your app");
    } else if (wiring.edits.length > 0) {
      console.log(flags.dryRun ? "\n  registration (would do):" : "\n  registration:");
      for (const edit of wiring.edits) {
        console.log(`    ${edit.summary}`);
      }
      if (!flags.dryRun) {
        console.log("    undo: delete the added lines (nothing else was touched)");
      }
    }
  } else if (!blocked && setup.app) {
    console.log("\n  registration: could not find your app's entry file, so add this by hand:");
    console.log('    import { registerAllTools } from "<path-to>/src/webmcp";');
    console.log("    void registerAllTools();");
  }

  if (blocked) {
    console.log(
      "\nGeneration blocked by audit errors. Fix them, or re-run with --force to write anyway.",
    );
    return;
  }
  if (flags.dryRun) {
    console.log("\nDry run: nothing written. Re-run without --dry-run to write these files.");
    return;
  }

  printNextSteps(result);
}

/**
 * The parting message. The read tools already work; the mutations are one
 * uncomment away; and we end with the single most convincing thing a new
 * user can do: watch an agent call their app.
 */
function printNextSteps(result: GenerateResult): void {
  const enabled = result.tools.filter((tool) => tool.enabledByDefault);
  const disabled = result.tools.filter((tool) => !tool.enabledByDefault);

  const parts: string[] = [];
  if (enabled.length > 0) parts.push(`${enabled.length} read tool(s) work out of the box`);
  if (disabled.length > 0) {
    parts.push(`${disabled.length} tool(s) start disabled (open the file and uncomment to enable)`);
  }
  console.log(`\nDone. ${parts.join("; ")}.`);

  const suggestion = pickSuggestedTool(result.tools);
  console.log("\nTry it:");
  console.log("  1. Start your app and open it in Chrome.");
  console.log("  2. Turn on chrome://flags/#enable-webmcp-testing and reload the page.");
  if (suggestion) {
    console.log(`  3. Ask the agent: "${suggestion}"`);
  } else {
    console.log("  3. Ask the agent to use one of your tools.");
  }
}

/**
 * The example request in the "try it" line. Pick an enabled read tool —
 * preferably one whose name sounds like listing or looking something up —
 * and phrase it the way a user would say it, from the spec's own description.
 */
function pickSuggestedTool(tools: ReviewedTool[]): string | undefined {
  const reads = tools.filter((tool) => tool.enabledByDefault && tool.endpointRole === "endpoint");
  if (reads.length === 0) return undefined;
  const tool =
    reads.find((candidate) => /^(list|get|search|find|fetch|recent)-/.test(candidate.name)) ??
    reads[0];
  if (!tool) return undefined;

  const description = tool.description.trim().replace(/\.$/, "");
  // A template description ("GET /v1/trips") would read as jargon; fall back
  // to the tool name in words ("list trips").
  const looksTemplated = /^(GET|POST|PUT|PATCH|DELETE)\s/.test(description);
  const phrase = looksTemplated
    ? tool.name.replace(/-/g, " ")
    : description.charAt(0).toLowerCase() + description.slice(1);
  return phrase;
}

/**
 * The tools dashboard: a local control panel for what was generated.
 * Runs until Ctrl+C; nothing is written to the app, ever.
 */
async function dev(port: number): Promise<number> {
  const { startDevServer } = await import("./dev/server.js");
  const server = await startDevServer({ cwd: process.cwd(), port });
  console.log(`\nwebmcp-codegen dashboard: http://localhost:${port}`);
  console.log("List, describe, enable, and try your tools. Ctrl+C to stop.\n");

  await new Promise<void>((resolveExit) => {
    process.on("SIGINT", () => {
      server.close();
      resolveExit();
    });
  });
  return 0;
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
    // Only source-ish changes are worth regenerating for. Never react to our
    // own outputs (generated files, the data file) or watch mode loops.
    if (/node_modules|\.git|\/dist|\/src\/webmcp|\.webmcp-codegen\.json/.test(filename)) return;
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
