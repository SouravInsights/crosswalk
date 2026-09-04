/**
 * The describe layer: assembling the field text an agent reads.
 *
 * Why this exists: agents fill tool inputs from field descriptions, and most
 * contracts carry none. A `{ type: "number", minimum: 30, maximum: 600 }`
 * reaches the agent as just "a number", the first call fails validation, and
 * the run dies in a retry loop. Chrome's own WebMCP examples put the
 * constraint in the prose ("Minutes worked on this task. A number from 30 to
 * 600."), so this layer renders constraints as plain language.
 *
 * The rules that keep it trustworthy:
 *
 *   - Append, never replace. Author text (a spec description, a `.describe()`)
 *     stays verbatim; synthesized constraints follow it. The author's words are
 *     always the better text.
 *   - Only fill silence. A field with no text at all gets a draft built from
 *     its name, type, and constraints, and that field is marked as
 *     machine-written so the audit can see it. Machine text is a floor, not a
 *     finish.
 *   - Deterministic. Same schema in, same text out, no key, no network. The
 *     audit is only meaningful if a CI run is reproducible.
 *
 * This module covers layers 1-3 of the assembly order (source text, merge,
 * synthesis). Layer 4 (LLM drafts) is advisory and lives in llm.ts; layer 5
 * (overrides) lives in the pipeline's override step, applied last so it wins.
 */

import type { CandidateTool, JsonSchema } from "./types.js";

/**
 * Render a schema's constraints as plain-language sentences, or "" when there
 * is nothing worth saying. The wording mirrors the examples in Chrome's WebMCP
 * docs, so generated text reads like the documentation developers have seen.
 */
export function describeConstraints(schema: JsonSchema): string {
  const sentences: string[] = [];

  if (schema.const !== undefined) {
    sentences.push(`Always ${JSON.stringify(schema.const)}.`);
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const values = schema.enum.map((value) => JSON.stringify(value)).join(", ");
    sentences.push(`One of: ${values}.`);
  }

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === "number" || type === "integer") {
    const sentence = numberConstraintSentence(schema, type === "integer");
    if (sentence) sentences.push(sentence);
  }

  if (type === "string") {
    sentences.push(...stringConstraintSentences(schema));
  }

  if (type === "array") {
    const min = typeof schema.minItems === "number" ? schema.minItems : undefined;
    const max = typeof schema.maxItems === "number" ? schema.maxItems : undefined;
    if (min !== undefined && max !== undefined) {
      sentences.push(`A list of ${min} to ${max} items.`);
    } else if (max !== undefined) {
      sentences.push(`A list of at most ${max} items.`);
    } else if (min !== undefined && min > 0) {
      sentences.push(`A list of at least ${min} item${min === 1 ? "" : "s"}.`);
    }
  }

  return sentences.join(" ");
}

function numberConstraintSentence(schema: JsonSchema, whole: boolean): string | undefined {
  const noun = whole ? "A whole number" : "A number";
  const min = typeof schema.minimum === "number" ? schema.minimum : undefined;
  const max = typeof schema.maximum === "number" ? schema.maximum : undefined;
  const exMin =
    typeof schema.exclusiveMinimum === "number" ? schema.exclusiveMinimum : undefined;
  const exMax =
    typeof schema.exclusiveMaximum === "number" ? schema.exclusiveMaximum : undefined;

  if (min !== undefined && max !== undefined) return `${noun} from ${min} to ${max}.`;
  if (exMin !== undefined && exMax !== undefined) {
    return `${noun} greater than ${exMin} and less than ${exMax}.`;
  }
  if (min !== undefined) return `${noun}, at least ${min}.`;
  if (max !== undefined) return `${noun}, at most ${max}.`;
  if (exMin !== undefined) return `${noun} greater than ${exMin}.`;
  if (exMax !== undefined) return `${noun} less than ${exMax}.`;
  return undefined;
}

