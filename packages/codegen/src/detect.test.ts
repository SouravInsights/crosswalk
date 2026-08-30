import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findSpecs } from "./detect.js";

/** Tiny helper: create a file (and its parents) inside the fixture dir. */
async function place(root: string, relativePath: string): Promise<void> {
  const full = join(root, relativePath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, "{}");
}

describe("findSpecs", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "webmcp-codegen-detect-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("finds a root-level spec", async () => {
    await place(dir, "openapi.yaml");
    expect(await findSpecs(dir)).toEqual(["openapi.yaml"]);
  });

  it("finds a spec nested in a monorepo layout", async () => {
    await place(dir, "apps/server/openapi/openapi.json");
    expect(await findSpecs(dir)).toEqual(["apps/server/openapi/openapi.json"]);
  });

  it("recognizes the usual spec names, case-insensitively", async () => {
    await place(dir, "a/swagger.json");
    await place(dir, "b/OpenAPI.YML");
    await place(dir, "c/api.yaml");
    const specs = await findSpecs(dir);
    expect(specs).toContain("a/swagger.json");
    expect(specs).toContain("b/OpenAPI.YML");
    expect(specs).toContain("c/api.yaml");
  });

  it("ignores lookalike filenames", async () => {
    await place(dir, "myopenapi.json");
    await place(dir, "openapi.json.bak");
    expect(await findSpecs(dir)).toEqual([]);
  });

  it("never descends into node_modules or build output", async () => {
    await place(dir, "node_modules/some-dep/openapi.json");
    await place(dir, "dist/openapi.json");
    await place(dir, ".git/openapi.json");
    expect(await findSpecs(dir)).toEqual([]);
  });

  it("returns shallowest first", async () => {
    await place(dir, "deep/nested/dir/openapi.json");
    await place(dir, "openapi.json");
    expect(await findSpecs(dir)).toEqual(["openapi.json", "deep/nested/dir/openapi.json"]);
  });

  it("stops looking past the depth limit", async () => {
    // Depth 7 — beyond MAX_DEPTH, and good riddance.
    await place(dir, "a/b/c/d/e/f/g/openapi.json");
    expect(await findSpecs(dir)).toEqual([]);
  });
});
