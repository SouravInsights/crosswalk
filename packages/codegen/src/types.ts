/**
 * The shared shapes that flow through the codegen pipeline.
 *
 * Every stage of the pipeline speaks in these types:
 *
 *   Source → CandidateTool → (safety review) → ReviewedTool → Generator → GeneratedFile
 *
 * A source (OpenAPI today, tRPC/Zod later) only has to produce CandidateTools.
 * A generator only has to turn ReviewedTools into files. Everything in between
 * lives here so the stages stay independent.
 */

/**
 * A relaxed JSON Schema type. Real-world schemas (especially from OpenAPI)
 * carry keywords we don't model individually, so unknown keywords are allowed
 * through untouched instead of being rejected.
 */
export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  description?: string;
  format?: string;
  nullable?: boolean;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
  [keyword: string]: unknown;
}

/** Which source a candidate came from. Grows as new sources are added. */
export type SourceKind = "openapi" | "trpc" | "zod" | "prisma" | "graphql" | "manual";

/**
 * What the tool does to the world. The safety layer derives this from the
 * HTTP method plus naming heuristics; it drives both the MCP hints and the
 * risk tier.
 */
export type SideEffect = "read" | "write" | "destructive" | "unknown";

/** How dangerous the tool is to expose to an agent. */
export type RiskTier = "safe-read" | "write-confirm" | "destructive-confirm";

/**
 * A tool being considered for generation. Sources produce these; nothing is
 * written to disk until the safety layer has reviewed every candidate.
 */
export interface CandidateTool {
  /** Stable id used for diffing across regenerations. */
  id: string;
  /** The final tool name an agent will see (validated, de-duplicated). */
  name: string;
  /** Where this candidate came from, e.g. `{ kind: "openapi", ref: "GET /orders/{id}" }`. */
  source: { kind: SourceKind; ref: string };
  /** Always derived from the source contract, never hand-typed. */
  inputSchema: JsonSchema;
  /** Present when the source has response typing. */
  outputSchema?: JsonSchema;
  /** Name of the generated TypeScript input type, e.g. "GetOrderStatusInput". */
  inputTypeName: string;
  httpMethod?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  sideEffect: SideEffect;
  requiresAuth: boolean;
  /** Where the description text came from. Always reviewable before commit. */
  description: string;
  descriptionSource: "openapi-summary" | "generated-template";
}

/** The MCP hints the spec defines for a tool, computed by the safety layer. */
export interface ToolHints {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
}

/** A candidate after safety review: classified, hinted, and linted. */
export interface ReviewedTool extends CandidateTool {
  riskTier: RiskTier;
  hints: ToolHints;
  /**
   * Output field paths the PII heuristics flagged (e.g. "user.email").
   * These are fields that would leave the page and reach the agent.
   */
  piiInOutput: string[];
}

/** One audit finding. Errors block generation (unless --force); warnings don't. */
export interface AuditFinding {
  level: "error" | "warning";
  /** Tool name this finding is about, or undefined for project-level findings. */
  tool?: string;
  message: string;
}

/** A file the generator wants to write. */
export interface GeneratedFile {
  /** Absolute path on disk. */
  path: string;
  /** Full new contents. */
  contents: string;
  /** What writing this file would do. Used for the report and --dry-run. */
  action: "create" | "update" | "unchanged";
  /**
   * Present when an existing file was edited by hand in the generated region,
   * so we refused to touch it. The new contents go to a `.new` sibling instead.
   */
  conflict?: string;
}

/**
 * A source reads an existing contract and produces candidate tools.
 * Create one with a helper like `openapi({ spec: "./openapi.yaml" })`.
 */
export interface Source {
  readonly kind: SourceKind;
  collect(): Promise<CandidateTool[]>;
}

/**
 * A generator turns reviewed tools into files.
 * Named after what lands in your repo: `js`, `html`, `react`, `manifest`.
 */
export interface ToolGenerator {
  readonly kind: string;
  generate(tools: ReviewedTool[], cwd: string): Promise<GeneratedFile[]>;
}

/** Safety knobs. Everything here extends defaults; nothing is required. */
export interface SafetyOptions {
  /** Extra field names to treat as PII, on top of the built-in list. */
  piiFields?: string[];
  /** Tool names or source refs to skip entirely (substrings, case-insensitive). */
  exclude?: string[];
}

/** The config file shape. Create it with `defineConfig` for type checking. */
export interface CodegenConfig {
  sources: Source[];
  generate: ToolGenerator[];
  safety?: SafetyOptions;
}
