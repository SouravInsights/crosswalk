import { ArrowRight } from "lucide-react";
import Link from "next/link";

/* Section 2: the transformation. The product in one glance:
   this spec fragment becomes this file. */

const SPEC_LINES: Array<{ text: string; tone?: "key" | "dim" }> = [
  { text: "paths:", tone: "dim" },
  { text: "  /pets/{id}/adopt:", tone: "dim" },
  { text: "    post:", tone: "dim" },
  { text: "      operationId: adoptPet", tone: "key" },
  { text: '      summary: "Adopt a pet"', tone: "key" },
  { text: "      parameters:", tone: "dim" },
  { text: "        - name: id", tone: "dim" },
  { text: "          in: path", tone: "dim" },
  { text: "          required: true", tone: "dim" },
  { text: "          schema: { type: string }", tone: "dim" },
];

const TOOL_LINES: Array<{ text: string; tone?: "key" | "dim" | "marker" }> = [
  { text: "// ─── generated. Do not edit this region. ───", tone: "marker" },
  { text: "export const adoptPetTool = {", tone: "dim" },
  { text: '  name: "adopt-pet",', tone: "key" },
  { text: '  description: "Adopt a pet",', tone: "key" },
  { text: "  inputSchema: adoptPetInputSchema,", tone: "dim" },
  { text: "};", tone: "dim" },
  { text: "", tone: "dim" },
  { text: "export type AdoptPetInput = { id: string };", tone: "key" },
  { text: "", tone: "dim" },
  { text: "// ─── your code below survives regeneration ───", tone: "marker" },
  { text: "export async function executeAdoptPet(input) {", tone: "dim" },
  { text: "  // yours, forever", tone: "marker" },
];

/* Section 3: the rules, stated plainly. */

const RULES: Array<[string, string]> = [
  ["a new endpoint appears", "a new file appears too, with a stub for your code"],
  ["the spec changed", "only the top part of the file updates"],
  ["nothing changed", "nothing is written, so no noise in git"],
  ["you edited the top part by hand", "your file is left alone; the new version goes to a .new file"],
];

/* Section 4: the safety report. Real output, not a mockup. */

const AUDIT_LINES: Array<{ text: string; tone?: "dim" | "warn" | "err" }> = [
  { text: "$ npx webmcp-codegen generate", tone: "dim" },
  { text: "" },
  { text: "  list-pets    [read]        ← GET /pets" },
  { text: "  create-pet   [write]       ← POST /pets" },
  { text: "  delete-pet   [destructive] ← DELETE /pets/{id}" },
  { text: "" },
  { text: "  ⚠ The response may expose owner.email. Flagged for review. (create-pet)", tone: "warn" },
  { text: "  ✖ The name sounds destructive, but GET is a safe verb. (delete-all)", tone: "err" },
  { text: "" },
  { text: "Stopped: fix the errors above, or pass --force to write anyway.", tone: "dim" },
];

/* Section 5: the details. */

