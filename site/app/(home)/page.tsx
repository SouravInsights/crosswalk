import Link from "next/link";
import { CopyCommand } from "@/components/copy-command";

/* The command that does everything. It appears twice on the page. */
const COMMAND = "npx webmcp-codegen generate";

/* ── Hero panels: the product in one glance. Spec in, file out. ── */

const SPEC_LINES: Array<{ text: string; key?: boolean }> = [
  { text: "paths:" },
  { text: "  /pets/{id}/adopt:" },
  { text: "    post:" },
  { text: "      operationId: adoptPet", key: true },
  { text: '      summary: "Adopt a pet"', key: true },
  { text: "      parameters:" },
  { text: "        - name: id" },
  { text: "          in: path" },
  { text: "          required: true" },
  { text: "          schema: { type: string }" },
];

const TOOL_LINES: Array<{ text: string; tone?: "key" | "dim" | "marker" }> = [
  { text: "// generated. Do not edit this region.", tone: "marker" },
  { text: "export const adoptPetTool = {", tone: "dim" },
  { text: '  name: "adopt-pet",', tone: "key" },
  { text: '  description: "Adopt a pet",', tone: "key" },
  { text: "  inputSchema: adoptPetInputSchema,", tone: "dim" },
  { text: "};", tone: "dim" },
  { text: "", tone: "dim" },
  { text: "export type AdoptPetInput = { id: string };", tone: "key" },
  { text: "", tone: "dim" },
  { text: "// your code below survives regeneration", tone: "marker" },
  { text: "export async function executeAdoptPet(input) {", tone: "dim" },
  { text: "  // yours, forever", tone: "marker" },
];

/* ── Section: three steps, as a numbered index ── */

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Point it at your repo",
    body: "It finds your OpenAPI or Swagger spec on its own, monorepos included. Nothing to install, nothing to configure.",
  },
  {
    title: "Review the report",
    body: "Every endpoint becomes a tool: named, typed, and labeled read, write, or destructive. Anything that looks dangerous stops the run before a line is written.",
  },
  {
    title: "Fill in one function",
    body: "Each file has a marker line. The spec contract lives above it and stays in sync. Your execute() lives below it and is never touched.",
  },
];

/* ── Section: the rules, as a ledger of terms ── */

const RULES: Array<[string, string]> = [
  ["a new endpoint appears", "a new file appears too, with a stub for your code"],
  ["the spec changed", "only the part above the marker updates"],
  ["nothing changed", "nothing is written, so no noise in git"],
  ["you edited the top part by hand", "your file wins; the new version lands in a .new file"],
];

/* ── Section: the safety report, real output ── */

const AUDIT_LINES: Array<{ text: string; tone?: "dim" | "warn" | "err" }> = [
  { text: "$ npx webmcp-codegen generate", tone: "dim" },
  { text: "" },
  { text: "  list-pets    [read]         ← GET /pets" },
  { text: "  create-pet   [write]        ← POST /pets" },
  { text: "  delete-pet   [destructive]  ← DELETE /pets/{id}" },
  { text: "" },
  { text: "  ⚠ The response may expose owner.email. Flagged for review. (create-pet)", tone: "warn" },
  { text: "  ✖ The name sounds destructive, but GET is a safe verb. (delete-all)", tone: "err" },
  { text: "" },
  { text: "Stopped: fix the errors above, or pass --force to write anyway.", tone: "dim" },
];

/* ── Section: the details ── */

const FACTS: Array<[string, string]> = [
  ["no config needed", "finds your spec on its own, works in monorepos"],
  ["nothing to install", "runs with npx, your project stays clean"],
  ["no runtime dependency", "generated files never import the package"],
  ["dry run", "--dry-run shows every file before writing anything"],
  ["watch mode", "--watch regenerates when the spec changes"],
  ["works in CI", "stops the build when the safety check fails"],
  ["node", ">= 20"],
  ["license", "MIT"],
];

