import { describe, expect, it } from "vitest";
import { z } from "zod";
import { schema } from "./schema.js";

/**
 * These tests run against the real zod (a devDependency, resolved exactly the
 * way the source resolves it in an app: from near this file's package). That
 * is deliberate: the conversion contract is with zod's actual output, not a
 * mock of it.
 */

const CreateTripInput = z.object({
  title: z.string().min(1).max(40).describe("Name of the trip. 40 characters max."),
  startDate: z.iso.date().optional().describe("When the trip happened."),
});

describe("schema source", () => {
  it("turns a zod schema into a candidate with the schema's own text", async () => {
    const source = schema({ tools: [{ name: "create-trip", schema: CreateTripInput }] });
    const [candidate] = await source.collect();

    expect(candidate?.name).toBe("create-trip");
    expect(candidate?.source).toEqual({ kind: "schema", ref: "create-trip" });
    expect(candidate?.inputSchema.type).toBe("object");
    expect(candidate?.inputSchema.properties?.title?.description).toBe(
      "Name of the trip. 40 characters max.",
    );
    expect(candidate?.inputSchema.required).toContain("title");
    // No .describe() on the object itself, so the template stands and the
    // audit can warn about it.
    expect(candidate?.descriptionSource).toBe("generated-template");
  });

  it("lets the entry description beat the schema's own describe()", async () => {
    const described = z.object({ title: z.string() }).describe("From the schema.");
    const [candidate] = await schema({
      tools: [{ name: "create-trip", schema: described, description: "From the entry." }],
    }).collect();
    expect(candidate?.description).toBe("From the entry.");
    expect(candidate?.descriptionSource).toBe("declared");
  });

  it("falls back to the schema's describe() when the entry says nothing", async () => {
    const described = z.object({ title: z.string() }).describe("From the schema.");
    const [candidate] = await schema({ tools: [{ name: "create-trip", schema: described }] }).collect();
    expect(candidate?.description).toBe("From the schema.");
    expect(candidate?.descriptionSource).toBe("declared");
    // The object's own describe became the tool description; it must not also
    // sit on the input schema, or the agent reads the same sentence twice.
    expect(candidate?.inputSchema.description).toBeUndefined();
  });

  it("carries the operation merge pointer and the form pointer", async () => {
    const [candidate] = await schema({
      tools: [
        {
          name: "create-trip",
          schema: CreateTripInput,
          operation: "createTrip",
          form: "./src/components/CreateTripCard.tsx",
        },
      ],
    }).collect();
    expect(candidate?.operationId).toBe("createTrip");
    expect(candidate?.form).toEqual({ path: "./src/components/CreateTripCard.tsx" });
  });

  it("converts the optional output schema", async () => {
    const [candidate] = await schema({
      tools: [
        {
          name: "search-places",
          schema: z.object({ query: z.string() }),
          output: z.object({ places: z.array(z.string()) }),
        },
      ],
    }).collect();
    expect(candidate?.outputSchema?.properties?.places?.type).toBe("array");
  });

  it("rejects names the WebMCP runtime would reject, at collect time", async () => {
    const source = schema({ tools: [{ name: "Create Trip!", schema: CreateTripInput }] });
    await expect(source.collect()).rejects.toThrow("Create Trip!");
  });

  it("rejects non-object schemas: a tool's input is always named fields", async () => {
    const source = schema({ tools: [{ name: "search", schema: z.string() }] });
    await expect(source.collect()).rejects.toThrow("must be an object schema");
  });

  it("rejects values that are not Standard Schemas", async () => {
    const source = schema({
      tools: [{ name: "create-trip", schema: { type: "object" } }],
    });
    await expect(source.collect()).rejects.toThrow("not a Standard Schema");
  });

  it("rejects non-zod vendors with a pointer to the follow-up", async () => {
    const fakeValibot = { "~standard": { version: 1, vendor: "valibot" } };
    const source = schema({ tools: [{ name: "create-trip", schema: fakeValibot }] });
    await expect(source.collect()).rejects.toThrow('"valibot" is not converted yet');
  });

  it("points zod v3 schemas at the conversion path, loud and clear", async () => {
    // A v3-shaped schema: Standard Schema marker, no `_zod`. The test package
    // has no zod-to-json-schema, so the actionable error is what we assert.
    const fakeV3 = { "~standard": { version: 1, vendor: "zod" }, _def: {} };
    const source = schema({ tools: [{ name: "create-trip", schema: fakeV3 }] });
    await expect(source.collect()).rejects.toThrow("zod v3");
  });
});
