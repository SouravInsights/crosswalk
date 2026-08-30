import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { js } from "./generators/js.js";
import { runGenerate } from "./pipeline.js";
import type { CandidateTool, CodegenConfig, Source } from "./types.js";

/** A hand-rolled in-memory source, so pipeline tests need no spec files. */
function manualSource(tools: Partial<CandidateTool>[]): Source {
  return {
    kind: "manual",
    async collect() {
      return tools.map((overrides, index) => ({
        id: `GET /thing-${index}`,
        name: `get-thing-${index}`,
        source: { kind: "manual" as const, ref: `GET /thing-${index}` },
        inputSchema: { type: "object", properties: {}, required: [] },
        inputTypeName: `GetThing${index}Input`,
        httpMethod: "GET" as const,
        sideEffect: "unknown" as const,
        requiresAuth: false,
        description: "A perfectly clear description of this tool.",
        descriptionSource: "openapi-summary" as const,
        ...overrides,
      }));
    },
  };
}

function configWith(sources: Source[]): CodegenConfig {
  return { sources, generate: [js({ outDir: "src/webmcp" })] };
}

describe("runGenerate", () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "webmcp-codegen-pipeline-"));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it("writes files on a clean run", async () => {
    const result = await runGenerate(configWith([manualSource([{}])]), { cwd });
    expect(result.blocked).toBe(false);
    expect(result.wrote).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
  });

  it("writes nothing on a dry run, but still reports what would happen", async () => {
    const result = await runGenerate(configWith([manualSource([{}])]), { cwd, dryRun: true });
    expect(result.wrote).toBe(false);
    expect(result.files.some((file) => file.action === "create")).toBe(true);
  });

  it("blocks writing when the audit reports errors", async () => {
    // A GET named like a delete is the audit's error case.
    const result = await runGenerate(
      configWith([manualSource([{ name: "delete-everything", httpMethod: "GET" }])]),
      { cwd },
    );
    expect(result.blocked).toBe(true);
    expect(result.wrote).toBe(false);
    expect(result.findings.some((finding) => finding.level === "error")).toBe(true);
  });

  it("--force writes through audit errors, but the errors stay in the report", async () => {
    const result = await runGenerate(
      configWith([manualSource([{ name: "delete-everything", httpMethod: "GET" }])]),
      { cwd, force: true },
    );
    expect(result.blocked).toBe(false);
    expect(result.wrote).toBe(true);
    expect(result.findings.some((finding) => finding.level === "error")).toBe(true);
  });

  it("renames colliding tool names instead of overwriting one with the other", async () => {
    const result = await runGenerate(
      configWith([manualSource([{ name: "get-orders" }, { name: "get-orders" }])]),
      { cwd },
    );
    const names = result.tools.map((tool) => tool.name);
    expect(new Set(names).size).toBe(2);
    // And the rename shows up in the report, not silently.
    expect(result.findings.some((finding) => finding.message.includes("Renamed"))).toBe(true);
  });

  it("strips a shared API version prefix from tool names, with a note", async () => {
    const result = await runGenerate(
      configWith([
        manualSource([
          { name: "get-v1-trips" },
          { name: "get-v1-users" },
          { name: "post-v1-trips" },
          { name: "get-v1-trips-id" },
        ]),
      ]),
      { cwd, dryRun: true },
    );
    const names = result.tools.map((tool) => tool.name).sort();
    expect(names).toEqual(["get-trips", "get-trips-id", "get-users", "post-trips"]);
    expect(result.notes.some((note) => note.includes("v1"))).toBe(true);
  });

  it("keeps the version segment when it is not shared across the API", async () => {
    const result = await runGenerate(
      configWith([
        manualSource([
          { name: "get-v1-trips" },
          { name: "get-users" },
          { name: "get-orders" },
          { name: "get-products" },
        ]),
      ]),
      { cwd, dryRun: true },
    );
    expect(result.tools.map((tool) => tool.name)).toContain("get-v1-trips");
    expect(result.notes).toHaveLength(0);
  });

  it("reports skipped endpoints instead of generating them silently", async () => {
    const result = await runGenerate(
      configWith([
        manualSource([
          {},
          {
            name: "post-payments-webhook",
            httpMethod: "POST",
            source: { kind: "manual", ref: "POST /payments/webhook" },
          },
        ]),
      ]),
      { cwd, dryRun: true },
    );
    expect(result.tools).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]?.ref).toBe("POST /payments/webhook");
  });

  it("applies overrides on top of the safety review", async () => {
    const result = await runGenerate(
      configWith([
        manualSource([{ name: "post-orders", httpMethod: "POST", description: "POST /orders" }]),
      ]),
      {
        cwd,
        dryRun: true,
        overrides: {
          "post-orders": { description: "Place a new order for the current cart.", enabled: true },
        },
      },
    );
    const tool = result.tools[0];
    expect(tool?.description).toBe("Place a new order for the current cart.");
    expect(tool?.enabledByDefault).toBe(true);
  });
});
