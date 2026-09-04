import { describe, expect, it } from "vitest";
import { mergeSchemaWithOperations } from "./merge.js";
import type { CandidateTool } from "./types.js";

function openapiCandidate(overrides: Partial<CandidateTool> = {}): CandidateTool {
  return {
    id: "POST /v1/trips",
    name: "create-trip",
    source: { kind: "openapi", ref: "POST /v1/trips" },
    operationId: "createTrip",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string" } },
      required: ["title"],
    },
    outputSchema: { type: "object", properties: { id: { type: "string" } } },
    inputTypeName: "CreateTripInput",
    httpMethod: "POST",
    pathTemplate: "/v1/trips",
    paramLocations: { path: [], query: [], body: ["title"] },
    serverUrl: "https://api.example.com",
    sideEffect: "unknown",
    requiresAuth: true,
    description: "Create a trip.",
    descriptionSource: "openapi-summary",
    ...overrides,
  };
}

function schemaCandidate(overrides: Partial<CandidateTool> = {}): CandidateTool {
  return {
    id: "schema:create-trip",
    name: "create-trip",
    source: { kind: "schema", ref: "create-trip" },
    operationId: "createTrip",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string", maxLength: 40 } },
      required: ["title"],
    },
    inputTypeName: "",
    sideEffect: "unknown",
    requiresAuth: false,
    description: "Create a trip and open it in the editor.",
    descriptionSource: "declared",
    ...overrides,
  };
}

describe("mergeSchemaWithOperations", () => {
  it("fuses a schema entry with its operation into one tool", () => {
    const { tools, findings } = mergeSchemaWithOperations([
      openapiCandidate(),
      schemaCandidate(),
    ]);

    expect(findings).toEqual([]);
    expect(tools).toHaveLength(1);

    const merged = tools[0]!;
    // The schema owns the contract and the words.
    expect(merged.inputSchema.properties?.title?.maxLength).toBe(40);
    expect(merged.description).toBe("Create a trip and open it in the editor.");
    expect(merged.descriptionSource).toBe("declared");
    // The spec owns the endpoint mechanics.
    expect(merged.httpMethod).toBe("POST");
    expect(merged.pathTemplate).toBe("/v1/trips");
    expect(merged.requiresAuth).toBe(true);
    expect(merged.outputSchema).toEqual({ type: "object", properties: { id: { type: "string" } } });
    // Provenance: both halves stay visible.
    expect(merged.source).toEqual({ kind: "schema", ref: "create-trip" });
    expect(merged.endpointRef).toBe("POST /v1/trips");
  });

  it("keeps the spec's description when the schema carries none", () => {
    const { tools } = mergeSchemaWithOperations([
      openapiCandidate(),
      schemaCandidate({ description: "create-trip", descriptionSource: "generated-template" }),
    ]);
    expect(tools[0]?.description).toBe("Create a trip.");
    expect(tools[0]?.descriptionSource).toBe("openapi-summary");
  });

  it("errors loudly when the named operation does not exist", () => {
    const { tools, findings } = mergeSchemaWithOperations([
      openapiCandidate({ operationId: "somethingElse" }),
      schemaCandidate(),
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.level).toBe("error");
    expect(findings[0]?.message).toContain('"createTrip"');
    // The entry still flows through as standalone, so the report shows
    // everything at once; the error is what blocks the write.
    expect(tools.some((tool) => tool.source.kind === "schema")).toBe(true);
  });

  it("leaves schema entries without an operation untouched", () => {
    const standalone = schemaCandidate({ operationId: undefined });
    const { tools, findings } = mergeSchemaWithOperations([openapiCandidate(), standalone]);
    expect(findings).toEqual([]);
    expect(tools).toHaveLength(2);
  });

  it("carries the form pointer through the fusion", () => {
    const { tools } = mergeSchemaWithOperations([
      openapiCandidate(),
      schemaCandidate({ form: { path: "./src/components/CreateTripCard.tsx" } }),
    ]);
    expect(tools[0]?.form).toEqual({ path: "./src/components/CreateTripCard.tsx" });
  });
});
