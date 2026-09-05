/**
 * The LLM layer: advisory, always optional, never load-bearing.
 *
 * Why this file is shaped the way it is: the codegen's trust model rests on
 * the audit being reproducible. Same input, same findings, same exit codes,
 * on a laptop or in CI. A model breaks that, so the boundary here is a hard
 * rule, not a guideline:
 *
 *   THE MODEL PROPOSES. THE DEVELOPER DISPOSES.
 *
 * Concretely, in this version:
 *   - proposals surface only as `◦` report lines. Nothing is written to a
 *     file, because the acceptance surface (dashboard accept/reject) is a
 *     deliberate follow-up; without a place to dispose, nothing is applied.
 *   - the layer never classifies side effects or risk tiers, never changes
 *     exit codes, and never blocks a run. A missing key means off; a failing
 *     provider means one warning line and the deterministic run continues.
 *   - it runs only on what is still machine-written after the deterministic
 *     layers (template tool descriptions, synthesized field text). Author
 *     text is never sent back for "improvement".
 *
 * The prompts below are the shipped defaults, benchmarked against the WebMCP
 * docs' examples. `llm.prompts` in the config overrides them per task: the
 * developer owns the words going into their agent's prompt.
 */

import { createHash } from "node:crypto";
import type {
  AuditFinding,
  CodegenConfig,
  LlmOptions,
  LlmProvider,
  LlmSuggestion,
  LlmTask,
  ReviewedTool,
} from "./types.js";

/** What the layer needs from the rest of the pipeline. */
export interface LlmContext {
  tools: ReviewedTool[];
  findings: AuditFinding[];
  /** Module exports for the `suggest` task: name + JSON Schema text. */
  suggestExports?: { name: string; schemaText: string }[];
}

const DEFAULT_PROMPTS: Record<LlmTask, string> = {
  describe: [
    "You write WebMCP tool descriptions. Agents pick tools by these words and fill",
    "inputs from them, so be concrete, imperative, and one sentence per item. State",
    "what the tool does and what each field means; mention constraints you are given.",
    'Answer with JSON only: { "description"?: string, "fields": { "<name>": string } }.',
  ].join(" "),
  relationship: [
    "You are given a tool field whose description says its value comes from another",
    "tool, plus the list of tools that exist. Name the likeliest producer tool, or",
    'null if none fits. Answer with JSON only: { "producer": string | null }.',
  ].join(" "),
  "semantic-review": [
    "You review WebMCP tool descriptions against their input schemas. Flag only real",
    'contradictions (a "fetch" description on a writing schema, a field described as',
    "the opposite of its type). Silence is a good outcome. Answer with JSON only:",
    '{ "contradictions": [{ "tool": string, "issue": string }] }.',
  ].join(" "),
  suggest: [
    "You are given exported validation schemas from a web app. Propose which should",
    "become agent-facing WebMCP tools: user-meaningful actions, not plumbing. For each,",
    "name (kebab-case, verb-first), one-sentence description, and whether it writes.",
    'Answer with JSON only: { "tools": [{ "name": string, "description": string, "write": boolean }] }.',
  ].join(" "),
};

/**
 * Resolve the configured provider, or undefined (layer off). Explicit opt-in
 * is the config key: an OPENAI_API_KEY in the environment must not turn a
 * `generate` run into a network call the developer never asked for.
 * (`generate --suggest` is the explicit command, and honors env keys.)
 */
export function resolveLlmProvider(
  options: LlmOptions | undefined,
  env: NodeJS.ProcessEnv = process.env,
): LlmProvider | undefined {
  if (!options) return undefined;
  if (options.provider) return options.provider;
  const apiKey = options.apiKey ?? env.WEBMCP_LLM_API_KEY ?? env.OPENAI_API_KEY;
  if (!apiKey) return undefined;
  return openAiCompatibleProvider(
    apiKey,
    options.baseUrl ?? "https://api.openai.com/v1",
    options.model ?? "gpt-4o-mini",
  );
}

/**
 * The free hosted tier: our own proxy holds the key server-side, so a
 * developer with no provider account can still try the LLM layer. Rate
 * limits live on the proxy; the CLI just points at it. The proxy ignores
 * the bearer — the real key never leaves the server.
 */
export const HOSTED_LLM_URL = "https://webmcp-stack.vercel.app/api/llm";

export function hostedLlmProvider(): LlmProvider {
  return openAiCompatibleProvider("hosted", HOSTED_LLM_URL, "openai/gpt-4o-mini");
}

/**
 * The built-in provider: any OpenAI-compatible chat-completions endpoint,
 * via plain fetch. Zero dependencies is a feature of this package, so the
 * wire format is spelled out rather than imported.
 */
