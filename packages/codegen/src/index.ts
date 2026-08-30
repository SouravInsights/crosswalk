/**
 * webmcp-codegen — public API.
 *
 * Most people only ever need `defineConfig`. Sources and generators live
 * behind their own subpaths ("webmcp-codegen/sources", "…/generators") so
 * the top-level import stays small.
 */

export { defineConfig } from "./config.js";
export type { GenerateOptions, GenerateResult } from "./pipeline.js";
export { runGenerate } from "./pipeline.js";
export type {
  AuditFinding,
  CandidateTool,
  CodegenConfig,
  GeneratedFile,
  JsonSchema,
  ReviewedTool,
  RiskTier,
  SafetyOptions,
  SideEffect,
  Source,
  SourceKind,
  ToolGenerator,
  ToolHints,
} from "./types.js";
