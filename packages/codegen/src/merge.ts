/**
 * The merge: fusing a schema-declared tool with the OpenAPI operation it
 * refines, so one action produces one tool instead of two.
 *
 * Why the merge is declared, never inferred: guessing that a schema entry and
 * an endpoint "are the same action" from names or paths is exactly the kind
 * of fragile magic this codebase rejects elsewhere. A wrong silent merge is
 * worse than none. So the developer declares it (`operation: "createTrip"` on
 * the schema entry) and the failure mode is loud: naming an operationId the
 * spec does not have is an error, not a fallback.
 *
 * Which half wins which field is not negotiable at runtime, because it
 * follows from what each contract *is*: the spec owns what the endpoint is
 * (method, path, auth, response shape, and therefore the safety
 * classification), and the schema owns what the action means (the input
 * contract and the words describing it). The merged tool's scaffolded
 * execute() is typed against the developer's schema, not the spec's parallel
 * description of it.
 */

import type { AuditFinding, CandidateTool } from "./types.js";

export interface MergeResult {
  tools: CandidateTool[];
  findings: AuditFinding[];
}

/**
 * Fuse schema candidates that declare `operation` with the OpenAPI candidate
 * carrying the same operationId. Runs before naming and safety, so the merged
 * tool is classified and reported as one thing.
 */
export function mergeSchemaWithOperations(candidates: CandidateTool[]): MergeResult {
  const findings: AuditFinding[] = [];
  const consumed = new Set<CandidateTool>();
  const merged: CandidateTool[] = [];

  const schemaTools = candidates.filter(
    (candidate) => candidate.source.kind === "schema" && candidate.operationId,
  );
  const byOperationId = new Map<string, CandidateTool>();
  for (const candidate of candidates) {
    if (candidate.source.kind === "openapi" && candidate.operationId) {
      byOperationId.set(candidate.operationId, candidate);
    }
  }

  for (const schemaTool of schemaTools) {
    const operation = byOperationId.get(schemaTool.operationId as string);
    if (!operation) {
      // Loud, never a silent standalone fallback: the developer said "these
      // are the same action", and if that is wrong the tool would silently
      // lose the endpoint behavior they expected.
      findings.push({
        level: "error",
        tool: schemaTool.name,
        message:
          `Declares operation "${schemaTool.operationId}", but no OpenAPI operation has that ` +
          `operationId. Fix the name, or drop "operation" to make this a standalone tool.`,
      });
      merged.push(schemaTool);
      continue;
    }

    consumed.add(operation);
    merged.push(fuse(schemaTool, operation));
  }

  const tools = candidates.filter(
    (candidate) => !consumed.has(candidate) && !schemaTools.includes(candidate),
  );
  return { tools: [...tools, ...merged], findings };
}

/**
 * One candidate, both contracts. The endpoint facts (method, path, auth,
 * output) come from the spec; the input contract and the words come from the
 * schema. When the schema carries no description of its own, the spec's
 * summary is still better than a template, so it survives.
 */
function fuse(schemaTool: CandidateTool, operation: CandidateTool): CandidateTool {
  const hasSchemaText = schemaTool.descriptionSource === "declared";
  return {
    ...operation,
    id: schemaTool.id,
    name: schemaTool.name,
    inputSchema: schemaTool.inputSchema,
    inputTypeName: schemaTool.inputTypeName,
    description: hasSchemaText ? schemaTool.description : operation.description,
    descriptionSource: hasSchemaText ? "declared" : operation.descriptionSource,
    // Provenance: the report shows "CreateTripInput + POST /v1/trips", and the
    // safety heuristics read endpointRef for the route's auth/admin signal.
    source: { kind: "schema", ref: schemaTool.source.ref },
    endpointRef: operation.source.ref,
    form: schemaTool.form,
  };
}