function stringConstraintSentences(schema: JsonSchema): string[] {
  const sentences: string[] = [];
  const min = typeof schema.minLength === "number" ? schema.minLength : undefined;
  const max = typeof schema.maxLength === "number" ? schema.maxLength : undefined;

  // minLength: 1 is the universal "required string" spelling (z.string().min(1));
  // saying "at least 1 characters" to an agent is noise, so it is skipped.
  if (min !== undefined && max !== undefined) {
    sentences.push(
      min <= 1 ? `At most ${max} characters.` : `Between ${min} and ${max} characters.`,
    );
  } else if (max !== undefined) {
    sentences.push(`At most ${max} characters.`);
  } else if (min !== undefined && min > 1) {
    sentences.push(`At least ${min} characters.`);
  }

  const format = FORMAT_SENTENCES[schema.format ?? ""];
  if (format) sentences.push(format);
  if (typeof schema.pattern === "string") sentences.push(`Must match /${schema.pattern}/.`);
  return sentences;
}

/** Formats worth naming to an agent. Unknown formats are skipped: naming a
 *  format the model does not know helps nobody, and the validator still has
 *  the last word server-side. */
const FORMAT_SENTENCES: Record<string, string> = {
  date: "A date (YYYY-MM-DD).",
  "date-time": "A date-time in ISO 8601 format.",
  email: "An email address.",
  uri: "A URL.",
  url: "A URL.",
  uuid: "A UUID.",
};

/**
 * The constraint values a description would have to mention to count as
 * "already stated". Value-mention is deliberately crude: when in doubt we
 * append, because a duplicated constraint is harmless and a missing one is a
 * failed agent call.
 */
function statedValues(schema: JsonSchema): string[] {
  const values: string[] = [];
  for (const key of ["minimum", "maximum", "minLength", "maxLength", "minItems", "maxItems"]) {
    const value = schema[key];
    if (typeof value === "number") values.push(String(value));
  }
  for (const member of Array.isArray(schema.enum) ? schema.enum : []) {
    values.push(String(member));
  }
  return values;
}

/** True when the author text already mentions every constraint value. */
function alreadyStatesConstraints(text: string, schema: JsonSchema): boolean {
  const values = statedValues(schema);
  return values.length > 0 && values.every((value) => text.includes(value));
}

/** "purchaseDate" / "purchase_date" / "purchase-date" → "Purchase date".
 *  Sentence case, matching the field text in Chrome's WebMCP examples; these
 *  are machine drafts that the audit flags, not final copy. */
function humanizeFieldName(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Assemble one field's description. Returns the text plus whether the text is
 * machine-drafted (no author text existed at all), which the audit reports on.
 */
export function describeField(
  name: string,
  schema: JsonSchema,
): { description: string; synthesized: boolean } {
  const authorText = typeof schema.description === "string" ? schema.description.trim() : "";
  const constraints = describeConstraints(schema);

  if (authorText) {
    const needsConstraints = constraints && !alreadyStatesConstraints(authorText, schema);
    return {
      description: needsConstraints ? `${authorText} ${constraints}` : authorText,
      synthesized: false,
    };
  }

  const draft = `${humanizeFieldName(name)}.${constraints ? ` ${constraints}` : ""}`;
  return { description: draft, synthesized: true };
}

/**
 * Run the describe layer over a candidate's input fields, in place. Fields
 * with author text keep it (constraints appended when missing); fields with
 * none get a marked draft. Records which fields were machine-drafted so the
 * audit can warn when a tool has nothing but.
 */
export function describeCandidateInputs(candidate: CandidateTool): void {
  const properties = candidate.inputSchema.properties;
  if (!properties) return;

  const synthesized: string[] = [];
  for (const [name, fieldSchema] of Object.entries(properties)) {
    const { description, synthesized: wasSynthesized } = describeField(name, fieldSchema);
    if (description) fieldSchema.description = description;
    if (wasSynthesized) synthesized.push(name);
  }
  candidate.synthesizedFields = synthesized;
}