const FACTS: Array<[string, string]> = [
  ["no config needed", "finds your spec on its own, works in monorepos"],
  ["nothing to install", "run it with npx, your project stays clean"],
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
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="flex items-center gap-2.5 font-mono text-sm tracking-tight text-ink">
            <span className="inline-block size-2 bg-phosphor" aria-hidden="true" />
            webmcp-codegen
          </span>
          <nav className="flex items-center gap-6 font-mono text-[13px] text-dim">
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

      {/* Hero */}
      <section className="relative border-b border-line">
        <div className="gs-grid-bg absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-36 sm:pt-44 lg:pb-32">
          <p className="mb-6 font-mono text-[12px] uppercase tracking-[0.25em] text-phosphor">
            openapi → webmcp
          </p>
          <h1 className="mb-7 max-w-3xl font-display text-[clamp(2.6rem,5.5vw,4.4rem)] font-medium leading-[1.05] tracking-[-0.02em]">
            OpenAPI in.
            <br />
            <span className="text-faint">WebMCP tools out.</span>
          </h1>
          <p className="mb-10 max-w-xl text-[17px] leading-relaxed text-dim">
            WebMCP lets AI agents call your app through tools. Writing those tools by hand
            means copying names, schemas, and descriptions out of your spec for every
            endpoint. This tool does it for you, and keeps them in sync when your API
            changes.
          </p>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="border border-line bg-panel px-4 py-3 font-mono text-sm">
              <span className="select-none text-ghost">$ </span>
              npx webmcp-codegen generate
            </div>
            <Link
              href="/docs"
              className="group inline-flex items-center gap-1.5 font-mono text-sm text-phosphor transition-colors duration-150 hover:text-ink"
              style={{ transitionTimingFunction: "var(--ease-reading)" }}
            >
              read the docs
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <h2 className="mb-3 font-display text-[clamp(1.7rem,3vw,2.3rem)] font-medium tracking-[-0.015em]">
            How it works
          </h2>
          <p className="mb-12 max-w-lg text-dim">
            Run it in a project that has an OpenAPI spec. It finds the spec, reads every
            endpoint, and writes one TypeScript file per tool.
          </p>

          <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1.2fr]">
            {/* The spec */}
            <div className="border border-line bg-panel">
              <p className="border-b border-line px-4 py-2.5 font-mono text-[11px] text-ghost">
                openapi.yaml
              </p>
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-relaxed">
                {SPEC_LINES.map((line, i) => (
                  <div key={i} className={line.tone === "key" ? "text-ink" : "text-faint"}>
                    {line.text || " "}
                  </div>
                ))}
              </pre>
            </div>

            {/* The arrow is the command. */}
            <div className="flex items-center justify-center gap-3 px-2 py-2 font-mono text-[12px] text-ghost lg:flex-col lg:gap-2">
              <span className="hidden lg:inline">npx</span>
              <span>webmcp-codegen</span>
              <span>generate</span>
              <ArrowRight className="h-4 w-4 text-phosphor lg:rotate-90" />
            </div>

            {/* The tool */}
            <div className="border border-line bg-panel">
              <p className="border-b border-line px-4 py-2.5 font-mono text-[11px] text-ghost">
                src/webmcp/adopt-pet.webmcp.ts
              </p>
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-relaxed">
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

          <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-dim">
            The name comes from the operationId. The description comes from your summary.
            The input schema comes from your parameters and request body, with every $ref
            resolved. Your spec's own words go into the agent's prompt.
          </p>
        </div>
      </section>

      {/* You own the code */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <h2 className="mb-3 font-display text-[clamp(1.7rem,3vw,2.3rem)] font-medium tracking-[-0.015em]">
            You own the code
          </h2>
          <p className="mb-4 max-w-xl text-dim">
            Each generated file has two parts. Everything above the marker line comes from
            your spec and updates when the spec changes. Everything below it is your code,
            and the tool never touches it. Re-running is safe:
          </p>

          <div className="mt-12 border border-line">
            {RULES.map(([when, then], i) => (
              <div
                key={when}
                className={`grid gap-1 px-6 py-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-8 ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <p className="font-mono text-[13px] leading-relaxed text-faint">{when}</p>
                <p className="text-[15px] leading-relaxed text-ink">{then}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-dim">
            The files are plain TypeScript with no runtime dependency on the package. Stop
            using the tool tomorrow and everything you generated keeps working.
          </p>
        </div>
      </section>

      {/* Safety checks */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <h2 className="mb-3 font-display text-[clamp(1.7rem,3vw,2.3rem)] font-medium tracking-[-0.015em]">
            Safety checks built in
          </h2>
          <p className="mb-12 max-w-lg text-dim">
            Every tool is checked before any file is written. The report shows what each
            tool can do, and anything that looks dangerous stops the run.
          </p>

          <div className="border border-line bg-panel">
            <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
              <span className="size-2 rounded-full bg-line" aria-hidden="true" />
              <span className="size-2 rounded-full bg-line" aria-hidden="true" />
              <span className="size-2 rounded-full bg-line" aria-hidden="true" />
              <span className="ml-2 font-mono text-[11px] text-ghost">
                real output, no mockup
              </span>
            </div>
            <pre className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-relaxed">
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

          <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-dim">
            Tools are labeled read, write, or destructive. Response fields that look like
            personal data get flagged. Errors stop the run with exit code 1, so CI catches
            them before your users do.
          </p>
        </div>
      </section>

      {/* Details */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <h2 className="mb-12 font-mono text-[12px] uppercase tracking-[0.25em] text-faint">
            details
          </h2>
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map(([fact, detail]) => (
              <div key={fact} className="bg-baseline p-6">
                <p className="mb-2 font-mono text-[13px] text-phosphor">{fact}</p>
                <p className="text-[13px] leading-relaxed text-dim">{detail}</p>
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

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-2 font-display text-[clamp(1.4rem,2.4vw,1.9rem)] font-medium tracking-[-0.015em]">
                Try it on your spec.
              </h2>
              <p className="max-w-md text-dim">
                The first run writes nothing. It only shows you the tools hiding in your
                API.
              </p>
            </div>
            <div className="border border-line bg-panel px-4 py-3 font-mono text-sm">
              <span className="select-none text-ghost">$ </span>
              npx webmcp-codegen generate --dry-run
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
