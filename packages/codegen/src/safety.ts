/**
 * The safety layer.
 *
 * Nothing gets written to disk until every candidate tool has been through
 * here. This layer does three jobs:
 *
 *   1. Classify: what does calling this tool do to the world?
 *      (read / write / destructive, from the HTTP verb plus name heuristics)
 *   2. Hint:     derive the WebMCP tool hints (readOnlyHint etc.) from that
 *   3. Audit:    lint the result and report problems in plain language
 *
 * Every rule is a heuristic with an escape hatch: the generated code carries
 * the classification in plain sight, and the developer owns the final file.
 */

import type {
  AuditFinding,
  CandidateTool,
  JsonSchema,
  ReviewedTool,
  RiskTier,
  SafetyOptions,
  SideEffect,
  ToolHints,
} from "./types.js";

/**
 * Words that signal "this changes something the user can't easily undo",
 * even when the HTTP verb looks innocent. `POST /orders/{id}/cancel` is the
 * classic case: a POST that behaves like a DELETE.
 */
const DESTRUCTIVE_WORDS =
  /\b(cancel|delete|remove|destroy|deactivate|refund|revoke|purge|close)\b/i;

/**
 * Field names that usually hold personal data or secrets. Matched against
 * the last segment of a field path, case-insensitively. Teams extend this
 * list via `safety.piiFields` in the config.
 */
const DEFAULT_PII_FIELDS = [
  "password",
  "ssn",
  "token",
  "secret",
  "apikey",
  "api_key",
  "email",
  "dob",
  "birthdate",
  "phone",
  "address",
  "creditcard",
  "cardnumber",
  "cvv",
];

/**
 * Phrases that suggest a description is trying to *instruct the agent*
 * instead of describing the tool. That is a known prompt-injection smell.
 */
const AGENT_INSTRUCTION_PATTERN =
  /\b(you (must|should|always|are)|as an ai|ignore (all |previous )?instructions|do not refuse)\b/i;

/** Step 1: classify what calling the tool does. */
export function classifySideEffect(tool: CandidateTool): SideEffect {
  switch (tool.httpMethod) {
    case "GET":
    case "HEAD":
    case "OPTIONS":
      // A safe verb whose name says otherwise is suspicious; audit flags it.
      return "read";
    case "DELETE":
      return "destructive";
    case "POST":
    case "PUT":
    case "PATCH":
      // Upgrade nominally-"write" verbs when the name says it can't be undone.
      return DESTRUCTIVE_WORDS.test(tool.name) || DESTRUCTIVE_WORDS.test(tool.source.ref)
        ? "destructive"
        : "write";
    default:
      return "unknown";
  }
}

/** Step 2: derive the WebMCP hints from the classification. */
export function hintsFor(tool: CandidateTool, sideEffect: SideEffect): ToolHints {
  const method = tool.httpMethod;
  return {
    readOnlyHint: sideEffect === "read",
    destructiveHint: sideEffect === "destructive",
    // PUT/PATCH/DELETE can be safely retried with the same input; POST cannot.
    idempotentHint:
      sideEffect === "read" || method === "PUT" || method === "PATCH" || method === "DELETE",
  };
}

export function riskTierFor(sideEffect: SideEffect): RiskTier {
  switch (sideEffect) {
    case "read":
      return "safe-read";
    case "destructive":
      return "destructive-confirm";
    default:
      return "write-confirm";
  }
}

/**
 * Walk a schema and return the paths of fields that look like PII or
 * secrets, e.g. "user.email". Only *output* schemas are scanned: the
 * security-relevant direction is data leaving the page and reaching the agent.
 */
export function findPiiFields(
  schema: JsonSchema | undefined,
  extraFields: string[] = [],
  prefix = "",
): string[] {
  if (!schema?.properties) return [];
  const piiNames = new Set(
    [...DEFAULT_PII_FIELDS, ...extraFields].map((name) => name.toLowerCase()),
  );
  const found: string[] = [];

  for (const [key, fieldSchema] of Object.entries(schema.properties)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const normalizedKey = key.toLowerCase().replace(/[-_]/g, "");
    const looksSensitive =
      piiNames.has(key.toLowerCase()) ||
      piiNames.has(normalizedKey) ||
      [...piiNames].some((name) => normalizedKey === name.replace(/[-_]/g, ""));
    if (looksSensitive) found.push(path);
    // Recurse into nested objects ("user": { "email": ... }).
    found.push(...findPiiFields(fieldSchema, extraFields, path));
  }
  return found;
}

/** Run the full review: classify, hint, PII-scan. Pure, no I/O. */
export function reviewTools(
  candidates: CandidateTool[],
  safety: SafetyOptions = {},
): ReviewedTool[] {
  const excluded = (safety.exclude ?? []).map((pattern) => pattern.toLowerCase());

  return candidates
    .filter(
      (tool) =>
        !excluded.some(
          (pattern) =>
            tool.name.toLowerCase().includes(pattern) ||
            tool.source.ref.toLowerCase().includes(pattern),
        ),
    )
    .map((tool) => {
      const sideEffect = classifySideEffect(tool);
      return {
        ...tool,
        sideEffect,
        riskTier: riskTierFor(sideEffect),
        hints: hintsFor(tool, sideEffect),
        piiInOutput: findPiiFields(tool.outputSchema, safety.piiFields),
      };
    });
}

/**
 * Step 3: audit the reviewed tools and report in plain language.
 * Errors block file writing (unless --force); warnings never do. This is
 * meant to run in CI like `npm audit`: exit codes, not vibes.
 */
export function auditTools(
  tools: ReviewedTool[],
  renames: { from: string; to: string }[] = [],
): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const rename of renames) {
    findings.push({
      level: "warning",
      tool: rename.to,
      message: `Renamed "${rename.from}" → "${rename.to}" to keep tool names unique.`,
    });
  }

  for (const tool of tools) {
    if (!tool.description || tool.description.trim().length === 0) {
      findings.push({
        level: "error",
        tool: tool.name,
        message: "No description. Agents pick tools by description. This tool is invisible.",
      });
      continue;
    }

    if (tool.descriptionSource === "generated-template") {
      findings.push({
        level: "warning",
        tool: tool.name,
        message:
          `Description is just "${tool.description}" (no summary in the source). ` +
          "Write one sentence about what it does and why. It goes straight into the agent's prompt.",
      });
    }

    if (AGENT_INSTRUCTION_PATTERN.test(tool.description)) {
      findings.push({
        level: "warning",
        tool: tool.name,
        message:
          "The description reads like instructions to the agent, not a description of the tool. " +
          "Describe what the tool does; never try to steer the agent from here.",
      });
    }

    if (tool.riskTier === "safe-read" && DESTRUCTIVE_WORDS.test(tool.name)) {
      findings.push({
        level: "error",
        tool: tool.name,
        message:
          `The name suggests something destructive but ${tool.httpMethod} is a safe verb. ` +
          "Check the spec: a GET named like a delete is either mislabeled or a design smell.",
      });
    }

    if (tool.piiInOutput.length > 0) {
      findings.push({
        level: "warning",
        tool: tool.name,
        message:
          `Response may expose ${tool.piiInOutput.join(", ")}. ` +
          "These fields reach the agent. Exclude them in execute() unless they are truly needed.",
      });
    }

    if (tool.requiresAuth && tool.riskTier !== "safe-read") {
      findings.push({
        level: "warning",
        tool: tool.name,
        message:
          "This mutating tool wraps an authenticated endpoint. It runs with the page's session, so " +
          "make sure your server-side authorization checks apply to tool calls too.",
      });
    }
  }

  return findings;
}
