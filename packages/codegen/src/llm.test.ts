import { describe, expect, it } from "vitest";
import { resolveLlmProvider, runLlmLayer } from "./llm.js";
import type { LlmProvider, ReviewedTool } from "./types.js";

/** A provider that records what it was asked and answers per task. */
function mockProvider(answers: Record<string, string> = {}) {
  const calls: { task: string; prompt: string }[] = [];
  const provider: LlmProvider = {
    name: "mock",
    async complete(task, prompt) {
      calls.push({ task, prompt });
      return answers[task] ?? "{}";
    },
  };
  return { provider, calls };
}

function tool(overrides: Partial<ReviewedTool> = {}): ReviewedTool {
  return {
    id: "GET /x",
    name: "get-x",
    source: { kind: "openapi", ref: "GET /x" },
    inputSchema: { type: "object", properties: {}, required: [] },
    inputTypeName: "GetXInput",
    httpMethod: "GET",
    sideEffect: "read",
    endpointRole: "endpoint",
    enabledByDefault: true,
    requiresAuth: false,
    riskTier: "safe-read",
    hints: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    piiInOutput: [],
    description: "A fine description",
    descriptionSource: "openapi-summary",
    ...overrides,
  };
}

describe("resolveLlmProvider", () => {
  it("is off without the config key, even with an env key set", () => {
    // An OPENAI_API_KEY in the environment must not turn a generate run into
    // a network call nobody asked for; the config key is the opt-in.
    expect(resolveLlmProvider(undefined, { OPENAI_API_KEY: "sk-test" })).toBeUndefined();
  });

  it("uses the custom provider when one is given", () => {
    const { provider } = mockProvider();
    expect(resolveLlmProvider({ provider })?.name).toBe("mock");
  });

  it("builds the built-in provider from a config key, then env keys", () => {
    expect(resolveLlmProvider({ apiKey: "sk-config" }, {})?.name).toContain("openai-compatible");
    expect(resolveLlmProvider({}, { WEBMCP_LLM_API_KEY: "sk-env" })?.name).toContain(
      "openai-compatible",
    );
    expect(resolveLlmProvider({}, { OPENAI_API_KEY: "sk-env" })?.name).toContain(
      "openai-compatible",
    );
    expect(resolveLlmProvider({}, {})).toBeUndefined();
  });
});

describe("runLlmLayer", () => {
  it("proposes drafts only for machine-written text, never author text", async () => {
    const { provider, calls } = mockProvider({
      describe: JSON.stringify({
        description: "Create a trip and open it in the editor.",
        fields: { minutes: "Minutes worked on this task. A number from 30 to 600." },
      }),
    });
    const suggestions = await runLlmLayer(
      { sources: [], outputs: [], llm: { provider } },
      {
        tools: [
          tool({ name: "well-described" }), // author text: never sent
          tool({
            name: "create-trip",
            description: "create-trip",
            descriptionSource: "generated-template",
            synthesizedFields: ["minutes"],
          }),
        ],
        findings: [],
      },
    );

    // Only the needy tool was asked about.
    expect(calls.filter((call) => call.task === "describe")).toHaveLength(1);
    expect(calls[0]?.prompt).toContain("create-trip");
    expect(suggestions.some((s) => s.message.includes("Create a trip and open it"))).toBe(true);
    expect(suggestions.some((s) => s.field === "minutes" && s.message.includes("30 to 600"))).toBe(
      true,
    );
  });

  it("suggests a producer for fields the audit flagged as unproducible", async () => {
    const { provider } = mockProvider({
      relationship: JSON.stringify({ producer: "search-places" }),
    });
    const suggestions = await runLlmLayer(
      { sources: [], outputs: [], llm: { provider } },
      {
        tools: [tool({ name: "create-trip" }), tool({ name: "search-places" })],
        findings: [
          {
            level: "warning",
            tool: "create-trip",
            message:
              'Field "locationObject" says it comes from the "search-places" tool, but no such tool exists in this run.',
          },
        ],
      },
    );
    expect(suggestions.some((s) => s.message.includes('"search-places"'))).toBe(true);
  });

  it("never names a producer that does not exist in the run", async () => {
    const { provider } = mockProvider({
      relationship: JSON.stringify({ producer: "hallucinated-tool" }),
    });
    const suggestions = await runLlmLayer(
      { sources: [], outputs: [], llm: { provider } },
      {
        tools: [tool({ name: "create-trip" })],
        findings: [
          {
            level: "warning",
            tool: "create-trip",
            message: 'Field "locationObject" ... but no such tool exists in this run.',
          },
        ],
      },
    );
    expect(suggestions.filter((s) => s.task === "relationship")).toHaveLength(0);
  });

  it("surfaces semantic contradictions as suggestions, not findings", async () => {
    const { provider } = mockProvider({
      "semantic-review": JSON.stringify({
        contradictions: [{ tool: "get-x", issue: 'Says "fetch" but the schema writes.' }],
      }),
    });
    const suggestions = await runLlmLayer(
      { sources: [], outputs: [], llm: { provider } },
      { tools: [tool({ name: "get-x" })], findings: [] },
    );
    expect(
      suggestions.some((s) => s.task === "semantic-review" && s.message.includes("fetch")),
    ).toBe(true);
  });

  it("proposes tools for --suggest exports", async () => {
    const { provider } = mockProvider({
      suggest: JSON.stringify({
        tools: [{ name: "create-trip", description: "Create a trip.", write: true }],
      }),
    });
    const suggestions = await runLlmLayer(
      { sources: [], outputs: [], llm: { provider } },
      {
        tools: [],
        findings: [],
        suggestExports: [{ name: "CreateTripInput", schemaText: '{"type":"object"}' }],
      },
    );
    expect(suggestions.some((s) => s.task === "suggest" && s.message.includes("create-trip"))).toBe(
      true,
    );
  });

  it("asks each distinct question once per run, however many tools share it", async () => {
    const { provider, calls } = mockProvider({
      describe: JSON.stringify({ description: "Draft." }),
    });
    const twin = {
      description: "same",
      descriptionSource: "generated-template" as const,
      synthesizedFields: [] as string[],
      inputSchema: { type: "object", properties: {}, required: [] },
    };
    await runLlmLayer(
      { sources: [], outputs: [], llm: { provider } },
      {
        // Two tools with byte-identical questions hash to one provider call.
        tools: [tool({ name: "same", ...twin }), tool({ name: "same", ...twin })],
        findings: [],
      },
    );
    expect(calls.filter((call) => call.task === "describe")).toHaveLength(1);
  });

  it("turns a provider failure into a note, never a run failure", async () => {
    const broken: LlmProvider = {
      name: "broken",
      async complete() {
        throw new Error("HTTP 500");
      },
    };
    const suggestions = await runLlmLayer(
      { sources: [], outputs: [], llm: { provider: broken } },
      {
        tools: [tool({ name: "t", description: "t", descriptionSource: "generated-template" })],
        findings: [],
      },
    );
    expect(
      suggestions.some((s) => s.message.includes("failed") && s.message.includes("unaffected")),
    ).toBe(true);
  });

  it("parses completions that wrap JSON in prose or fences", async () => {
    const { provider } = mockProvider({
      "semantic-review": 'Here you go:\n```json\n{"contradictions": []}\n```\nHope that helps!',
    });
    // No throw, no suggestions, no drama.
    const suggestions = await runLlmLayer(
      { sources: [], outputs: [], llm: { provider } },
      { tools: [tool()], findings: [] },
    );
    expect(suggestions.filter((s) => s.task === "semantic-review")).toHaveLength(0);
  });
});
