#!/usr/bin/env node
/**
 * webmcp-codegen's command line.
 *
 * Design goals, in order:
 *   1. The default output is the summary you need, not a log dump.
 *   2. Every line earns its place; if it doesn't help you decide, it's gone.
 *   3. The next step is always visible, never assumed.
 *   4. Beautiful enough that developers screenshot it.
 *
 * Commands:
 *   webmcp-codegen            the interactive dashboard (same as `dev`)
 *   webmcp-codegen generate   write tool files from your spec
 *   webmcp-codegen init       write a codegen.config.mjs for full control
 *   webmcp-codegen --help     detailed help with examples
 *
 * Zero dependencies: argument parsing is Node's util.parseArgs, output is
 * ANSI escapes we control character by character.
 */

import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { dim, renderSummary, renderVerbose } from "./cli-output.js";
import { CONFIG_FILE_NAMES, loadConfig } from "./config.js";
import { saveDataFile } from "./data-file.js";
import { findSpecs } from "./detect.js";
import { startDevServer } from "./dev/server.js";
import { resolveLlmProvider, runLlmLayer } from "./llm.js";
import { runGenerate } from "./pipeline.js";
import { resolveSetup } from "./setup.js";
import { schemaExportsToJson } from "./sources/schema.js";
import { applyWiring, planWiring, type WirePlan } from "./wire.js";
import type { CodegenConfig } from "./types.js";

const HELP = `
webmcp-codegen — generate WebMCP tools from your OpenAPI spec

Usage
  npx @webmcp-stack/codegen [command] [flags]

Commands
  generate    Generate tool files from your spec (default when no command given)
  dev         Open the tools dashboard (list, describe, toggle, test)
  init        Write a codegen.config.mjs for full control

Flags
  --spec PATH    Which OpenAPI spec to use (auto-detected when omitted)
  --out DIR      Where tool files go (default: your web app's src/webmcp)
  --dry-run      Preview what would be written, write nothing
  --verbose      Show every tool, not just the summary
  --force        Write files even when the audit reports errors
  --skip-audit   Skip the safety report
  --suggest PATH Ask the LLM layer which schemas in PATH are worth declaring
  --config PATH  Use a config file at PATH
  --port N       Dashboard port (default: 4700)
  --help         Show this help

Examples
  npx @webmcp-stack/codegen generate              # detect spec, generate tools
  npx @webmcp-stack/codegen generate --dry-run    # preview without writing
  npx @webmcp-stack/codegen dev                   # open the dashboard
  npx @webmcp-stack/codegen generate --verbose    # see all 72 tools listed

Docs
  https://webmcp-stack.vercel.app/docs
`;

export interface CliFlags {
  dryRun: boolean;
  skipAudit: boolean;
  force: boolean;
  verbose: boolean;
  watch: boolean;
  config?: string;
  spec?: string;
  out?: string;
  port?: number;
  /** `generate --suggest <module>`: LLM proposals for undeclared schemas. */
  suggest?: string;
  help: boolean;
}

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      "skip-audit": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      watch: { type: "boolean", default: false },
      config: { type: "string" },
      spec: { type: "string" },
      out: { type: "string" },
      port: { type: "string" },
      suggest: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });

  const flags: CliFlags = {
    dryRun: values["dry-run"] ?? false,
    skipAudit: values["skip-audit"] ?? false,
    force: values.force ?? false,
    verbose: values.verbose ?? false,
    watch: values.watch ?? false,
    config: values.config,
    spec: values.spec,
    out: values.out,
    port: values.port ? Number.parseInt(values.port, 10) : undefined,
    suggest: values.suggest,
    help: values.help,
  };

  if (flags.help) {
    console.log(HELP);
    return 0;
  }

  const command = positionals[0] ?? "generate";

  switch (command) {
    case "init":
      return init();
    case "dev":
      return dev(flags.port ?? 4700);
    case "generate":
      return flags.suggest !== undefined ? suggest(flags.suggest) : generate(flags);
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      return 1;
  }
}

async function init(): Promise<number> {
  const cwd = process.cwd();
  const configFile = CONFIG_FILE_NAMES[0] ?? "codegen.config.mjs";
  const configPath = join(cwd, configFile);

  if (existsSync(configPath)) {
    console.error(`\n✖ ${configFile} already exists. Nothing to do.\n`);
    return 1;
  }

  const specs = await findSpecs(cwd);
  const specPath = specs.length > 0 ? `./${specs[0]}` : "./openapi.yaml";

  await writeFile(
    configPath,
    `import { defineConfig } from "@webmcp-stack/codegen";
import { openapi } from "@webmcp-stack/codegen/sources";
import { tools } from "@webmcp-stack/codegen/outputs";

export default defineConfig({
  sources: [openapi({ spec: "${specPath}" })],
  outputs: [tools({ outDir: "./src/webmcp" })],
  safety: {
    // Extra field names to treat as PII, on top of the built-in list:
    // piiFields: ["internalId"],
    // Tools to skip entirely (matched against name and route):
    // exclude: ["internal"],
  },
});
`,
  );

  console.log(`\n✔ Wrote ${configFile}\n`);
  console.log("Edit it to add sources, change the output directory, or set safety options.");
  console.log("Docs: https://webmcp-stack.vercel.app/docs/configuration\n");
  return 0;
}

