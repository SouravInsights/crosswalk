import { describe, expect, it } from "vitest";
import { describeCandidateInputs, describeConstraints, describeField } from "./describe.js";
import type { CandidateTool } from "./types.js";

describe("describeConstraints", () => {
  it("renders a number range the way the WebMCP docs do", () => {
    expect(describeConstraints({ type: "number", minimum: 30, maximum: 600 })).toBe(
      "A number from 30 to 600.",
    );
  });

  it("renders one-sided number bounds", () => {
    expect(describeConstraints({ type: "number", minimum: 1 })).toBe("A number, at least 1.");
    expect(describeConstraints({ type: "integer", maximum: 10 })).toBe(
      "A whole number, at most 10.",
    );
  });

  it("renders exclusive bounds without pretending they are inclusive", () => {
    expect(describeConstraints({ type: "number", exclusiveMinimum: 0, exclusiveMaximum: 5 })).toBe(
      "A number greater than 0 and less than 5.",
    );
  });

  it("renders enums as a value list", () => {
    expect(describeConstraints({ enum: ["a", "b"] })).toBe('One of: "a", "b".');
  });

  it("renders string lengths, skipping the minLength-1 noise", () => {
    // z.string().min(1) is the universal "required string" spelling; naming it
    // would put "at least 1 characters" on half the fields in the world.
    expect(describeConstraints({ type: "string", minLength: 1, maxLength: 40 })).toBe(
      "At most 40 characters.",
    );
    expect(describeConstraints({ type: "string", minLength: 1 })).toBe("");
    expect(describeConstraints({ type: "string", minLength: 3 })).toBe("At least 3 characters.");
  });

  it("renders known formats and patterns", () => {
    expect(describeConstraints({ type: "string", format: "date" })).toBe("A date (YYYY-MM-DD).");
    expect(describeConstraints({ type: "string", pattern: "^[A-Z]{2}-\\d+$" })).toBe(
      "Must match /^[A-Z]{2}-\\d+$/.",
    );
    // A format the model likely does not know helps nobody; silence is honest.
    expect(describeConstraints({ type: "string", format: "cuid2" })).toBe("");
  });

  it("does not render a known format's own regex as prose", () => {
    // zod emits z.string().email() as format + pattern; the pattern is the
    // format's implementation, and a regex dump helps no agent.
    const result = describeConstraints({ type: "string", format: "email", pattern: "^\\S+@\\S+$" });
    expect(result).toBe("An email address.");
  });

  it("renders array sizes", () => {
    expect(describeConstraints({ type: "array", minItems: 1, maxItems: 5 })).toBe(
      "A list of 1 to 5 items.",
    );
  });

  it("says nothing when there is nothing worth saying", () => {
    expect(describeConstraints({ type: "boolean" })).toBe("");
    expect(describeConstraints({ type: "object" })).toBe("");
  });
});

describe("describeField", () => {
  it("keeps author text verbatim and appends missing constraints", () => {
    const result = describeField("minutes_worked", {
      type: "number",
      minimum: 30,
      maximum: 600,
      description: "Minutes worked on this task.",
    });
    expect(result.description).toBe("Minutes worked on this task. A number from 30 to 600.");
    expect(result.synthesized).toBe(false);
  });

  it("does not append constraints the author text already states", () => {
    const result = describeField("title", {
      type: "string",
      maxLength: 40,
      description: "Name of the trip, 40 characters max.",
    });
    expect(result.description).toBe("Name of the trip, 40 characters max.");
  });

  it("drafts a marked description for silent fields", () => {
    const result = describeField("purchaseDate", { type: "string", format: "date" });
    expect(result.description).toBe("Purchase date. A date (YYYY-MM-DD).");
    expect(result.synthesized).toBe(true);
  });
});

describe("describeCandidateInputs", () => {
  function candidateWith(properties: Record<string, object>): CandidateTool {
    return {
      id: "schema:book-trip",
      name: "book-trip",
      source: { kind: "schema", ref: "book-trip" },
      inputSchema: { type: "object", properties: properties as never, required: [] },
      inputTypeName: "BookTripInput",
      sideEffect: "unknown",
      requiresAuth: false,
      description: "Book a trip.",
      descriptionSource: "declared",
    };
  }

  it("records exactly which fields were machine-drafted", () => {
    const candidate = candidateWith({
      title: { type: "string", maxLength: 40, description: "Name of the trip." },
      guests: { type: "number", minimum: 1, maximum: 10 },
    });
    describeCandidateInputs(candidate);
    expect(candidate.synthesizedFields).toEqual(["guests"]);
    expect(candidate.inputSchema.properties?.title?.description).toBe(
      "Name of the trip. At most 40 characters.",
    );
    expect(candidate.inputSchema.properties?.guests?.description).toBe(
      "Guests. A number from 1 to 10.",
    );
  });

  it("leaves a fieldless candidate alone", () => {
    const candidate = candidateWith({});
    describeCandidateInputs(candidate);
    expect(candidate.synthesizedFields).toEqual([]);
  });
});
