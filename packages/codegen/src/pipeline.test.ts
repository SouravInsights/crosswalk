import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { tools } from "./outputs/tools.js";
import { openapi } from "./sources/openapi.js";
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
  return { sources, outputs: [tools({ outDir: "src/webmcp" })] };
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

  it("drops the version prefix from route-derived tool names, with a note", async () => {
    // Declared names are never rewritten, so this needs a real spec: version
    // dropping happens when a route becomes a name, not after.
    const spec = {
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      paths: {
        "/v1/trips": { get: { summary: "List trips.", responses: {} } },
        "/v1/trips/{id}": { get: { summary: "Get a trip.", responses: {} } },
      },
    };
    const specPath = join(cwd, "spec.json");
    await writeFile(specPath, JSON.stringify(spec));
    const result = await runGenerate(configWith([openapi({ spec: specPath })]), {
      cwd,
      dryRun: true,
    });
    const names = result.tools.map((tool) => tool.name).sort();
    expect(names).toEqual(["get-trip", "list-trips"]);
    expect(result.notes.some((note) => note.includes("version"))).toBe(true);
  });

  it("never rewrites declared names, even ones that look versioned", async () => {
    const result = await runGenerate(
      configWith([manualSource([{ name: "get-v1-trips" }])]),
      { cwd, dryRun: true },
    );
    expect(result.tools.map((tool) => tool.name)).toContain("get-v1-trips");
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

  it("merges a schema entry with the operation it names, into one tool", async () => {
    const result = await runGenerate(
      configWith([
        manualSource([
          {
            name: "create-trip",
            httpMethod: "POST",
            source: { kind: "openapi", ref: "POST /v1/trips" },
            operationId: "createTrip",
            pathTemplate: "/v1/trips",
          },
          {
            id: "schema:create-trip",
            name: "create-trip",
            source: { kind: "schema", ref: "create-trip" },
            operationId: "createTrip",
            httpMethod: undefined,
            description: "Create a trip and open it in the editor.",
            descriptionSource: "declared",
          },
        ]),
      ]),
      { cwd, dryRun: true },
    );
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]?.description).toBe("Create a trip and open it in the editor.");
    expect(result.tools[0]?.endpointRef).toBe("POST /v1/trips");
    expect(result.tools[0]?.sideEffect).toBe("write");
  });

  it("blocks when a schema entry names an operation the spec does not have", async () => {
    const result = await runGenerate(
      configWith([
        manualSource([
          {
            id: "schema:create-trip",
            name: "create-trip",
            source: { kind: "schema", ref: "create-trip" },
            operationId: "createTrip",
            httpMethod: undefined,
          },
        ]),
      ]),
      { cwd },
    );
    expect(result.blocked).toBe(true);
    expect(result.wrote).toBe(false);
    expect(
      result.findings.some(
        (finding) => finding.level === "error" && finding.message.includes('"createTrip"'),
      ),
    ).toBe(true);
  });

  it("applies field overrides last, and flags overrides that match no field", async () => {
    const result = await runGenerate(
      configWith([
        manualSource([
          {
            name: "create-trip",
            httpMethod: "POST",
            inputSchema: {
              type: "object",
              properties: { title: { type: "string", maxLength: 40 } },
              required: ["title"],
            },
          },
        ]),
      ]),
      {
        cwd,
        dryRun: true,
        overrides: {
          "create-trip": {
            fields: { title: "The trip's name.", locaton: "a typo" },
          },
        },
      },
    );
    const tool = result.tools[0];
    // The override is the final word: no synthesized constraint text appended.
    expect(tool?.inputSchema.properties?.title?.description).toBe("The trip's name.");
    expect(
      result.findings.some(
        (finding) => finding.level === "warning" && finding.message.includes('"locaton"'),
      ),
    ).toBe(true);
  });

  it("synthesizes field text from constraints, and marks it", async () => {
    const result = await runGenerate(
      configWith([
        manualSource([
          {
            name: "log-time",
            httpMethod: "POST",
            inputSchema: {
              type: "object",
              properties: { minutes: { type: "number", minimum: 30, maximum: 600 } },
              required: ["minutes"],
            },
          },
        ]),
      ]),
      { cwd, dryRun: true },
    );
    const tool = result.tools[0];
    expect(tool?.inputSchema.properties?.minutes?.description).toBe(
      "Minutes. A number from 30 to 600.",
    );
    expect(tool?.synthesizedFields).toEqual(["minutes"]);
    // And the audit says so, rather than letting machine text pass silently.
    expect(
      result.findings.some((finding) =>
        finding.message.includes("No input field has a description"),
      ),
    ).toBe(true);
  });

  it("warns when a form pointer has no form output configured, and still writes the tool", async () => {
    const result = await runGenerate(
      configWith([
        manualSource([
          {
            name: "contact",
            httpMethod: "POST",
            form: { path: "./src/components/ContactForm.tsx" },
          },
        ]),
      ]),
      { cwd },
    );
    expect(result.wrote).toBe(true);
    expect(
      result.findings.some(
        (finding) => finding.level === "warning" && finding.message.includes("form"),
      ),
    ).toBe(true);
  });
});
