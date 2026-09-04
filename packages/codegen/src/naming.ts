/**
 * Tool naming.
 *
 * Tool names are the vocabulary an agent reasons over, so they should read
 * as intent ("generate-story"), not as machine routing
 * ("post-trips-trip-id-story-generate"). Every tool gets its name from the
 * best signal available, in order:
 *
 *   1. An explicit override (config or .webmcp-codegen.json) — always wins.
 *   2. A cleaned operationId, when the spec has one.
 *   3. An intent-shaped name derived from the route (analyzeRoute).
 *   4. The plain method+path concat — the total fallback that can never fail.
 *
 * resolveNames() runs the set-level pass: collisions are deepened with
 * parent context ("generate-story" → "generate-trip-story"), and every
 * rename is reported.
 */

import pluralize from "pluralize";

/** The character set the WebMCP runtime accepts for tool names. */
export const TOOL_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

/**
 * Turn an operationId or route fragment into a valid, readable tool name.
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

/** "/v1/trips" and "/v2.1/trips" version their API in the path, not in intent. */
const VERSION_SEGMENT = /^v\d+([._-]\d+)*$/i;

/**
 * The plain method+path name, used when no intent mapping applies. Version
 * segments are dropped first: "v1" carries no information about intent, and
 * no tool should be called "get-v1-trips".
 */
export function nameFromRoute(method: string, path: string): string {
  const segments = path.split("/").filter((s) => s.length > 0 && !VERSION_SEGMENT.test(s));
  return toToolName(`${method.toLowerCase()} ${segments.join("/")}`);
}

/**
 * Clean the machine scaffolding specs put around operationIds. The author's
 * intent is the name; "TripsController_createTrip_v2" means "create-trip".
 * Conservative on purpose: only obvious scaffolding is stripped, anything
 * ambiguous stays exactly as the author wrote it.
 */
export function cleanOperationId(operationId: string): string {
  let id = operationId;

  // Drop a leading framework prefix: "TripsController_create" → "create",
  // "user.service.getProfile" → "getProfile". Everything up to and including
  // the first scaffolding marker goes, and only when something remains.
  const segments = id.split(/_|\./).filter(Boolean);
  const marker = segments.findIndex((s) => /(controller|service|api|handler)$/i.test(s));
  if (marker !== -1 && marker < segments.length - 1) {
    id = segments.slice(marker + 1).join("_");
  }

  // Drop a trailing version marker: "createTrip_v2" → "createTrip".
  id = id.replace(/[._-]?v\d+$/i, "");

  return toToolName(id);
}

// --- The intent algorithm --------------------------------------------------

/**
 * The last segment of a path is an action when its first word is here. The
 * dictionary is deliberately small and explicit: a word that is not listed
 * is treated as a resource, never guessed at.
 */
const ACTION_VERBS = new Set([
  "accept",
  "activate",
  "approve",
  "archive",
  "batch",
  "bookmark",
  "cancel",
  "check",
  "claim",
  "clone",
  "close",
  "complete",
  "confirm",
  "copy",
  "create",
  "decline",
  "deploy",
  "disable",
  "download",
  "duplicate",
  "enable",
  "execute",
  "export",
  "generate",
  "import",
  "invite",
  "join",
  "leave",
  "lock",
  "login",
  "logout",
  "merge",
  "migrate",
  "move",
  "notify",
  "open",
  "pin",
  "process",
  "publish",
  "redeem",
  "refresh",
  "register",
  "reject",
  "reopen",
  "resend",
  "reset",
  "restore",
  "retry",
  "revoke",
  "rollback",
  "run",
  "search",
  "send",
  "share",
  "signup",
  "split",
  "start",
  "stop",
  "submit",
  "sync",
  "trigger",
  "unarchive",
  "unbookmark",
  "unlock",
  "unpin",
  "unpublish",
  "unregister",
  "update",
  "upload",
  "validate",
  "verify",
]);

/**
 * Actions that operate on a collection at once. "batch-block" would imply
 * one block; "batch-blocks" says what the endpoint actually does.
 */
const PLURAL_ACTIONS = new Set(["batch", "import", "export", "sync"]);