export default function HomePage() {
  return (
    <main className="dark flex-1 bg-baseline font-sans text-ink">
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <span className="flex items-center gap-2.5 font-mono text-sm tracking-tight text-ink">
            <span className="inline-block size-2 bg-phosphor" aria-hidden="true" />
            webmcp-codegen
          </span>
          <nav className="flex items-center gap-5 font-mono text-[13px] text-dim sm:gap-6">
            <Link
              href="/docs"
              className="transition-colors duration-150 hover:text-ink"
              style={{ transitionTimingFunction: "var(--ease-reading)" }}
            >
              docs
            </Link>
            <a
              href="https://github.com/souravinsights/groundstate"
              className="transition-colors duration-150 hover:text-ink"
              style={{ transitionTimingFunction: "var(--ease-reading)" }}
            >
              github
            </a>
          </nav>
        </div>
      </header>

      {/* Hero: headline, command, and the product in one glance.
          On mobile the panels stack full width with a downward arrow. */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="gs-grid-bg absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-32 sm:px-6 sm:pb-24 sm:pt-40">
          <h1 className="mb-6 max-w-3xl font-display text-[clamp(2.2rem,7vw,4.2rem)] font-medium leading-[1.04] tracking-[-0.02em]">
            Your API spec, as agent tools.
          </h1>
          <p className="mb-9 max-w-xl text-[16px] leading-relaxed text-dim sm:text-[17px]">
            WebMCP lets AI agents call your app through tools. Writing them by hand means
            copying names, schemas, and descriptions out of your spec for every endpoint.
            This does it for you, and keeps them in sync when your API changes.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <CopyCommand command={COMMAND} />
            <Link
              href="/docs"
              className="font-mono text-sm text-phosphor transition-colors duration-150 hover:text-ink"
              style={{ transitionTimingFunction: "var(--ease-reading)" }}
            >
              read the docs →
            </Link>
          </div>

          {/* The transformation, right here in the hero. */}
          <div className="mt-14 grid items-center gap-3 sm:mt-20 lg:grid-cols-[1fr_auto_1.15fr]">
            <div className="border border-line bg-panel">
              <p className="border-b border-line px-4 py-2 font-mono text-[11px] text-ghost">
                openapi.yaml
              </p>
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[11.5px] leading-relaxed">
                {SPEC_LINES.map((line, i) => (
                  <div key={i} className={line.key ? "text-ink" : "text-faint"}>
                    {line.text || " "}
                  </div>
                ))}
              </pre>
            </div>

            <div
              className="rotate-90 self-center justify-self-center font-mono text-phosphor lg:rotate-0"
              aria-hidden="true"
            >
              →
            </div>

            <div className="border border-line bg-panel">
              <p className="border-b border-line px-4 py-2 font-mono text-[11px] text-ghost">
                src/webmcp/adopt-pet.webmcp.ts
              </p>
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[11.5px] leading-relaxed">
                {TOOL_LINES.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.tone === "key"
                        ? "text-ink"
                        : line.tone === "marker"
                          ? "text-phosphor"
                          : "text-faint"
                    }
                  >
                    {line.text || " "}
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Three steps, as a numbered index. */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-10 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em] sm:mb-14">
            Three steps, no setup
          </h2>
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <p className="mb-3 font-mono text-[13px] text-phosphor">0{i + 1}</p>
                <h3 className="mb-2 text-[16px] font-medium text-ink">{step.title}</h3>
                <p className="text-[14px] leading-relaxed text-dim">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The regeneration rules, as a ledger of terms. */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em]">
            Re-run it as often as you like
          </h2>
          <p className="mb-10 max-w-xl text-[15px] leading-relaxed text-dim sm:mb-14">
            Most codegen tools are scaffolding: run once, then you're on your own. Your API
            keeps changing, so this one is built to be re-run. The rules, exactly as they
            behave:
          </p>

          <div className="border border-line">
            {RULES.map(([when, then], i) => (
              <div
                key={when}
                className={`grid gap-1.5 px-5 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-8 sm:px-6 sm:py-5 ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <p className="font-mono text-[12.5px] leading-relaxed text-faint">{when}</p>
                <p className="text-[14.5px] leading-relaxed text-ink">{then}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-xl text-[14.5px] leading-relaxed text-dim">
            The files are plain TypeScript with no runtime dependency on the package. Stop
            using the tool tomorrow and everything you generated keeps working.
          </p>
        </div>
      </section>

      {/* The safety report: real output as evidence. */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em]">
            It checks before it writes
          </h2>
          <p className="mb-10 max-w-xl text-[15px] leading-relaxed text-dim sm:mb-14">
            Before any file is written, every tool gets labeled and checked. Warnings are
            informational. Errors stop the run with exit code 1, so CI catches them before
            your users do.
          </p>

          <div className="border border-line bg-panel">
            <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
              <span className="size-2 rounded-full bg-line" aria-hidden="true" />
              <span className="size-2 rounded-full bg-line" aria-hidden="true" />
              <span className="size-2 rounded-full bg-line" aria-hidden="true" />
              <span className="ml-2 font-mono text-[11px] text-ghost">real output</span>
            </div>
            <pre className="overflow-x-auto px-4 py-4 font-mono text-[11.5px] leading-relaxed sm:text-[12.5px]">
              {AUDIT_LINES.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.tone === "warn"
                      ? "text-amber-400/90"
                      : line.tone === "err"
                        ? "text-red-400/90"
                        : line.tone === "dim"
                          ? "text-ghost"
                          : "text-dim"
                  }
                >
                  {line.text || " "}
                </div>
              ))}
            </pre>
          </div>
        </div>
      </section>

      {/* The details. */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-10 font-mono text-[11px] uppercase tracking-[0.25em] text-faint sm:mb-12">
            details
          </h2>
          <div className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
            {FACTS.map(([fact, detail]) => (
              <div key={fact} className="bg-baseline p-5 sm:p-6">
                <p className="mb-1.5 font-mono text-[12.5px] text-phosphor">{fact}</p>
                <p className="text-[12.5px] leading-relaxed text-dim">{detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-xl text-[13px] leading-relaxed text-faint">
            One honest note: WebMCP itself is a draft spec. The tools run today in Chrome
            146+ behind #enable-webmcp-testing, or anywhere with the WebMCP polyfill. The
            OpenAPI source and the js generator are tested and shipping; tRPC, Zod, and
            Prisma sources are on the roadmap.
          </p>
        </div>
      </section>

      {/* CTA: same command, same copy affordance. */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-2 font-display text-[clamp(1.3rem,2.4vw,1.8rem)] font-medium tracking-[-0.015em]">
            Try it on your spec.
          </h2>
          <p className="mb-8 max-w-md text-dim">
            The first run writes nothing. It only shows you the tools hiding in your API.
          </p>
          <CopyCommand command={`${COMMAND} --dry-run`} />
        </div>
      </section>
    </main>
  );
}
