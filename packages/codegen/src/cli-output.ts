/**
 * CLI output rendering. The design goal: a summary you can scan in three
 * seconds, with the next step always visible. Verbose mode is for when you
 * want the full list.
 *
 * Uses ANSI escapes for color and layout. No dependencies — we control every
 * character so the output looks the same in every terminal.
 */

import type { GenerateResult } from "./pipeline.js";
import type { Setup } from "./setup.js";
import type { WirePlan } from "./wire.js";

// ANSI escapes
const ESC = "\x1b[";
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const ITALIC = `${ESC}3m`;

const FG = {
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  white: `${ESC}37m`,
  gray: `${ESC}90m`,
};

function c(color: keyof typeof FG, text: string): string {
  return `${FG[color]}${text}${RESET}`;
}

function bold(text: string): string {
  return `${BOLD}${text}${RESET}`;
}

export function dim(text: string): string {
  return `${DIM}${text}${RESET}`;
}

function italic(text: string): string {
  return `${ITALIC}${text}${RESET}`;
}

/** A colored header block. */
function header(title: string, subtitle: string): string {
  const line = "─".repeat(Math.max(title.length, subtitle.length) + 4);
  return `${c("cyan", line)}\n  ${bold(title)}\n  ${subtitle}\n${c("cyan", line)}`;
}

/** A risk badge with color. */
function badge(risk: string): string {
  switch (risk) {
    case "read":
      return c("green", "[read]");
    case "write":
      return c("yellow", "[write]");
    case "destructive":
      return c("red", "[destructive]");
    default:
      return `[${risk}]`;
  }
}

/** Group findings by kind for a scannable summary. */
function groupFindings(findings: GenerateResult["findings"]): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const f of findings) {
    const kind =
      f.message.includes("sign-in") || f.message.includes("auth")
        ? "auth"
        : f.message.includes("Admin")
          ? "admin"
          : f.message.includes("PII") || f.message.includes("email")
            ? "PII"
            : f.message.includes("POST treated as a read")
              ? "POST as read"
              : "other";
    groups[kind] = (groups[kind] ?? 0) + 1;
  }
  return groups;
}

/** The default summary output — three seconds to scan. */
export function renderSummary(
  result: GenerateResult,
  setup: Setup,
  _cwd: string,
  wiring?: WirePlan | null,
): void {
  const { tools, findings } = result;
  const reads = tools.filter((t) => t.sideEffect === "read").length;
  const writes = tools.filter((t) => t.sideEffect === "write").length;
  const destructives = tools.filter((t) => t.sideEffect === "destructive").length;
  const skipped = result.skipped.length;
  const warnings = findings.filter((f) => f.level === "warning").length;
  const errors = findings.filter((f) => f.level === "error").length;

  // Header
  console.log("");
  console.log(header("webmcp-codegen", `${tools.length} tools from ${setup.label}`));
  console.log("");

  // Summary line
  const summaryParts = [
    c("green", `${reads} read`),
    c("yellow", `${writes} write`),
    destructives > 0 ? c("red", `${destructives} destructive`) : null,
    skipped > 0 ? dim(`${skipped} skipped`) : null,
  ].filter(Boolean);
  console.log(`  ${summaryParts.join("  ")}\n`);

  // Warnings summary
  if (warnings > 0 || errors > 0) {
    const groups = groupFindings(findings);
    const parts = Object.entries(groups).map(([kind, count]) => {
      const color = kind === "auth" || kind === "admin" ? "yellow" : "gray";
      return `${c(color as keyof typeof FG, kind)} ${count}`;
    });
    console.log(`  ${c("yellow", "⚠")} ${warnings + errors} finding(s): ${parts.join(", ")}`);
    console.log(dim(`    Run with --verbose to see details\n`));
  }

  // Files
  const outDir = setup.config.generate[0]?.outDir ?? "src/webmcp";
  console.log(`  ${c("cyan", "→")} ${bold(outDir)}\n`);

  // Registration
  if (wiring && !wiring.alreadyWired) {
    console.log(`  ${c("green", "✔")} Registration wired into your app\n`);
  }

  // Next step
  console.log(`  ${bold("Next:")} ${c("cyan", "npx webmcp-codegen dev")} to review and test\n`);
}

/** Verbose output — every tool, grouped by risk. */
export function renderVerbose(result: GenerateResult, setup: Setup, _cwd: string): void {
  const { tools, findings, skipped } = result;

  console.log("");
  console.log(bold(`webmcp-codegen: ${tools.length} tools from ${setup.label}`));
  console.log("");

  // Skipped first (why things were excluded)
  if (skipped.length > 0) {
    console.log(c("gray", "Skipped:"));
    for (const s of skipped) {
      console.log(`  ${dim(s.ref)}`);
      console.log(`    ${italic(s.reason)}`);
    }
    console.log("");
  }

  // Tools grouped by risk
  const byRisk = {
    read: tools.filter((t) => t.sideEffect === "read"),
    write: tools.filter((t) => t.sideEffect === "write"),
    destructive: tools.filter((t) => t.sideEffect === "destructive"),
  };

  for (const [risk, group] of Object.entries(byRisk)) {
    if (group.length === 0) continue;
    console.log(badge(risk));
    for (const tool of group) {
      const disabled = tool.enabledByDefault ? "" : dim(" (starts disabled)");
      console.log(`  ${tool.name}${disabled}`);
      if (tool.description) console.log(`    ${dim(tool.description)}`);
    }
    console.log("");
  }

  // Findings
  if (findings.length > 0) {
    console.log(bold("Findings:"));
    for (const f of findings) {
      const icon = f.level === "error" ? c("red", "✖") : c("yellow", "⚠");
      const where = f.tool ? dim(` (${f.tool})`) : "";
      console.log(`  ${icon} ${f.message}${where}`);
    }
    console.log("");
  }

  console.log(`  ${c("cyan", "→")} Files in ${setup.config.generate[0]?.outDir ?? "src/webmcp"}\n`);
}