/**
 * Segments that group endpoints rather than name resources. "POST
 * /auth/login" is "login", not "login-auth"; the grouping word adds nothing
 * an agent can act on.
 */
const GROUPING_SEGMENTS = new Set(["auth", "authentication", "api", "admin", "internal", "public"]);

/**
 * Trailing segments that mean "the current one": GET /users/me is a member
 * read of the current user, not a collection called "me".
 */
const MEMBER_WORDS = new Set(["me", "self", "current"]);

export interface RouteAnalysis {
  /** The minimal intent-shaped name, e.g. "generate-story". */
  base: string;
  /**
   * "intent" names can absorb parent context on collision ("generate-story"
   * → "generate-trip-story"); "fallback" names are fixed strings.
   */
  tier: "intent" | "fallback";
  /** The verb and noun the name is built from: verb + context + noun. */
  verb?: string;
  noun?: string;
  /** Ancestor resources, nearest first. minDepth of them are in the base. */
  context?: string[];
  /** How many context words the base already consumes (nested REST names). */
  minDepth?: number;
  /** True when a version segment was dropped from the path. */
  droppedVersion: boolean;
}

/** Singularize the last word of a phrase: "saved-places" → "saved-place". */
function singularPhrase(phrase: string): string {
  const words = phrase.split("-");
  words[words.length - 1] = pluralize.singular(words[words.length - 1] as string);
  return words.join("-");
}

function isParam(segment: string): boolean {
  return segment.startsWith("{") || segment.startsWith(":");
}

/** The intent verbs each HTTP method implies when the path is plain REST. */
const METHOD_VERBS: Record<string, { member: string; collection: string }> = {
  get: { member: "get", collection: "list" },
  post: { member: "post", collection: "create" },
  put: { member: "update", collection: "update" },
  patch: { member: "update", collection: "update" },
  delete: { member: "delete", collection: "delete" },
};

function intentName(
  verb: string,
  noun: string,
  context: string[],
  minDepth: number,
  droppedVersion: boolean,
): RouteAnalysis {
  // Context is stored nearest-first, but names read outermost-first:
  // "list-explore-destination-candidates", not "list-destination-explore-…".
  const used = context.slice(0, minDepth).reverse();
  const base = [verb, ...used, noun].filter(Boolean).join("-");
  return { base, tier: "intent", verb, noun, context, minDepth, droppedVersion };
}

/**
 * Derive an intent-shaped name from an HTTP method and route path.
 *
 * Two shapes are recognized:
 *
 *   Action endpoints — the last segment starts with a known verb, so the
 *   name is the action: POST /trips/{id}/story/generate → "generate-story".
 *   Action names stay minimal; parent context is spent only on collision.
 *
 *   Plain REST — the method implies the verb and the path shape says member
 *   or collection: POST /trips → "create-trip", GET /trips/{id} →
 *   "get-trip", GET /trips/{id}/blocks → "list-trip-blocks". Nested reads
 *   and writes include the immediate parent, because every API nests list
 *   and get somewhere and parentless names collide constantly.
 *
 * Anything else falls back to the method+path concat, which can never fail
 * to produce a name — it can only produce a boring one.
 */
