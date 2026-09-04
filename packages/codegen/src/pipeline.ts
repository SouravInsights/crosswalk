/**
 * The pipeline: sources → normalize → safety review → audit → write.
 *
 * This module is the only place the stages meet. It owns no opinions of its
 * own; naming, safety, and file formats all live in their own modules. It
 * just runs them in order and produces one honest report of what happened
 * (or what *would* happen, when called with `write: false`).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { describeCandidateInputs } from "./describe.js";
import { mergeSchemaWithOperations } from "./merge.js";
import { dedupeNames, stripVersionPrefix } from "./naming.js";
import { auditTools, reviewTools } from "./safety.js";
import { pascalCase } from "./json-schema.js";
import type {
  AuditFinding,
  CodegenConfig,
  GeneratedFile,
  ReviewedTool,
  SkippedEndpoint,
  ToolOverrides,
} from "./types.js";

export interface GenerateOptions {
  /** Project root. Everything (config, spec paths, outDir) resolves from here. */
  cwd: string;
  /** Preview mode: compute everything, write nothing. */
  dryRun?: boolean;
  /** Skip the audit pass entirely (classification still runs; output needs it). */
  skipAudit?: boolean;
  /** Write even when the audit found errors. The report still shows them. */
  force?: boolean;
  /**
   * Hand-authored tweaks from .webmcp-codegen.json (usually written by the
   * dev dashboard). Applied after the safety review so they survive
   * regeneration.
   */
  overrides?: ToolOverrides;
}

export interface GenerateResult {
  tools: ReviewedTool[];
  /** Endpoints deliberately not generated (webhooks, config exclusions). */
  skipped: SkippedEndpoint[];
  findings: AuditFinding[];
  files: GeneratedFile[];
  /** Human-facing pipeline notes, e.g. "stripped the shared v1 prefix". */
  notes: string[];
  /** True when audit errors stopped any file from being written. */
  blocked: boolean;
  /** True when this run actually wrote files (false for dry runs and blocks). */
  wrote: boolean;
}

export async function runGenerate(
  config: CodegenConfig,
  options: GenerateOptions,
): Promise<GenerateResult> {
  const notes: string[] = [];

  // 1. Collect candidate tools from every configured source.
  const candidates = (await Promise.all(config.sources.map((source) => source.collect()))).flat();

  // 2. Merge: a schema entry that names an OpenAPI operation fuses with it
  //    into one candidate (the schema's contract and words, the endpoint's
  //    mechanics). A merge target that does not exist is an error, not a
  //    silent standalone fallback.
  const merge = mergeSchemaWithOperations(candidates);

  // 3. Describe: fill field text in layer order. Author text stays verbatim
  //    (constraints appended when missing); silent fields get a marked draft.
  //    Developer overrides (layer 5) run later, in step 6, so they always win.
  for (const candidate of merge.tools) describeCandidateInputs(candidate);

  // 4. Normalize names. First drop a shared API version prefix ("get-v1-x"
  //    → "get-x") when nearly every name carries it, then dedupe what remains.
  //    Strip before dedupe: stripping can create collisions, dedupe resolves them.
  const stripped = stripVersionPrefix(merge.tools);
  if (stripped.note) notes.push(stripped.note);
  const versioned = merge.tools.map((candidate, index) => ({
    ...candidate,
    name: stripped.names[index] ?? candidate.name,
  }));
  const { names, renames } = dedupeNames(versioned);
  const named = versioned.map((candidate, index) => {
    const name = names[index] ?? candidate.name;
    return { ...candidate, name, inputTypeName: `${pascalCase(name)}Input` };
  });

  // 5. Safety review: classify side effects, compute hints, scan for PII,
  //    apply endpoint roles and config exclusions. Webhooks never come back.
  const { tools, skipped } = reviewTools(named, config.safety);

  // 6. Hand-authored overrides (dashboard edits) win over every derived
  //    layer, field text included: an override is the developer's final word,
  //    so nothing appends to it afterwards.
  const fieldOverrideTypos: { tool: string; field: string }[] = [];
  if (options.overrides) {
    for (const tool of tools) {
      const override = options.overrides[tool.name];
      if (!override) continue;
      if (typeof override.description === "string" && override.description.trim()) {
        tool.description = override.description.trim();
        // A hand-written description is no longer a template; stop warning about it.
        tool.descriptionSource = "declared";
      }
      if (typeof override.enabled === "boolean") {
        tool.enabledByDefault = override.enabled;
      }
      if (override.fields) {
        const properties = tool.inputSchema.properties ?? {};
        for (const [field, text] of Object.entries(override.fields)) {
          if (!properties[field]) {
            // An override that matches nothing is a typo, and a silent typo
            // means a field the developer meant to document stays bare.
            fieldOverrideTypos.push({ tool: tool.name, field });
            continue;
          }
          properties[field] = { ...properties[field], description: text };
        }
        // Overridden fields carry author text now; they are not synthesized.
        tool.synthesizedFields = (tool.synthesizedFields ?? []).filter(
          (field) => !(field in (override.fields ?? {})),
        );
      }
    }
  }

  // 7. Audit. Errors block the write unless --force (or --skip-audit) was passed.
  const findings = options.skipAudit
    ? []
    : [
        ...merge.findings,
        ...auditTools(tools, renames),
        ...fieldOverrideTypos.map((typo) => ({
          level: "warning" as const,
          tool: typo.tool,
          message:
            `Override for field "${typo.field}" matches no input field on this tool. ` +
            "Check the spelling in .webmcp-codegen.json.",
        })),
      ];
  const errors = findings.filter((finding) => finding.level === "error");
  const blocked = errors.length > 0 && !options.force && !options.skipAudit;

  if (blocked) {
    return { tools, skipped, findings, files: [], notes, blocked, wrote: false };
  }

  // 8. Run the outputs, then write the files (unless this is a dry run).
  //    Tools with a form pointer belong to the form output; without one
  //    configured they generate as ordinary tool files, loudly.
  const formOutput = config.outputs.find((output) => output.kind === "form");
  const fileOutputs = config.outputs.filter((output) => output.kind !== "form");
  const formTools = tools.filter((tool) => tool.form);

  let toolsForFiles = tools;
  if (formOutput) {
    toolsForFiles = tools.filter((tool) => !tool.form);
  } else if (formTools.length > 0) {
    findings.push({
      level: "warning",
      message:
        `${formTools.map((tool) => tool.name).join(", ")} declare a form path, but no form ` +
        "output is configured, so they generated as tool files. " +
        'Add form({...}) to outputs, or remove the "form" pointer.',
    });
  }

  const files: GeneratedFile[] = [];
  for (const output of fileOutputs) {
    files.push(...(await output.generate(toolsForFiles, options.cwd)));
  }
  if (formOutput) {
    files.push(...(await formOutput.generate(formTools, options.cwd)));
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

  return { tools, skipped, findings, files, notes, blocked, wrote };
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