function openAiCompatibleProvider(apiKey: string, baseUrl: string, model: string): LlmProvider {
  return {
    name: `openai-compatible (${model})`,
    async complete(task, prompt, system) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            // The developer's per-task override wins over the shipped default;
            // config.llm.prompts exists so teams can tune these.
            { role: "system", content: system ?? DEFAULT_PROMPTS[task] },
            { role: "user", content: prompt },
          ],
          temperature: 0,
        }),
        // A hung endpoint must never hang a generate run.
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        throw new Error(`LLM endpoint answered HTTP ${response.status}`);
      }
      const body = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = body.choices?.[0]?.message?.content;
      if (!content) throw new Error("LLM endpoint returned no content");
      return content;
    },
  };
}

/**
 * In-run cache, keyed by content hash. Many fields share a shape (every
 * "name" string in a spec), so identical questions are asked once per run.
 * Deliberately not a disk cache: a cache file in the user's repo is noise,
 * and stale-across-runs is a bug class this sidesteps entirely.
 */
function cached(provider: LlmProvider): LlmProvider {
  const seen = new Map<string, Promise<string>>();
  return {
    name: provider.name,
    complete(task, prompt, system) {
      // The system prompt is part of the question's identity: the same
      // question under two different overrides must not share an answer.
      const key = createHash("sha256")
        .update(task)
        .update("\0")
        .update(system ?? "")
        .update("\0")
        .update(prompt)
        .digest("hex");
      let pending = seen.get(key);
      if (!pending) {
        pending = provider.complete(task, prompt, system);
        seen.set(key, pending);
      }
      return pending;
    },
  };
}

/** Extract the JSON object from a completion that may wrap it in prose. */
function parseCompletionJson(text: string): Record<string, unknown> | undefined {
  const direct = tryParse(text);
  if (direct) return direct;
  const fenced = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/.exec(text);
  if (fenced) return tryParse(fenced[1] as string);
  const braces = /\{[\s\S]*\}/.exec(text);
  return braces ? tryParse(braces[0]) : undefined;
}