export function analyzeRoute(method: string, path: string): RouteAnalysis {
  const segments = path.split("/").filter(Boolean);
  const rest = segments.filter((s) => !VERSION_SEGMENT.test(s));
  const droppedVersion = rest.length !== segments.length;

  // Walk the path once, keeping resource segments in order and noting where
  // params sit between them — a param between two resources is what makes a
  // name nested ("trips/{id}/blocks" is nested; "trips/{id}" is not).
  // A member word mid-path merges into its parent as a scope marker:
  // "/users/me/stamps" is read as "current-user → stamps", not "users, me,
  // stamps" — "me" names no resource of its own.
  const resources: { phrase: string; nestedUnderMember: boolean }[] = [];
  let sawParam = false;
  for (const segment of rest) {
    if (isParam(segment)) {
      sawParam = true;
      continue;
    }
    const phrase = toToolName(segment);
    const prev = resources[resources.length - 1];
    if (MEMBER_WORDS.has(phrase) && prev) {
      prev.phrase = `current-${singularPhrase(prev.phrase)}`;
      sawParam = true; // a member scope nests what follows, like a param does
      continue;
    }
    resources.push({ phrase, nestedUnderMember: sawParam && resources.length > 0 });
    sawParam = false;
  }
  const lastIsParam = rest.length > 0 && isParam(rest[rest.length - 1] as string);

  // Consecutive trailing params distinguish lookups: "/trips/{tripId}" is a
  // plain member read, but "/trips/{username}/{slug}" is "get-trip-by-slug".
  let trailingParams = 0;
  for (let i = rest.length - 1; i >= 0 && isParam(rest[i] as string); i--) trailingParams++;
  const lastParam =
    trailingParams >= 2
      ? toToolName((rest[rest.length - 1] as string).replace(/^[{:]|[}$]/g, ""))
      : null;

  const fallback: RouteAnalysis = {
    base: nameFromRoute(method, path),
    tier: "fallback",
    droppedVersion,
  };
  if (resources.length === 0) return fallback;

  const last = resources[resources.length - 1] as (typeof resources)[number];
  const firstWord = last.phrase.split("-")[0] as string;
  // Ancestors, nearest first, with grouping words removed: "auth" in a
  // deepened name ("generate-auth-story") only restates the obvious.
  const ancestors = resources
    .slice(0, -1)
    .map((r) => (GROUPING_SEGMENTS.has(r.phrase) ? null : singularPhrase(r.phrase)))
    .filter((a): a is string => a !== null)
    .reverse();

  // Action endpoint: the last segment starts with a known verb.
  if (ACTION_VERBS.has(firstWord)) {
    if (last.phrase.includes("-")) {
      // "verify-otp" already carries its object; the object is the noun, so
      // deepening reads "verify-trip-otp", not "verify-trip-verify-otp".
      const noun = last.phrase.split("-").slice(1).join("-");
      return intentName(firstWord, noun, ancestors, 0, droppedVersion);
    }
    const prev = resources.length > 1 ? resources[resources.length - 2] : undefined;
    if (!prev || GROUPING_SEGMENTS.has(prev.phrase)) {
      // "POST /auth/login" is just "login"; "POST /search" is just "search".
      return intentName(firstWord, "", [], 0, droppedVersion);
    }
    const noun = PLURAL_ACTIONS.has(firstWord) ? prev.phrase : singularPhrase(prev.phrase);
    return intentName(firstWord, noun, ancestors.slice(1), 0, droppedVersion);
  }

  // Plain REST: the method supplies the verb, the path shape the noun.
  const verbs = METHOD_VERBS[method.toLowerCase()];
  if (!verbs) return fallback; // HEAD, OPTIONS, WebDAV — honest concat.

  if (lastIsParam) {
    // GET /trips/{id} → the member named by the last resource segment. Two
    // or more trailing params are a lookup by the last one:
    // GET /trips/{username}/{slug} → "get-trip-by-slug".
    const noun = lastParam
      ? `${singularPhrase(last.phrase)}-by-${lastParam}`
      : singularPhrase(last.phrase);
    return intentName(verbs.member, noun, ancestors, 0, droppedVersion);
  }

  if (MEMBER_WORDS.has(last.phrase)) {
    // A bare trailing member word with no parent ("/me"): no noun to build.
    return intentName(verbs.member, last.phrase, [], 0, droppedVersion);
  }

  // A trailing resource word that reads plural is a collection; a singular
  // one is a singleton sub-resource (GET /auth/session → "get-session").
  const member = !pluralize.isPlural(last.phrase.split("-").pop() as string);
  // POST with a trailing resource always creates one of it, whether the word
  // reads singular or plural: "create-trip-template", "create-trip-block".
  const verb = member && method.toLowerCase() !== "post" ? verbs.member : verbs.collection;
  // Collection nouns stay plural when the verb acts on the whole set
  // ("list-trips", "delete-trips"); "create" makes one, so "create-trip".
  const noun = member || verb === "create" ? singularPhrase(last.phrase) : last.phrase;

  // Nested under a member ("/trips/{id}/blocks"): the immediate parent goes
  // into the base name, because parentless nested names collide constantly.
  const parent = resources.length > 1 ? resources[resources.length - 2] : undefined;
  if (last.nestedUnderMember && parent && !GROUPING_SEGMENTS.has(parent.phrase)) {
    return intentName(verb, noun, ancestors, 1, droppedVersion);
  }

  return intentName(verb, noun, ancestors, 0, droppedVersion);
}

