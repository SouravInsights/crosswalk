/**
 * The pipeline: sources → normalize → safety review → audit → write.
 *
 * This module is the only place the stages meet. It owns no opinions of its
 * own — naming, safety, and file formats all live in their own modules — it
 * just runs them in order and produces one honest report of what happened
 * (or what *would* happen, when called with `write: false`).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { dedupeNames } from "./naming.js";
import { auditTools, reviewTools } from "./safety.js";
import { pascalCase } from "./schema.js";
import type { AuditFinding, CodegenConfig, GeneratedFile, ReviewedTool } from "./types.js";

export interface GenerateOptions {
  /** Project root. Everything (config, spec paths, outDir) resolves from here. */
  cwd: string;
  /** Preview mode: compute everything, write nothing. */
  dryRun?: boolean;
  /** Skip the audit pass entirely (classification still runs — output needs it). */
  skipAudit?: boolean;
  /** Write even when the audit found errors. The report still shows them. */
  force?: boolean;
}

export interface GenerateResult {
  tools: ReviewedTool[];
  findings: AuditFinding[];
  files: GeneratedFile[];
  /** True when audit errors stopped any file from being written. */
  blocked: boolean;
  /** True when this run actually wrote files (false for dry runs and blocks). */
  wrote: boolean;
}

export async function runGenerate(
  config: CodegenConfig,
  options: GenerateOptions,
): Promise<GenerateResult> {
  // 1. Collect candidate tools from every configured source.
  const candidates = (await Promise.all(config.sources.map((source) => source.collect()))).flat();

  // 2. Normalize: make names unique before anything downstream sees them.
  //    The input type name is derived from the *final* name so they never drift.
  const { names, renames } = dedupeNames(candidates);
  const named = candidates.map((candidate, index) => {
    const name = names[index] ?? candidate.name;
    return { ...candidate, name, inputTypeName: `${pascalCase(name)}Input` };
  });

  // 3. Safety review: classify side effects, compute hints, scan for PII,
  //    apply config exclusions.
  const tools = reviewTools(named, config.safety);

  // 4. Audit. Errors block the write unless --force (or --skip-audit) was passed.
  const findings = options.skipAudit ? [] : auditTools(tools, renames);
  const errors = findings.filter((finding) => finding.level === "error");
  const blocked = errors.length > 0 && !options.force && !options.skipAudit;

  if (blocked) {
    return { tools, findings, files: [], blocked, wrote: false };
  }

  // 5. Generate the files, then write them (unless this is a dry run).
  const files: GeneratedFile[] = [];
  for (const generator of config.generate) {
    files.push(...(await generator.generate(tools, options.cwd)));
  }

  let wrote = false;
  if (!options.dryRun) {
    for (const file of files) {
      if (file.action === "unchanged" && !file.conflict) continue;
      // A conflict means a human edited the generated region by hand:
      // leave their file alone and put our version in a `.new` sibling.
      const target = file.conflict ?? file.path;
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.conflict ? conflictContents(file) : file.contents);
    }
    wrote = true;
  }

  return { tools, findings, files, blocked, wrote };
}

/**
 * When a hand-edited file blocks regeneration, the `.new` file explains
 * itself at the top so nobody mistakes it for something to import.
 */
function conflictContents(file: GeneratedFile): string {
  return (
    `// webmcp-codegen could not regenerate ${file.path} because its generated\n` +
    `// region was edited by hand. Review this version, then merge it manually.\n\n` +
    file.contents
  );
}
