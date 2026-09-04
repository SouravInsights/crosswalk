import { describe, expect, it } from "vitest";
import { auditTools, findPiiFields, reviewTools } from "./safety.js";
import type { CandidateTool } from "./types.js";

/** A minimal candidate; tests override the two or three fields they care about. */
function candidate(overrides: Partial<CandidateTool>): CandidateTool {
  return {
    id: "GET /x",
    name: "get-x",
    source: { kind: "openapi", ref: "GET /x" },
    inputSchema: { type: "object", properties: {}, required: [] },
    inputTypeName: "GetXInput",
    httpMethod: "GET",
    sideEffect: "unknown",
    requiresAuth: false,
    description: "A fine description",
    descriptionSource: "openapi-summary",
    ...overrides,
  };
}

describe("reviewTools classification", () => {
  it("classifies schema-declared tools (no verb) from the name", () => {
    const { tools } = reviewTools([
      // Reading words are reads, born enabled.
      candidate({ name: "search-places", httpMethod: undefined, source: { kind: "schema", ref: "search-places" } }),
      // An unknown action defaults to write: never silently treated as safe.
      candidate({ name: "create-trip", httpMethod: undefined, source: { kind: "schema", ref: "create-trip" } }),
      candidate({ name: "delete-account", httpMethod: undefined, source: { kind: "schema", ref: "delete-account" } }),
    ]);
    expect(tools.map((tool) => tool.sideEffect)).toEqual(["read", "write", "destructive"]);
    expect(tools.map((tool) => tool.enabledByDefault)).toEqual([true, false, false]);
  });

  it("reads the endpoint ref for merged tools, not the schema ref", () => {
    const { tools } = reviewTools([
      candidate({
        name: "create-trip",
        httpMethod: "POST",
        source: { kind: "schema", ref: "create-trip" },
        endpointRef: "POST /v1/admin/trips",
      }),
    ]);
    expect(tools[0]?.endpointRole).toBe("admin");
  });

  it("classifies by HTTP verb", () => {
    const { tools } = reviewTools([
      candidate({ name: "get-a", httpMethod: "GET" }),
      candidate({ name: "update-a", httpMethod: "PATCH" }),
      candidate({ name: "remove-a", httpMethod: "DELETE" }),
    ]);
    expect(tools.map((tool) => tool.sideEffect)).toEqual(["read", "write", "destructive"]);
    expect(tools.map((tool) => tool.riskTier)).toEqual([
      "safe-read",
      "write-confirm",
      "destructive-confirm",
    ]);
  });

  it("upgrades a POST whose name says it cannot be undone", () => {
    const { tools } = reviewTools([
      candidate({
        name: "cancel-order",
        httpMethod: "POST",
        source: { kind: "openapi", ref: "POST /orders/{id}/cancel" },
      }),
    ]);
    expect(tools[0]?.sideEffect).toBe("destructive");
    expect(tools[0]?.hints.destructiveHint).toBe(true);
  });

  it("treats search-style POSTs as reads, born enabled", () => {
    const { tools } = reviewTools([
      candidate({
        name: "search-assets",
        httpMethod: "POST",
        source: { kind: "openapi", ref: "POST /search" },
      }),
      candidate({
        name: "estimate-price",
        httpMethod: "POST",
        source: { kind: "openapi", ref: "POST /estimate" },
      }),
      candidate({
        name: "create-order",
        httpMethod: "POST",
        source: { kind: "openapi", ref: "POST /orders" },
      }),
    ]);
    expect(tools.map((tool) => tool.sideEffect)).toEqual(["read", "read", "write"]);
    expect(tools.map((tool) => tool.enabledByDefault)).toEqual([true, true, false]);
  });

  it("derives the right hints per verb", () => {
    const { tools } = reviewTools([
      candidate({ name: "get-a", httpMethod: "GET" }),
      candidate({ name: "make-a", httpMethod: "POST" }),
      candidate({ name: "put-a", httpMethod: "PUT" }),
    ]);
    expect(tools[0]?.hints).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    });
    expect(tools[1]?.hints).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false, // POST is never idempotent
    });
    expect(tools[2]?.hints.idempotentHint).toBe(true);
  });

  it("reads start enabled; mutations start disabled", () => {
    const { tools } = reviewTools([
      candidate({ name: "get-a", httpMethod: "GET" }),
      candidate({ name: "update-a", httpMethod: "PATCH" }),
    ]);
    expect(tools.map((tool) => tool.enabledByDefault)).toEqual([true, false]);
  });

  it("skips webhooks entirely and says why", () => {
    const { tools, skipped } = reviewTools([
      candidate({ name: "get-a", httpMethod: "GET" }),
      candidate({
        name: "post-v1-payments-webhook",
        httpMethod: "POST",
        source: { kind: "openapi", ref: "POST /v1/payments/webhook" },
      }),
    ]);
    expect(tools.map((tool) => tool.name)).toEqual(["get-a"]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]?.reason).toContain("webhook");
  });

  it("flags auth and admin endpoints and generates them disabled", () => {
    const { tools } = reviewTools([
      candidate({
        name: "post-auth-signin-otp",
        httpMethod: "POST",
        source: { kind: "openapi", ref: "POST /v1/auth/signin-otp" },
      }),
      candidate({
        name: "get-admin-users",
        httpMethod: "GET",
        source: { kind: "openapi", ref: "GET /v1/admin/users" },
      }),
    ]);
    expect(tools[0]?.endpointRole).toBe("auth");
    expect(tools[1]?.endpointRole).toBe("admin");
    // Even a GET admin endpoint starts disabled.
    expect(tools.map((tool) => tool.enabledByDefault)).toEqual([false, false]);

    const messages = auditTools(tools).map((finding) => finding.message);
    expect(messages.some((message) => message.includes("sign-in or session"))).toBe(true);
    expect(messages.some((message) => message.includes("Admin endpoint"))).toBe(true);
  });

  it("applies config exclusions by name or route, recorded as skipped", () => {
    const { tools, skipped } = reviewTools(
      [
        candidate({ name: "get-public" }),
        candidate({ name: "get-internal", source: { kind: "openapi", ref: "GET /internal" } }),
      ],
      { exclude: ["internal"] },
    );
    expect(tools.map((tool) => tool.name)).toEqual(["get-public"]);
    expect(skipped[0]?.reason).toContain("excluded by config");
  });
});

