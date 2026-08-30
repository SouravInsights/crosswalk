import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ReviewedTool } from "../types.js";
import { js } from "./js.js";

/** A small reviewed tool, as the safety layer would have produced it. */
function reviewedTool(overrides: Partial<ReviewedTool> = {}): ReviewedTool {
  return {
    id: "GET /orders/{id}",
    name: "get-order-status",
    source: { kind: "openapi", ref: "GET /orders/{id}" },
    inputSchema: {
      type: "object",
      properties: { orderId: { type: "string", description: "The order ID" } },
      required: ["orderId"],
    },
    inputTypeName: "GetOrderStatusInput",
    httpMethod: "GET",
    pathTemplate: "/orders/{orderId}",
    paramLocations: { path: ["orderId"], query: [], body: [] },
    sideEffect: "read",
    endpointRole: "endpoint",
    enabledByDefault: true,
    requiresAuth: false,
    description: "Returns the current status and tracking info for an order by ID.",
    descriptionSource: "openapi-summary",
    riskTier: "safe-read",
    hints: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    piiInOutput: [],
    ...overrides,
  };
}

/** Write a run's files to disk, so the next run sees them as "existing". */
async function writeAll(files: { path: string; contents: string }[]): Promise<void> {
  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.contents);
  }
}

describe("js generator", () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "webmcp-codegen-js-"));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it("emits a runtime, a barrel, and one file per tool", async () => {
    const files = await js({ outDir: "src/webmcp" }).generate([reviewedTool()], cwd);
    const paths = files.map((file) => file.path);
    expect(paths).toContain(join(cwd, "src/webmcp/runtime.webmcp.ts"));
    expect(paths).toContain(join(cwd, "src/webmcp/index.ts"));
    expect(paths).toContain(join(cwd, "src/webmcp/get-order-status.webmcp.ts"));
  });

  it("generated tool files carry the contract and the merge markers", async () => {
    const files = await js({ outDir: "src/webmcp" }).generate([reviewedTool()], cwd);
    const tool = files.find((file) => file.path.includes("get-order-status"));
    expect(tool?.action).toBe("create");
    expect(tool?.contents).toContain('name: "get-order-status"');
    expect(tool?.contents).toContain("Do not edit this region");
    expect(tool?.contents).toContain("Your code below survives regeneration");
    expect(tool?.contents).toContain("export type GetOrderStatusInput");
    expect(tool?.contents).toContain("executeGetOrderStatus");
    // The agent-facing schema must never contain an unresolved $ref.
    expect(tool?.contents).not.toContain("$ref");
  });

  it("keeps the developer's execute() across regenerations", async () => {
    const generator = js({ outDir: "src/webmcp" });
    const toolPath = join(cwd, "src/webmcp/get-order-status.webmcp.ts");

    // First run creates the file; then the developer edits execute().
    const first = await generator.generate([reviewedTool()], cwd);
    await writeAll(first);
    const before = await readFile(toolPath, "utf8");
    const implemented = before.replace(
      "return toolResult(data);",
      'return { content: [{ type: "text", text: "Status: shipped" }] }; // my hand-written code',
    );
    await writeFile(toolPath, implemented);

    // Second run, with a changed description (the API contract evolved).
    const second = await generator.generate(
      [reviewedTool({ description: "Get an order's live status." })],
      cwd,
    );
    const updated = second.find((file) => file.path === toolPath);
    expect(updated?.action).toBe("update");
    // The contract was regenerated...
    expect(updated?.contents).toContain("Get an order's live status.");
    // ...but the hand-written execute() survived, word for word.
    expect(updated?.contents).toContain("my hand-written code");
  });

  it("read tools are born with a working request, not a TODO", async () => {
    const files = await js({ outDir: "src/webmcp" }).generate([reviewedTool()], cwd);
    const tool = files.find((file) => file.path.includes("get-order-status"));
    // The scaffold calls the real endpoint with the path param interpolated.
    // biome-ignore lint/suspicious/noTemplateCurlyInString: asserting on generated source, which contains a template literal
    expect(tool?.contents).toContain("await callApi(`/orders/${input.orderId}`");
    expect(tool?.contents).toContain('"GET"');
    expect(tool?.contents).not.toContain("Not implemented");
    expect(tool?.contents).not.toContain("toolDisabled(");
  });

  it("mutations start disabled, with working code one uncomment away", async () => {
    const files = await js({ outDir: "src/webmcp" }).generate(
      [
        reviewedTool({
          name: "cancel-order",
          inputTypeName: "CancelOrderInput",
          httpMethod: "POST",
          pathTemplate: "/orders/{orderId}/cancel",
          sideEffect: "destructive",
          endpointRole: "endpoint",
          enabledByDefault: false,
          riskTier: "destructive-confirm",
          hints: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
        }),
      ],
      cwd,
    );
    const tool = files.find((file) => file.path.includes("cancel-order"));
    // Disabled notice first, the working call right below it, commented out.
    expect(tool?.contents).toContain('return toolDisabled("cancel-order.webmcp.ts");');
    // biome-ignore lint/suspicious/noTemplateCurlyInString: asserting on generated source, which contains a template literal
    expect(tool?.contents).toContain(
      "// const data = await callApi(`/orders/${input.orderId}/cancel`",
    );
    // The consent gate is generated, not left as a comment for humans to remember.
    expect(tool?.contents).toContain("requestUserConfirmation(");
    expect(tool?.contents).toContain("The user declined this action.");
  });

  it("builds query strings and JSON bodies from the param locations", async () => {
    const files = await js({ outDir: "src/webmcp" }).generate(
      [
        reviewedTool({
          name: "search-assets",
          inputTypeName: "SearchAssetsInput",
          httpMethod: "POST",
          pathTemplate: "/search",
          paramLocations: { path: [], query: ["limit"], body: ["query", "tags"] },
        }),
      ],
      cwd,
    );
    const tool = files.find((file) => file.path.includes("search-assets"));
    expect(tool?.contents).toContain(
      'callApi("/search", { method: "POST", query: { limit: input.limit }, body: { query: input.query, tags: input.tags } })',
    );
  });

  it("falls back to an honest TODO when the source knows no route", async () => {
    const files = await js({ outDir: "src/webmcp" }).generate(
      [reviewedTool({ httpMethod: undefined, pathTemplate: undefined, paramLocations: undefined })],
      cwd,
    );
    const tool = files.find((file) => file.path.includes("get-order-status"));
    expect(tool?.contents).toContain("TODO: call your app's existing code here");
  });

  it("never clobbers a file whose markers were removed; it reports a conflict", async () => {
    const generator = js({ outDir: "src/webmcp" });
    const toolPath = join(cwd, "src/webmcp/get-order-status.webmcp.ts");
    await mkdir(join(cwd, "src/webmcp"), { recursive: true });
    await writeFile(toolPath, "// my totally hand-written file, no markers\n");

    const files = await generator.generate([reviewedTool()], cwd);
    const conflicted = files.find((file) => file.path === toolPath);
    expect(conflicted?.conflict).toBe(`${toolPath}.new`);
    // The existing file's contents are reported back untouched.
    expect(conflicted?.contents).toContain("my totally hand-written file");
  });

  it("scaffolds a PII notice for tools whose responses carry PII", async () => {
    const files = await js({ outDir: "src/webmcp" }).generate(
      [
        reviewedTool({
          name: "get-me",
          inputTypeName: "GetMeInput",
          pathTemplate: "/me",
          paramLocations: { path: [], query: [], body: [] },
          piiInOutput: ["user.email"],
        }),
      ],
      cwd,
    );
    const tool = files.find((file) => file.path.includes("get-me"));
    expect(tool?.contents).toContain("user.email");
  });

  it("reports unchanged when nothing about the contract moved", async () => {
    const generator = js({ outDir: "src/webmcp" });
    await writeAll(await generator.generate([reviewedTool()], cwd));

    const second = await generator.generate([reviewedTool()], cwd);
    const toolFile = second.find((file) => file.path.includes("get-order-status"));
    expect(toolFile?.action).toBe("unchanged");
  });
});