async function dev(port: number): Promise<number> {
  const cwd = process.cwd();
  const server = await startDevServer({ cwd, port, open: true });
  console.log(`\n✔ Dashboard: http://localhost:${port}\n`);
  console.log("List, describe, enable, and test your tools. Ctrl+C to stop.\n");

  await new Promise<void>((resolveExit) => {
    process.on("SIGINT", () => {
      server.close();
      resolveExit();
    });
  });
  return 0;
}

/**
 * `generate --suggest <module>`: the LLM layer's tool-worthiness proposals.
 * A proposal surface only: it reads a schema module, asks, and prints. Nothing
 * is declared, generated, or written; declaring is the developer's edit.
 */
async function suggest(modulePath: string): Promise<number> {
  const cwd = process.cwd();

  // The llm settings live in the config when there is one. A missing config is
  // fine here: --suggest is itself the explicit opt-in, so env keys are enough.
  let llm: CodegenConfig["llm"];
  try {
    llm = (await loadConfig(cwd)).config.llm;
  } catch {
    llm = undefined;
  }
  const provider = resolveLlmProvider(llm ?? {});
  if (!provider) {
    console.log(
      "\n◦ The LLM layer is off: no provider configured and no WEBMCP_LLM_API_KEY / " +
        "OPENAI_API_KEY in the environment. Nothing proposed.\n",
    );
    return 0;
  }

  const moduleExports = await importSchemaModule(cwd, modulePath);
  const { schemas, skipped } = schemaExportsToJson(moduleExports, cwd);
  for (const entry of skipped) {
    console.log(dim(`  skipped ${entry.name}: ${entry.reason}`));
  }
  if (schemas.length === 0) {
    console.log(`\n◦ No Standard Schema exports found in ${modulePath}. Nothing to propose on.\n`);
    return 0;
  }

  const suggestions = await runLlmLayer(
    { sources: [], outputs: [], llm: llm ?? {} },
    { tools: [], findings: [], suggestExports: schemas },
  );

  console.log("");
  if (suggestions.length === 0) {
    console.log("  ◦ The provider had no proposals. Declare schemas by hand, as usual.");
  }
  for (const suggestion of suggestions) {
    console.log(`  ◦ ${suggestion.message}`);
  }
  console.log(
    dim("\n  Proposals only; nothing was written. Declare what you want in codegen.config.mjs.\n"),
  );
  return 0;
}

/**
 * Load a user module for --suggest. TypeScript loads only via Node's native
 * type stripping (22.18+ / 23.6+): the leaning choice from the spec, kept as
 * the single code path so the CLI stays zero-dependency. The tradeoff lives
 * here on purpose: older runtimes and extensionless barrel imports get a
 * clear, actionable error instead of a second loader.
 */
async function importSchemaModule(
  cwd: string,
  modulePath: string,
): Promise<Record<string, unknown>> {
  const absolute = resolve(cwd, modulePath);
  try {
    return (await import(pathToFileURL(absolute).href)) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Could not load "${modulePath}". If it is TypeScript, run on Node 22.18+ (or 23.6+) ` +
        "and import the schema file directly (explicit .ts extension; extensionless barrel " +
        "re-exports need a bundler), or point --suggest at a plain-JS module.\n" +
        `Underlying error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function generate(flags: CliFlags): Promise<number> {  const cwd = process.cwd();
  const setup = await resolveSetup(cwd, {
    dryRun: flags.dryRun,
    skipAudit: flags.skipAudit,
    force: flags.force,
    watch: flags.watch,
    spec: flags.spec,
    out: flags.out,
    configPath: flags.config,
  });

  const result = await runGenerate(setup.config, {
    cwd,
    dryRun: flags.dryRun,
    force: flags.force,
    skipAudit: flags.skipAudit,
  });

  // Registration wiring: additive, idempotent, and only for real runs.
  let wiring: WirePlan | null = null;
  if (!result.blocked && setup.app) {
    const outDir = setup.config.outputs[0]?.outDir;
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

  if (flags.verbose) {
    renderVerbose(result, setup, cwd);
  } else {
    renderSummary(result, setup, cwd, wiring);
  }

  if (flags.watch && !flags.dryRun) {
    // TODO: implement watch mode
    console.log(dim("\n  --watch is not implemented yet. Run generate again after changes.\n"));
  }

  return result.blocked ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error("\n✖ Unexpected error:", error instanceof Error ? error.message : error);
    console.error("\nPlease report this: https://github.com/SouravInsights/webmcp-stack/issues\n");
    process.exit(1);
  },
);