describe("findPiiFields", () => {
  it("flags PII-looking fields, including nested ones", () => {
    const found = findPiiFields({
      type: "object",
      properties: {
        id: { type: "string" },
        user: {
          type: "object",
          properties: { email: { type: "string" }, cardNumber: { type: "string" } },
        },
      },
    });
    expect(found).toEqual(["user.email", "user.cardNumber"]);
  });

  it("honors team-specific extra fields", () => {
    const found = findPiiFields(
      { type: "object", properties: { internalId: { type: "string" } } },
      ["internalId"],
    );
    expect(found).toEqual(["internalId"]);
  });
});

describe("auditTools", () => {
  // A well-formed read tool has a description and an output schema; anything
  // less earns a warning now.
  const { tools: cleanTools } = reviewTools([
    candidate({
      name: "get-x",
      outputSchema: { type: "object", properties: { ok: { type: "boolean" } } },
    }),
  ]);
  const clean = cleanTools[0];

  it("passes a well-formed read tool quietly", () => {
    expect(auditTools(clean ? [clean] : [])).toEqual([]);
  });

  it("warns when the description is a bare template", () => {
    const { tools } = reviewTools([
      candidate({
        name: "get-y",
        description: "GET /y",
        descriptionSource: "generated-template",
        outputSchema: { type: "object", properties: {} },
      }),
    ]);
    const findings = auditTools(tools);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.level).toBe("warning");
    expect(findings[0]?.message).toContain("no summary in the source");
  });

  it("flags descriptions that instruct the agent instead of describing the tool", () => {
    const { tools } = reviewTools([
      candidate({ name: "get-z", description: "You must always call this before anything else." }),
    ]);
    expect(auditTools(tools)[0]?.message).toContain("instructions to the agent");
  });

  it("errors when a safe verb carries a destructive name", () => {
    const { tools } = reviewTools([
      candidate({
        name: "delete-all",
        httpMethod: "GET",
        source: { kind: "openapi", ref: "GET /all" },
      }),
    ]);
    const findings = auditTools(tools);
    expect(findings.some((finding) => finding.level === "error")).toBe(true);
  });

  it("warns about PII in the response and mutating tools behind auth", () => {
    const { tools } = reviewTools([
      candidate({
        name: "get-me",
        requiresAuth: true,
        httpMethod: "POST",
        source: { kind: "openapi", ref: "POST /me" },
        outputSchema: { type: "object", properties: { email: { type: "string" } } },
      }),
    ]);
    const messages = auditTools(tools).map((finding) => finding.message);
    expect(messages.some((message) => message.includes("email"))).toBe(true);
    expect(messages.some((message) => message.includes("authenticated"))).toBe(true);
  });

  it("warns when a read tool has no output schema", () => {
    const { tools } = reviewTools([candidate({ name: "list-trips" })]);
    const messages = auditTools(tools).map((finding) => finding.message);
    expect(messages.some((message) => message.includes("No output schema"))).toBe(true);
  });

  it("warns when every input field was machine-drafted", () => {
    const { tools } = reviewTools([
      candidate({
        name: "get-x",
        outputSchema: { type: "object", properties: {} },
        inputSchema: {
          type: "object",
          properties: { guests: { type: "number" } },
          required: [],
        },
      }),
    ]);
    tools[0]!.synthesizedFields = ["guests"];
    const messages = auditTools(tools).map((finding) => finding.message);
    expect(messages.some((message) => message.includes("No input field has a description"))).toBe(
      true,
    );
  });

  it("warns when a field points at a producer tool that is not in the run", () => {
    const { tools } = reviewTools([
      candidate({
        name: "create-trip",
        httpMethod: "POST",
        inputSchema: {
          type: "object",
          properties: {
            locationObject: {
              type: "object",
              description: "Resolved place object. Always get this from the search-places tool.",
            },
          },
          required: [],
        },
      }),
    ]);
    const messages = auditTools(tools).map((finding) => finding.message);
    expect(
      messages.some(
        (message) =>
          message.includes('"locationObject"') && message.includes('"search-places"'),
      ),
    ).toBe(true);
  });

  it("stays quiet when the producer tool is declared", () => {
    const { tools } = reviewTools([
      candidate({
        name: "create-trip",
        httpMethod: "POST",
        inputSchema: {
          type: "object",
          properties: {
            locationObject: {
              type: "object",
              description: "Resolved place object. Always get this from the search-places tool.",
            },
          },
          required: [],
        },
      }),
      candidate({ name: "search-places" }),
    ]);
    const messages = auditTools(tools).map((finding) => finding.message);
    expect(messages.some((message) => message.includes('"locationObject"'))).toBe(false);
  });
});

describe("set-level audit", () => {
  function fakeTool(name: string): Parameters<typeof auditTools>[0][number] {
    return {
      id: name,
      name,
      description: `Does ${name}.`,
      descriptionSource: "declared" as const,
      requiresAuth: false,
      inputSchema: { type: "object", properties: {} },
      inputTypeName: "Input",
      sideEffect: "read",
      riskTier: "safe-read",
      enabledByDefault: true,
      endpointRole: "endpoint" as const,
      piiInOutput: [],
      source: { kind: "openapi", ref: `GET /${name}` },
      hints: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      synthesizedFields: [],
    };
  }

  it("warns once when a run exceeds the tool-count soft limit", () => {
    const tools = Array.from({ length: 41 }, (_, i) => fakeTool(`tool-${i}`));
    const findings = auditTools(tools);
    const count = findings.filter((f) => f.message.includes("tools in one surface"));
    expect(count).toHaveLength(1);
    expect(count[0]?.message).toContain("41 tools");
  });

  it("stays quiet at or under the limit", () => {
    const tools = Array.from({ length: 40 }, (_, i) => fakeTool(`tool-${i}`));
    expect(auditTools(tools).filter((f) => f.message.includes("tools in one surface"))).toEqual([]);
  });
});
