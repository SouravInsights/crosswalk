import Link from "next/link";
import { CopyCommand } from "@/components/copy-command";

const COMMAND = "npx webmcp-codegen generate";

/* Code lines are token arrays so the panels get real syntax color:
   kw (keywords, phosphor), str (strings, amber), id (identifiers, ink),
   pun (punctuation, faint), com (comments, ghost). */

type Tok = [text: string, cls?: "kw" | "str" | "id" | "pun" | "com"];

const TOK_CLASS: Record<NonNullable<Tok[1]>, string> = {
  kw: "text-phosphor",
  str: "text-signal",
  id: "text-ink",
  pun: "text-faint",
  com: "text-ghost italic",
};

const SPEC: Tok[][] = [
  [["paths:", "id"]],
  [["  /pets/{id}/adopt:", "str"]],
  [["    post:", "kw"]],
  [["      operationId: ", "id"], ["adoptPet", "str"]],
  [["      summary: ", "id"], ['"Adopt a pet"', "str"]],
  [["      parameters:", "id"]],
  [["        - name: ", "id"], ["id", "str"]],
  [["          in: ", "id"], ["path", "str"]],
  [["          required: ", "id"], ["true", "kw"]],
];

const TOOL: Tok[][] = [
  [["// generated. Do not edit this region.", "com"]],
  [["export", "kw"], [" const ", "pun"], ["adoptPetTool", "id"], [" = {", "pun"]],
  [["  name: ", "id"], ['"adopt-pet"', "str"], [",", "pun"]],
  [["  description: ", "id"], ['"Adopt a pet"', "str"], [",", "pun"]],
  [["  inputSchema: ", "id"], ["adoptPetInputSchema", "id"], [",", "pun"]],
  [["};", "pun"]],
  [],
  [["export", "kw"], [" type ", "pun"], ["AdoptPetInput", "id"], [" = { ", "pun"], ["id", "id"], [": ", "pun"], ["string", "kw"], [" };", "pun"]],
  [],
  [["// your code below survives regeneration", "com"]],
  [["export", "kw"], [" async function ", "pun"], ["executeAdoptPet", "id"], ["(input) {", "pun"]],
  [["  // yours, forever", "com"]],
];

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Point it at your project",
    body: "It finds your API spec on its own. Nothing to install, nothing to configure.",
  },
  {
    title: "Look at the report",
    body: "Every endpoint becomes a tool, checked and labeled. Anything that looks risky gets flagged before anything is written.",
  },
  {
    title: "Fill in the part that's yours",
    body: "Each file has a part that stays in sync with your spec and a part you write yourself. Re-running never touches your part.",
  },
];

const RULES: Array<[string, string]> = [
  ["an endpoint is added", "a new file appears, with space for your code"],
  ["the spec changed", "only the part generated from the spec updates"],
  ["nothing changed", "nothing gets rewritten, and your git history stays quiet"],
  ["you edited the generated part", "your version wins; the update waits in a separate file"],
];

