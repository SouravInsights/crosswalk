import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findWebApps } from "./detect-app.js";

/** Write a minimal package.json at the given directory. */
async function packageJson(root: string, dir: string, pkg: Record<string, unknown>): Promise<void> {
  await mkdir(join(root, dir), { recursive: true });
  await writeFile(join(root, dir, "package.json"), JSON.stringify(pkg));
}

describe("findWebApps", () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "webmcp-codegen-app-"));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it("finds the web app in a pnpm monorepo, not the API package", async () => {
    await packageJson(cwd, "", { name: "root", private: true });
    await writeFile(
      join(cwd, "pnpm-workspace.yaml"),
      "packages:\n  - 'apps/*'\n  - 'packages/*'\n",
    );
    await packageJson(cwd, "apps/server", {
      name: "server",
      dependencies: { hono: "^4" },
    });
    await packageJson(cwd, "apps/web", {
      name: "web",
      dependencies: { next: "^15", react: "^19" },
    });
    await packageJson(cwd, "packages/sdk", {
      name: "sdk",
      dependencies: { zod: "^4" },
    });

    const apps = await findWebApps(cwd);
    expect(apps).toHaveLength(1);
    expect(apps[0]).toEqual({ dir: "apps/web", framework: "next" });
  });

  it("detects a Vite React app from the react+vite pair", async () => {
    await packageJson(cwd, "", { name: "root", private: true, workspaces: ["frontend"] });
    await packageJson(cwd, "frontend", {
      name: "frontend",
      dependencies: { react: "^19" },
      devDependencies: { vite: "^7" },
    });

    const apps = await findWebApps(cwd);
    expect(apps[0]).toEqual({ dir: "frontend", framework: "vite-react" });
  });

  it("recognizes a single-package app at the root", async () => {
    await packageJson(cwd, "", { name: "my-app", dependencies: { next: "^15" } });

    const apps = await findWebApps(cwd);
    expect(apps[0]).toEqual({ dir: ".", framework: "next" });
  });

  it("returns nothing for a backend-only repo", async () => {
    await packageJson(cwd, "", { name: "api", dependencies: { hono: "^4" } });

    expect(await findWebApps(cwd)).toEqual([]);
  });
});
