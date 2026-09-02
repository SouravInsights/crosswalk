/**
 * CLI output rendering. The design goal: a summary you can scan in three
 * seconds, with the next step always visible. Every line must earn its place
 * and be understandable by someone who has never seen the tool before.
 */

import type { GenerateResult } from "./pipeline.js";
import type { Setup } from "./setup.js";
import type { WirePlan } from "./wire.js";

// ANSI escapes
const ESC = "\x1b[";
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;

const FG = {
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  cyan: `${ESC}36m`,
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

/** Group findings by what the user needs to know. */
function summarizeFindings(findings: GenerateResult["findings"]): {
  auth: number;
  admin: number;
  pii: number;
  postAsRead: number;
  other: number;
} {
  const counts = { auth: 0, admin: 0, pii: 0, postAsRead: 0, other: 0 };
  for (const f of findings) {
    const msg = f.message.toLowerCase();
    if (msg.includes("sign-in") || msg.includes("auth") || msg.includes("session")) {
      counts.auth++;
    } else if (msg.includes("admin")) {
      counts.admin++;
    } else if (msg.includes("pii") || msg.includes("email")) {
      counts.pii++;
    } else if (msg.includes("post") && msg.includes("read")) {
      counts.postAsRead++;
    } else {
      counts.other++;
    }
  }
  return counts;
}

/** The default summary output — written for humans, not machines. */
export function renderSummary(
  result: GenerateResult,
  setup: Setup,
  _cwd: string,
  wiring?: WirePlan | null,
): void {
  const { tools, findings, skipped } = result;
  const enabled = tools.filter((t) => t.enabledByDefault).length;

  const findingCounts = summarizeFindings(findings);
  const totalFindings = findings.length;

  // Header
  console.log("");
  console.log(`  ${bold("webmcp-codegen")}`);
  console.log(dim(`  ${setup.label}`));
  console.log("");

  // What happened
  console.log(`  ${c("green", "✓")} ${bold(`${tools.length} tools generated`)}`);
  console.log(dim(`    ${enabled} ready to use, ${tools.length - enabled} start disabled`));
  if (skipped.length > 0) {
    console.log(dim(`    ${skipped.length} skipped (webhooks and excluded endpoints)`));
  }
  console.log("");

  // Safety notes — human-readable
  if (totalFindings > 0) {
    console.log(
      `  ${c("yellow", "!")} ${bold(`${totalFindings} safety note${totalFindings === 1 ? "" : "s"}`)}`,
    );
    if (findingCounts.auth > 0) {
      console.log(
        dim(
          `    ${findingCounts.auth} auth endpoint${findingCounts.auth === 1 ? "" : "s"} disabled (agents shouldn't sign in)`,
        ),
      );
    }
    if (findingCounts.admin > 0) {
      console.log(
        dim(
          `    ${findingCounts.admin} admin endpoint${findingCounts.admin === 1 ? "" : "s"} disabled (review each before enabling)`,
        ),
      );
    }
    if (findingCounts.pii > 0) {
      console.log(
        dim(
          `    ${findingCounts.pii} endpoint${findingCounts.pii === 1 ? "" : "s"} may return personal data`,
        ),
      );
    }
    if (findingCounts.postAsRead > 0) {
      console.log(
        dim(
          `    ${findingCounts.postAsRead} POST endpoint${findingCounts.postAsRead === 1 ? "" : "s"} treated as read-only (verify this is correct)`,
        ),
      );
    }
    console.log(dim(`    Run with --verbose to see all details`));
    console.log("");
  }

  // Where things went
  const outDir = setup.config.generate[0]?.outDir ?? "src/webmcp";
  console.log(`  ${c("cyan", "→")} ${bold("Files")} ${outDir}`);
  if (wiring && !wiring.alreadyWired) {
    console.log(`  ${c("cyan", "→")} ${bold("Registration")} wired into your app`);
  }
  console.log("");

  // Next step
  console.log(`  ${bold("Next:")} ${c("cyan", "npx @webmcp-stack/codegen dev")}`);
  console.log(dim("  Review your tools, edit descriptions, test them live"));
  console.log("");
  console.log(dim(`  Docs: https://webmcp-stack.vercel.app/docs`));
  console.log("");
}

/** Verbose output — every tool, for when you want the full list. */
export function renderVerbose(result: GenerateResult, setup: Setup, _cwd: string): void {
  const { tools, findings, skipped } = result;

  console.log("");
  console.log(bold(`webmcp-codegen`));
  console.log(dim(`${tools.length} tools from ${setup.label}`));
  console.log("");

  // Skipped first
  if (skipped.length > 0) {
    console.log(c("gray", "Skipped:"));
    for (const s of skipped) {
      console.log(`  ${dim(s.ref)}`);
      console.log(`    ${dim(s.reason)}`);
    }
    console.log("");
  }

  // Tools grouped by risk
  const byRisk = {
    read: tools.filter((t) => t.sideEffect === "read"),
    write: tools.filter((t) => t.sideEffect === "write"),
    destructive: tools.filter((t) => t.sideEffect === "destructive"),
  };

  const riskLabels: Record<string, string> = {
    read: c("green", "Read-only"),
    write: c("yellow", "Write"),
    destructive: c("red", "Destructive"),
  };

  for (const [risk, group] of Object.entries(byRisk)) {
    if (group.length === 0) continue;
    console.log(riskLabels[risk] ?? risk);
    for (const tool of group) {
      const status = tool.enabledByDefault ? "" : dim(" (disabled)");
      console.log(`  ${tool.name}${status}`);
      if (tool.description) console.log(`    ${dim(tool.description)}`);
    }
    console.log("");
  }

  // Findings
  if (findings.length > 0) {
    console.log(bold("Safety notes:"));
    for (const f of findings) {
      const icon = f.level === "error" ? c("red", "✖") : c("yellow", "⚠");
      const where = f.tool ? dim(` (${f.tool})`) : "";
      console.log(`  ${icon} ${f.message}${where}`);
    }
    console.log("");
  }

  console.log(dim(`Files: ${setup.config.generate[0]?.outDir ?? "src/webmcp"}`));
  console.log(dim(`Docs: https://webmcp-stack.vercel.app/docs`));
  console.log("");
}