const AUDIT: Array<{ text: string; tone?: "dim" | "warn" | "err" }> = [
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

const FACTS = [
  "no install",
  "no config",
  "no runtime dependency",
  "dry-run first",
  "watch mode",
  "CI-friendly",
  "node 20+",
  "MIT",
];

function CodeLines({ lines }: { lines: Tok[][] }) {
  return (
    <>
      {lines.map((tokens, i) => (
        <div key={i}>
          {tokens.length === 0
            ? " "
            : tokens.map(([text, cls], j) => (
                <span key={j} className={cls ? TOK_CLASS[cls] : "text-dim"}>
                  {text}
                </span>
              ))}
        </div>
      ))}
    </>
  );
}

function PanelChrome({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
      <span className="size-2 rounded-full bg-line" aria-hidden="true" />
      <span className="size-2 rounded-full bg-line" aria-hidden="true" />
      <span className="size-2 rounded-full bg-line" aria-hidden="true" />
      <span className="ml-2 font-mono text-[11px] text-ghost">{label}</span>
    </div>
  );
}

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

      {/* Hero: centered type, glow, command, then the product in one glance. */}
      <section className="relative overflow-hidden">
        <div className="gs-grid-bg absolute inset-0" aria-hidden="true" />
        <div
          className="absolute left-1/2 top-[-260px] size-[720px] -translate-x-1/2 rounded-full bg-phosphor/[0.07] blur-[130px]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-5 pt-36 sm:px-6 sm:pt-44">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-phosphor">
              openapi → webmcp
            </p>
            <h1 className="mb-6 font-display text-[clamp(2.4rem,7vw,4.6rem)] font-medium leading-[1.03] tracking-[-0.02em]">
              Your API spec, as agent tools.
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-[16px] leading-relaxed text-dim sm:text-[17px]">
              WebMCP lets AI agents call your app through tools. Writing those tools by
              hand means copying names, types, and descriptions out of your API spec, one
              endpoint at a time. This does it for you, and keeps them up to date when your
              API changes.
            </p>
            <div className="flex flex-col items-center gap-4">
              <CopyCommand command={COMMAND} />
              <Link
                href="/docs"
                className="font-mono text-sm text-dim transition-colors duration-150 hover:text-ink"
                style={{ transitionTimingFunction: "var(--ease-reading)" }}
              >
                read the docs →
              </Link>
            </div>
          </div>

          {/* The transformation, in the hero. Spec on the left, file on the right. */}
          <div className="mx-auto mt-16 grid max-w-5xl items-center gap-3 sm:mt-24 lg:grid-cols-[1fr_auto_1.15fr]">
            <div className="border border-line bg-panel">
              <PanelChrome label="openapi.yaml" />
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[11.5px] leading-relaxed">
                <CodeLines lines={SPEC} />
              </pre>
            </div>

            <div
              className="rotate-90 self-center justify-self-center font-mono text-lg text-phosphor lg:rotate-0"
              aria-hidden="true"
            >
              →
            </div>

            <div className="border border-line bg-panel">
              <PanelChrome label="src/webmcp/adopt-pet.webmcp.ts" />
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[11.5px] leading-relaxed">
                <CodeLines lines={TOOL} />
              </pre>
            </div>
          </div>

          {/* Caption: what maps to what. */}
          <div className="mx-auto mt-6 flex max-w-5xl flex-wrap justify-center gap-x-10 gap-y-2 pb-16 font-mono text-[11.5px] text-faint sm:pb-24">
            <span>name ← operationId</span>
            <span>description ← summary</span>
            <span>types ← parameters + body</span>
          </div>
        </div>
      </section>

      {/* Steps: big quiet numerals, no cards. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-12 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <p className="mb-4 font-display text-[2.6rem] font-medium leading-none text-line">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mb-2 text-[16px] font-medium text-ink">{step.title}</h3>
                <p className="text-[14px] leading-relaxed text-dim">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rules: a ledger with arrows. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em]">
            Safe to re-run, by design
          </h2>
          <p className="mb-10 max-w-xl text-[15px] leading-relaxed text-dim sm:mb-14">
            Most generators are run-once scaffolding. Your API keeps changing, so this one
            is built to be run again. Exactly what happens each time:
          </p>

          <div className="border-y border-line">
            {RULES.map(([when, then], i) => (
              <div
                key={when}
                className={`grid gap-1.5 px-1 py-4 sm:grid-cols-[minmax(0,2fr)_auto_minmax(0,3fr)] sm:items-baseline sm:gap-6 sm:py-5 ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <p className="font-mono text-[12.5px] leading-relaxed text-faint">{when}</p>
                <p className="hidden font-mono text-[12.5px] text-ghost sm:block" aria-hidden="true">
                  →
                </p>
                <p className="text-[14.5px] leading-relaxed text-ink">{then}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-xl text-[14.5px] leading-relaxed text-dim">
            The files are plain TypeScript and don't depend on the tool. Stop using it
            tomorrow and everything you generated keeps working.
          </p>
        </div>
      </section>

      {/* Safety: asymmetric. Copy on the left, evidence on the right. */}
      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-14">
          <div>
            <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em]">
              It checks before it writes
            </h2>
            <p className="mb-6 text-[15px] leading-relaxed text-dim">
              Before anything is written, every tool gets checked: what it does, what it
              might expose, whether it sounds safe. Anything that looks wrong stops the
              run.
            </p>
            <p className="text-[15px] leading-relaxed text-dim">
              Tools are labeled by what they can do. Responses that might expose personal
              data get flagged. Problems stop here, not in front of your users' agents.
            </p>
          </div>

          <div className="border border-line bg-panel">
            <PanelChrome label="terminal" />
            <pre className="overflow-x-auto px-4 py-4 font-mono text-[11.5px] leading-relaxed sm:text-[12.5px]">
              {AUDIT.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.tone === "warn"
                      ? "text-signal"
                      : line.tone === "err"
                        ? "text-fault"
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

      {/* Facts: one quiet strip. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2.5 font-mono text-[12px] text-faint">
            {FACTS.map((fact) => (
              <span key={fact}>{fact}</span>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-xl text-center text-[13px] leading-relaxed text-faint">
            One honest note: WebMCP itself is still early. The tools run today in Chrome
            behind a flag, or anywhere with a small polyfill. OpenAPI is supported now;
            tRPC, Zod, and Prisma are on the roadmap.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-line">
        <div
          className="absolute bottom-[-280px] left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-phosphor/[0.05] blur-[120px]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-20 text-center sm:px-6 sm:py-28">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-medium tracking-[-0.015em]">
            Try it on your spec.
          </h2>
          <p className="mx-auto mb-10 max-w-md text-dim">
            The first run writes nothing. It only shows you the tools hiding in your API.
          </p>
          <div className="flex justify-center">
            <CopyCommand command={`${COMMAND} --dry-run`} />
          </div>
        </div>
      </section>
    </main>
  );
}
