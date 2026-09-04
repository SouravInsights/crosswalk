/**
 * Setup resolution: where the tools come from and where they go.
 *
 * Shared by the CLI (`generate`) and the dev dashboard (`dev`), so both see
 * the same project the same way:
 *
 *   1. a config file (codegen.config.mjs or --config) for full control
 *   2. --spec/--out flags as quick overrides, no config needed
 *   3. remembered choices from .webmcp-codegen.json
 *   4. auto-detection: the spec by filename, the web app by its package.json
 *
 * Branches 2-4 build the config right here, which is what makes
 * `npx @webmcp-stack/codegen generate` work without installing the package: the
 * user's project never has to resolve a webmcp-codegen import.
 */

import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { CONFIG_FILE_NAMES, loadConfig } from "./config.js";
import { loadDataFile } from "./data-file.js";
import { findSpecs } from "./detect.js";
import { findWebApps, type WebApp } from "./detect-app.js";
import { tools } from "./outputs/tools.js";
import { openapi } from "./sources/openapi.js";
import type { CodegenConfig } from "./types.js";

export interface GenerateFlags {
  dryRun: boolean;
  skipAudit: boolean;
  force: boolean;
  watch: boolean;
  configPath?: string;
  spec?: string;
  out?: string;
}

export interface Setup {
  config: CodegenConfig;
  label: string;
  /** The web app we detected (when detection ran). Drives placement + wiring. */
  app?: WebApp;
  /** True when the config came from a config file rather than detection. */
  fromConfigFile: boolean;
  /** Choices to remember in .webmcp-codegen.json after a successful run. */
  remember: { spec?: string; app?: string };
}

/**
 * Where the tools come from and where they go, in priority order:
 *
 *   1. a config file (codegen.config.mjs or --config) for full control
 *   2. --spec/--out flags as quick overrides, no config needed
 *   3. remembered choices from .webmcp-codegen.json
 *   4. auto-detection: the spec by filename, the web app by its package.json
 *
 * Branches 2-4 build the config right here inside the CLI, which is what
 * makes `npx @webmcp-stack/codegen generate` work without installing the package:
 * the user's project never has to resolve a webmcp-codegen import.
 */
export async function resolveSetup(cwd: string, flags: GenerateFlags): Promise<Setup> {
  const hasConfigFile = flags.configPath
    ? existsSync(join(cwd, flags.configPath))
    : CONFIG_FILE_NAMES.some((name) => existsSync(join(cwd, name)));

  if (hasConfigFile) {
    const { config, path } = await loadConfig(cwd, flags.configPath);
    if (flags.spec || flags.out) {
      console.warn(`Note: --spec/--out are ignored; ${basename(path)} is in charge here.`);
    }
    // Wiring still works with a config file if we can find the app.
    const data = await loadDataFile(cwd);
    const apps = await findWebApps(cwd);
    const app = apps.find((candidate) => candidate.dir === data.app) ?? apps[0];
    return { config, label: basename(path), app, fromConfigFile: true, remember: {} };
  }
  if (flags.configPath) {
    throw new Error(`No config file at "${flags.configPath}".`);
  }

  const data = await loadDataFile(cwd);

  // The spec: flag wins, then the remembered choice, then detection.
  const spec = flags.spec ?? data.spec ?? (await detectSpec(cwd));

  // The web app: detection decides placement. Only asked once; the answer
  // is remembered in .webmcp-codegen.json.
  let app: WebApp | undefined;
  if (!flags.out) {
    const apps = await findWebApps(cwd);
    const remembered = apps.find((candidate) => candidate.dir === data.app);
    if (remembered) {
      app = remembered;
    } else if (apps.length === 1) {
      app = apps[0];
      console.log(`Found your web app: ${app?.dir} (${app?.framework})`);
    } else if (apps.length > 1) {
      app = await askWhichApp(apps);
    }
  }

  const outDir = flags.out ?? (app && app.dir !== "." ? `${app.dir}/src/webmcp` : "./src/webmcp");
  return {
    config: { sources: [openapi({ spec })], outputs: [tools({ outDir })] },
    label: flags.spec ? `--spec ${spec}` : `detected ${spec}`,
    app,
    fromConfigFile: false,
    remember: { spec, app: app?.dir },
  };
}

/**
 * The one question this CLI asks. Several packages look like the web app;
 * a human picks, and .webmcp-codegen.json remembers it. Non-interactive
 * shells (CI) get the best guess with a note, never a hang.
 */
async function askWhichApp(apps: WebApp[]): Promise<WebApp> {
  if (!process.stdin.isTTY) {
    const first = apps[0] as WebApp;
    console.log(`Several packages look like web apps; using ${first.dir}. Override with --out.`);
    return first;
  }
  console.log("Several packages look like the web app. Which one should the tools live in?");
  apps.forEach((app, index) => {
    console.log(`  ${index + 1}. ${app.dir} (${app.framework})${index === 0 ? "  [default]" : ""}`);
  });
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question("Choice [1]: ");
    const picked = Number.parseInt(answer.trim() || "1", 10);
    return apps[picked - 1] ?? (apps[0] as WebApp);
  } finally {
    rl.close();
  }
}

/**
 * Find the project's API spec. One candidate: use it and say so. Several:
 * list them and make the human pick. None: say exactly what to do next.
 */
async function detectSpec(cwd: string): Promise<string> {
  const specs = await findSpecs(cwd);

  if (specs.length === 0) {
    throw new Error(
      "No OpenAPI spec found in this project.\n" +
        "Point at one:  npx @webmcp-stack/codegen generate --spec path/to/openapi.json",
    );
  }
  if (specs.length > 1) {
    const list = specs.map((spec) => `  - ${spec}`).join("\n");
    throw new Error(
      `Found ${specs.length} API specs:\n${list}\n\n` +
        `Pick one:  npx @webmcp-stack/codegen generate --spec ${specs[0]}`,
    );
  }

  console.log(`Detected ${specs[0]} (override with --spec)`);
  return specs[0] as string;
}