function tryParse(text: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Run every enabled touchpoint and collect proposals. Never throws: a broken
 * provider yields one suggestion line explaining the failure, and the rest of
 * the run is exactly the deterministic one.
 */
export async function runLlmLayer(
  config: CodegenConfig,
  context: LlmContext,
  env?: NodeJS.ProcessEnv,
  /** When the caller already resolved a provider (the interactive key
   *  chooser), pass it so the layer does not re-resolve from config/env. */
  explicitProvider?: LlmProvider,
): Promise<LlmSuggestion[]> {
  const configured = explicitProvider ?? resolveLlmProvider(config.llm, env);
  if (!configured) return [];
  const provider = cached(configured);
  const prompts = { ...DEFAULT_PROMPTS, ...config.llm?.prompts };
  const suggestions: LlmSuggestion[] = [];

  const jobs: Promise<void>[] = [
    proposeDescriptions(provider, prompts.describe, context.tools, suggestions),
    proposeProducers(provider, prompts.relationship, context, suggestions),
    reviewSemantics(provider, prompts["semantic-review"], context.tools, suggestions),
  ];
  if (context.suggestExports && context.suggestExports.length > 0) {
    jobs.push(proposeTools(provider, prompts.suggest, context.suggestExports, suggestions));
  }

  // Each job catches its own failures; this allSettled is the belt to their
  // suspenders, because an LLM failure must never surface as a run failure.
  await Promise.allSettled(jobs);
  return suggestions;
}

/**
 * Draft prose for what the deterministic layers left machine-written:
 * template tool descriptions and synthesized field text. Author text is
 * never in scope.
 */
async function proposeDescriptions(
  provider: LlmProvider,
  prompt: string,
  tools: ReviewedTool[],
  suggestions: LlmSuggestion[],
): Promise<void> {
  const needy = tools.filter(
    (tool) =>
      tool.descriptionSource === "generated-template" || (tool.synthesizedFields ?? []).length > 0,
  );
  for (const tool of needy) {
    const fields = (tool.synthesizedFields ?? [])
      .map((name) => {
        const schema = tool.inputSchema.properties?.[name];
        return `"${name}": ${JSON.stringify(schema)}`;
      })
      .join(", ");
    const question =
      `Tool "${tool.name}" (currently described as "${tool.description}"). ` +
      (fields ? `Fields needing text: { ${fields} }.` : "No fields need text.");
    try {
      const answer = parseCompletionJson(await provider.complete("describe", question, prompt));
      if (typeof answer?.description === "string" && answer.description.trim()) {
        suggestions.push({
          task: "describe",
          tool: tool.name,
          message: `${tool.name}: draft description: "${answer.description.trim()}"`,
        });
      }
      const fieldDrafts = answer?.fields;
      if (fieldDrafts && typeof fieldDrafts === "object") {
        for (const [field, text] of Object.entries(fieldDrafts)) {
          if (typeof text === "string" && text.trim()) {
            suggestions.push({
              task: "describe",
              tool: tool.name,
              field,
              message: `${tool.name}.${field}: draft: "${text.trim()}"`,
            });
          }
        }
      }
    } catch (error) {
      suggestions.push(failureNote("describe", tool.name, error));
      return; // One failure is enough; hammering a broken endpoint helps nobody.
    }
  }
}

/**
 * Where the deterministic rule found a field referencing a producer tool that
 * does not exist, ask the model whether an existing tool could produce it.
 * A suggestion here is inference, so it is always a proposal, never a finding.
 */
async function proposeProducers(
  provider: LlmProvider,
  prompt: string,
  context: LlmContext,
  suggestions: LlmSuggestion[],
): Promise<void> {
  const gaps = context.findings.filter(
    (finding) => finding.tool && finding.message.includes("no such tool"),
  );
  const toolNames = context.tools.map((tool) => tool.name);
  for (const gap of gaps) {
    const question =
      `Field in tool "${gap.tool}": ${gap.message}\n` +
      `Existing tools: ${toolNames.join(", ") || "(none)"}.`;
    try {
      const answer = parseCompletionJson(await provider.complete("relationship", question, prompt));
      const producer = answer?.producer;
      if (typeof producer === "string" && toolNames.includes(producer)) {
        suggestions.push({
          task: "relationship",
          tool: gap.tool,
          message: `${gap.tool}: "${producer}" looks like it could produce that value. Link them?`,
        });
      }
    } catch (error) {
      suggestions.push(failureNote("relationship", gap.tool, error));
      return;
    }
  }
}

/**
 * A second pair of eyes on author-written descriptions: contradictions with
 * the schema only. Advisory even when enabled; nothing here blocks anything.
 */
async function reviewSemantics(
  provider: LlmProvider,
  prompt: string,
  tools: ReviewedTool[],
  suggestions: LlmSuggestion[],
): Promise<void> {
  const described = tools
    .filter((tool) => tool.descriptionSource !== "generated-template")
    .slice(0, 25); // Cost guard: one bounded call, not a novel per spec.
  if (described.length === 0) return;
  const question = described
    .map((tool) => {
      const fields = Object.keys(tool.inputSchema.properties ?? {}).join(", ");
      return `"${tool.name}": "${tool.description}" (fields: ${fields})`;
    })
    .join("\n");
  try {
    const answer = parseCompletionJson(
      await provider.complete("semantic-review", question, prompt),
    );
    const contradictions = answer?.contradictions;
    if (Array.isArray(contradictions)) {
      for (const item of contradictions) {
        const entry = item as { tool?: unknown; issue?: unknown };
        if (typeof entry.tool === "string" && typeof entry.issue === "string") {
          suggestions.push({
            task: "semantic-review",
            tool: entry.tool,
            message: `${entry.tool}: ${entry.issue}`,
          });
        }
      }
    }
  } catch (error) {
    suggestions.push(failureNote("semantic-review", undefined, error));
  }
}

/** `generate --suggest <module>`: which exported schemas are worth a tool? */
async function proposeTools(
  provider: LlmProvider,
  prompt: string,
  exports_: { name: string; schemaText: string }[],
  suggestions: LlmSuggestion[],
): Promise<void> {
  const question = exports_.map((entry) => `${entry.name}: ${entry.schemaText}`).join("\n\n");
  try {
    const answer = parseCompletionJson(await provider.complete("suggest", question, prompt));
    const proposed = answer?.tools;
    if (Array.isArray(proposed)) {
      for (const item of proposed) {
        const entry = item as { name?: unknown; description?: unknown; write?: unknown };
        if (typeof entry.name === "string" && typeof entry.description === "string") {
          suggestions.push({
            task: "suggest",
            tool: entry.name,
            message:
              `${entry.name}: ${entry.description} ` +
              `(${entry.write === true ? "write" : "read"}; declare it in codegen.config.mjs to generate)`,
          });
        }
      }
    }
  } catch (error) {
    suggestions.push(failureNote("suggest", undefined, error));
  }
}

/** A provider failure is reported as a suggestion-shaped note, never an error. */
function failureNote(task: LlmTask, tool: string | undefined, error: unknown): LlmSuggestion {
  return {
    task,
    tool,
    message: `LLM ${task} failed (${error instanceof Error ? error.message : String(error)}). The deterministic run is unaffected.`,
  };
}
