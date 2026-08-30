/**
 * Tool naming.
 *
 * Tool names are the vocabulary an agent reasons over, so we make them
 * boring and predictable: kebab-case, derived from the operationId when the
 * source has one, and always matching the character set the WebMCP runtime
 * accepts (the same rule the groundstate core registry enforces).
 */

/** The character set the WebMCP runtime accepts for tool names. */
export const TOOL_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

/**
 * Turn an operationId or route into a valid, readable tool name.
 *
 * Examples:
 *   "getOrderStatus"      → "get-order-status"
 *   "GET /orders/{id}"    → "get-orders-id"
 *   "list_pets"           → "list-pets"
 */
export function toToolName(raw: string): string {
  const name = raw
    // Split acronym boundaries first: "getHTTPStatus" → "get-HTTPStatus"
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    // Then camelCase and PascalCase boundaries: "getOrder" → "get-Order"
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    // Path placeholders and separators become dashes: "/orders/{id}" → "-orders-id"
    .replace(/[{}/_\s.]+/g, "-")
    // Anything left that isn't a letter, digit or dash is dropped
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase()
    // Collapse and trim dashes
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  // A name must start with a letter. If it doesn't (e.g. it came from a bare
  // numeric path), give it a neutral prefix rather than failing.
  const prefixed = /^[a-zA-Z]/.test(name) ? name : `tool-${name}`;
  return prefixed || "unnamed-tool";
}

/**
 * Build the fallback name for an operation that has no operationId:
 * the HTTP method plus the path, e.g. GET /orders/{id} → "get-orders-id".
 */
export function nameFromRoute(method: string, path: string): string {
  return toToolName(`${method.toLowerCase()} ${path}`);
}

/**
 * Make every name unique. When two operations slugify to the same name we
 * append the HTTP method ("get-order-status-post" would be worse); when that
 * still collides we append a counter. Returns the final names plus a list of
 * renames so the audit report can show them.
 */
export function dedupeNames(candidates: { name: string; httpMethod?: string }[]): {
  names: string[];
  renames: { from: string; to: string }[];
} {
  const seen = new Set<string>();
  const names: string[] = [];
  const renames: { from: string; to: string }[] = [];

  for (const candidate of candidates) {
    let name = candidate.name;
    if (seen.has(name) && candidate.httpMethod) {
      name = `${name}-${candidate.httpMethod.toLowerCase()}`;
    }
    let counter = 2;
    const base = name;
    while (seen.has(name)) {
      name = `${base}-${counter}`;
      counter += 1;
    }
    if (name !== candidate.name) {
      renames.push({ from: candidate.name, to: name });
    }
    seen.add(name);
    names.push(name);
  }

  return { names, renames };
}

/**
 * Strip a shared API version prefix from route-derived names.
 *
 * APIs that version every path (`/v1/trips`, `/v1/users`) would otherwise
 * put "v1-" in every single tool name: "get-v1-trips", "post-v1-users".
 * The prefix carries no information when it is on *every* name, so when at
 * least 80% of names share the same version segment we drop it and tell the
 * report. Runs before dedupe: stripping can create collisions (both
 * `/v1/trips` and `/trips` become "get-trips"), and dedupe resolves them.
 *
 * Only the segment right after the method word is considered
 * ("get-v1-trips"), so an operationId like "preview-v2-changes" is untouched.
 */
export function stripVersionPrefix(candidates: { name: string }[]): {
  names: string[];
  note?: string;
} {
  // Route-derived names always start with an HTTP method ("get-v1-trips");
  // an operationId like "preview-v2-changes" does not, so it never counts.
  const VERSION_AT = /^(get|post|put|patch|delete|head|options)-(v\d+)-/;

  const counts = new Map<string, number>();
  for (const { name } of candidates) {
    const match = VERSION_AT.exec(name);
    if (match) counts.set(match[2] as string, (counts.get(match[2] as string) ?? 0) + 1);
  }

  let shared: string | undefined;
  for (const [version, count] of counts) {
    if (count / candidates.length >= 0.8 && (!shared || count > (counts.get(shared) ?? 0))) {
      shared = version;
    }
  }
  if (!shared) return { names: candidates.map((candidate) => candidate.name) };

  const prefix = new RegExp(`^((?:get|post|put|patch|delete|head|options))-${shared}-`);
  const names = candidates.map(({ name }) =>
    prefix.test(name) ? name.replace(prefix, "$1-") : name,
  );
  return {
    names,
    note: `Stripped the shared "${shared}" version prefix from tool names.`,
  };
}
