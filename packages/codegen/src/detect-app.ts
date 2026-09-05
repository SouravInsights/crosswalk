/**
 * Web-app detection: where the generated tools should live.
 *
 * The tools are browser code, so they belong in whichever package *is* the
 * web app — not next to the spec, and not wherever the command happened to
 * run. In a monorepo like:
 *
 *   apps/
 *   ├── server/   (has the openapi.json)
 *   └── web/      (has next in its package.json)   ← tools go here
 *
 * detection means reading package.json files and looking for a browser
 * framework. One candidate: we use it and say so. Several: the CLI asks
 * once and remembers the answer in .webmcp-codegen.json.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface WebApp {
  /** Package directory relative to the project root, e.g. "apps/web". */
  dir: string;
  framework: "next" | "vite-react" | "nuxt" | "sveltekit" | "unknown";
}

/**
 * Schema-module discovery for --suggest, mirroring findSpecs. Nobody should
 * have to pass a file path to get proposals: we scan for modules that look
 * like schema definitions, in the places they conventionally live. Returns
 * module paths relative to cwd, likeliest first.
 */
const SCHEMA_MODULE_NAMES = /schemas?|models?|types|validation/i;
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".next", "build", "out", "coverage"]);

export async function findSchemaModules(cwd: string): Promise<string[]> {
  const found: string[] = [];
  // Conventional homes first, so a monorepo's shared package wins over a
  // deeply nested app file.
  for (const base of ["packages", "src", "apps", "lib", "."]) {
    await scanDir(join(cwd, base), base === "." ? "" : base, 0);
  }
  return [...new Set(found)];

  async function scanDir(abs: string, rel: string, depth: number): Promise<void> {
    if (depth > 4) return;
    let entries: import("node:fs").Dirent[];
    try {
      entries = await readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await scanDir(join(abs, entry.name), entryRel, depth + 1);
      } else if (/\.(ts|mts|js|mjs)$/.test(entry.name) && SCHEMA_MODULE_NAMES.test(entry.name)) {
        found.push(entryRel);
      }
    }
  }
}

/** The validation libraries the schema source can read. */
const SCHEMA_LIBS = ["zod", "valibot", "arktype", "typebox"] as const;

/**
 * Which schema libraries the project already uses, by reading every workspace
 * package.json. `init` uses this to scaffold the schema source only when it
 * is real for the project; a suggestion for a library nobody has installed
 * would be noise.
 */
export async function findSchemaLibraries(cwd: string): Promise<string[]> {
  const found = new Set<string>();
  for (const dir of await findPackageDirs(cwd)) {
    const pkg = await readPackageJson(join(cwd, dir));
    if (!pkg) continue;
    const deps = {
      ...(pkg.dependencies as Record<string, string> | undefined),
      ...(pkg.devDependencies as Record<string, string> | undefined),
    };
    for (const lib of SCHEMA_LIBS) {
      if (deps[lib]) found.add(lib);
    }
  }
  return [...found];
}

/** The frameworks we recognize, best-supported first. */
const FRAMEWORKS: { dep: string; framework: WebApp["framework"] }[] = [
  { dep: "next", framework: "next" },
  { dep: "nuxt", framework: "nuxt" },
  { dep: "@sveltejs/kit", framework: "sveltekit" },
];

/**
 * Find web apps in the project. Returns candidates with the likeliest first
 * (a known framework beats "has react", an app named "web" beats "admin").
 */
export async function findWebApps(cwd: string): Promise<WebApp[]> {
  const packageDirs = await findPackageDirs(cwd);
  const apps: WebApp[] = [];

  for (const dir of packageDirs) {
    const pkg = await readPackageJson(join(cwd, dir));
    if (!pkg) continue;
    const deps = {
      ...(pkg.dependencies as Record<string, string> | undefined),
      ...(pkg.devDependencies as Record<string, string> | undefined),
    };
    const known = FRAMEWORKS.find(({ dep }) => deps[dep]);
    // A bare react+vite pair is a Vite SPA; react alone is too weak a signal.
    const framework =
      known?.framework ?? (deps.react && deps.vite ? ("vite-react" as const) : undefined);
    if (framework) apps.push({ dir, framework });
  }

  // Prefer known frameworks, then the package literally named like the app.
  return apps.sort((a, b) => score(b) - score(a));

  function score(app: WebApp): number {
    return (
      (app.framework === "unknown" ? 0 : 10) +
      (/(^|\/)(web|app|frontend|client)$/.test(app.dir) ? 2 : 0)
    );
  }
}

/** Every directory holding a package.json, root first. */
async function findPackageDirs(cwd: string): Promise<string[]> {
  const dirs: string[] = [];
  const root = await readPackageJson(join(cwd, ""));
  if (root) {
    dirs.push(".");
    for (const pattern of await workspaceGlobs(cwd, root)) {
      dirs.push(...(await expandShallowGlob(cwd, pattern)));
    }
  }
  return [...new Set(dirs)];
}

/** Workspace globs from package.json workspaces or pnpm-workspace.yaml. */
async function workspaceGlobs(cwd: string, rootPkg: Record<string, unknown>): Promise<string[]> {
  const workspaces = rootPkg.workspaces;
  if (Array.isArray(workspaces)) return workspaces as string[];
  if (
    workspaces &&
    typeof workspaces === "object" &&
    Array.isArray((workspaces as { packages?: unknown }).packages)
  ) {
    return (workspaces as { packages: string[] }).packages;
  }
  // pnpm monorepos: parse the "packages:" list out of pnpm-workspace.yaml.
  // Kept deliberately shallow: we only support single-star globs anyway.
  return readPnpmWorkspaceGlobs(cwd);
}

async function readPnpmWorkspaceGlobs(cwd: string): Promise<string[]> {
  try {
    const text = await readFile(join(cwd, "pnpm-workspace.yaml"), "utf8");
    const packagesBlock = /^packages:\s*\n((?:\s+-\s+.+\n?)+)/m.exec(text);
    if (!packagesBlock) return [];
    return [...(packagesBlock[1] as string).matchAll(/^\s+-\s+['"]?([^'"\n]+?)['"]?\s*$/gm)].map(
      (match) => match[1] as string,
    );
  } catch {
    return [];
  }
}

/**
 * Expand a workspace glob, but only one star deep ("apps/*"). Deep globs
 * ("packages/**") are truncated at the first star; a monorepo app is never
 * buried deeper than that in practice.
 */
async function expandShallowGlob(cwd: string, pattern: string): Promise<string[]> {
  const starAt = pattern.indexOf("*");
  const base = starAt === -1 ? pattern : pattern.slice(0, starAt).replace(/\/$/, "");
  if (starAt === -1) return [base];
  try {
    const entries = await readdir(join(cwd, base), { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => `${base}/${entry.name}`);
  } catch {
    return [];
  }
}

async function readPackageJson(dir: string): Promise<Record<string, unknown> | undefined> {
  try {
    return JSON.parse(await readFile(join(dir, "package.json"), "utf8")) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}