// --- The set-level pass ----------------------------------------------------

export interface NameInput {
  name: string;
  /**
   * Declared names (schema/manual sources, cleaned operationIds) are fixed:
   * they win collisions and are never deepened, because a human or a spec
   * author chose them on purpose.
   */
  declared: boolean;
  httpMethod?: string;
  pathTemplate?: string;
}

export interface ResolvedNames {
  names: string[];
  renames: { from: string; to: string }[];
  notes: string[];
}

/**
 * Assign final names to a whole tool set.
 *
 * Route-derived names start minimal ("generate-story") and absorb parent
 * context on collision ("generate-trip-story") — minimal first because the
 * short name is usually unique, deepening because a bare noun stops saying
 * which resource once a second API has one. When no context remains, the
 * HTTP method and then a counter break the tie. Declared names always win a
 * collision. Every rename is returned for the report.
 */
export function resolveNames(inputs: NameInput[]): ResolvedNames {
  const analyses = inputs.map((input) =>
    !input.declared && input.httpMethod && input.pathTemplate
      ? analyzeRoute(input.httpMethod, input.pathTemplate)
      : null,
  );

  const notes: string[] = [];
  if (analyses.some((a) => a?.droppedVersion)) {
    notes.push("Dropped the API version prefix from route-derived tool names.");
  }

  // The name each candidate started with, so renames can be reported.
  const bases = inputs.map((input, index) => analyses[index]?.base ?? input.name);
  const depth = analyses.map((a) => a?.minDepth ?? 0);
  // Candidates that took a method/counter suffix are fixed from then on.
  const fixed: (string | null)[] = inputs.map(() => null);

  const nameAt = (index: number): string => {
    const pinned = fixed[index];
    if (pinned) return pinned;
    const analysis = analyses[index];
    if (analysis?.tier !== "intent") return bases[index] as string;
    const used = (analysis.context ?? []).slice(0, depth[index] as number).reverse();
    return [analysis.verb, ...used, analysis.noun].filter(Boolean).join("-");
  };

  for (let guard = 0; guard < 32; guard++) {
    const current = inputs.map((_, index) => nameAt(index));
    const byName = new Map<string, number[]>();
    current.forEach((name, index) => {
      byName.set(name, [...(byName.get(name) ?? []), index]);
    });
    const collisions = [...byName.values()].filter((group) => group.length > 1);
    if (collisions.length === 0) break;

    let deepened = false;
    for (const group of collisions) {
      for (const index of group) {
        const analysis = analyses[index];
        if (fixed[index] || !analysis || analysis.tier !== "intent") continue;
        if ((depth[index] as number) < (analysis.context?.length ?? 0)) {
          depth[index] = (depth[index] as number) + 1;
          deepened = true;
        }
      }
    }
    if (deepened) continue;

    // Nobody can deepen. The declared name (or the first arrival) keeps the
    // spot; the rest take a method suffix, then a counter. A method suffix
    // that repeats the verb says nothing ("get-trip-get"), so those go
    // straight to the counter.
    for (const group of collisions) {
      const ordered = [...group].sort(
        (a, b) => Number(!inputs[a]?.declared) - Number(!inputs[b]?.declared),
      );
      for (let k = 1; k < ordered.length; k++) {
        const index = ordered[k] as number;
        const base = nameAt(index);
        const method = inputs[index]?.httpMethod?.toLowerCase();
        let candidate =
          method && !base.startsWith(`${method}-`) ? `${base}-${method}` : `${base}-2`;
        let counter = 2;
        while (inputs.some((_, j) => j !== index && nameAt(j) === candidate)) {
          candidate = `${base}-${counter}`;
          counter += 1;
        }
        fixed[index] = candidate;
      }
    }
  }

  const names = inputs.map((_, index) => nameAt(index));
  const renames = names
    .map((to, index) => ({ from: bases[index] as string, to }))
    .filter((rename) => rename.from !== rename.to);

  return { names, renames, notes };
}
