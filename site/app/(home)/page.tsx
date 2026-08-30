import { ArrowRight } from "lucide-react";
import Link from "next/link";

/* The shape of the problem, measured in hand-written boilerplate per endpoint. */
const BY_HAND: Array<[step: string, weight: string]> = [
  ["Write a registerTool() call", "1"],
  ["Copy the route's types into a JSON Schema", "2"],
  ["Write a description an agent can reason over", "3"],
  ["Get readOnly/destructive hints right", "4"],
  ["Keep it all in sync as the API evolves", "∞"],
];

const GENERATED: Array<[step: string, weight: string]> = [
  ["npx webmcp-codegen generate", "1"],
  ["Schemas derived from the spec, $refs resolved", "—"],
  ["Descriptions from your summaries", "—"],
  ["Hints classified from verb + naming", "—"],
  ["Re-run on spec change; your execute() survives", "—"],
];

/* Real output from a real run — not a mockup. */
const REPORT: Array<{ text: string; tone?: "dim" | "warn" | "ok" }> = [
  { text: "$ npx webmcp-codegen generate", tone: "dim" },
  { text: "" },
  { text: "Detected apps/server/openapi/openapi.json" },
  { text: "" },
  { text: "  list-pets    [safe-read]           ← GET /pets" },
  { text: "  create-pet   [write-confirm]       ← POST /pets" },
  { text: "  get-pet      [safe-read]           ← GET /pets/{id}" },
  { text: "  delete-pet   [destructive-confirm] ← DELETE /pets/{id}" },
  { text: "" },
  { text: "  ⚠ Response may expose owner.email — excluded by default (create-pet)", tone: "warn" },
  { text: "" },
  { text: "Done. Fill in each execute() below the marker.", tone: "ok" },
];

const PROMISES: Array<{ title: string; body: string }> = [
  {
    title: "you own the output",
    body: "Real TypeScript files in your repo. No runtime dependency on the package — uninstall it after generating and everything still works.",
  },
  {
    title: "regeneration never clobbers",
    body: "The contract lives above a marker line and regenerates freely. Your execute() lives below it and is never touched. Hand-edit the generated region and you get a .new file, not an overwrite.",
  },
  {
    title: "safety is built in",
    body: "Every tool is classified read/write/destructive, gets correct MCP hints, and passes an audit that flags PII in responses and vague descriptions. Audit errors block generation — CI-gateable, like npm audit.",
  },
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
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-36 sm:pt-44 lg:grid-cols-[1fr_460px] lg:gap-16 lg:pb-28">
          <div>
            <h1 className="mb-7 font-display text-[clamp(2.6rem,5.5vw,4.2rem)] font-medium leading-[1.06] tracking-[-0.02em]">
              Your API spec already knows your tools.
              <br />
              <span className="text-faint">Stop hand-writing them.</span>
            </h1>

            <p className="mb-10 max-w-lg text-[17px] leading-relaxed text-dim">
              WebMCP lets agents call your app's tools — but somebody has to write a
              registerTool() per endpoint, and keep every schema and description in sync by
              hand. webmcp-codegen generates them from the OpenAPI spec you already have:
              typed, classified, audited, and yours.
            </p>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="border border-line bg-panel px-4 py-3 font-mono text-sm">
                <span className="select-none text-ghost">$ </span>
                npx webmcp-codegen generate
              </div>
              <Link
                href="/docs/quickstart"
                className="group inline-flex items-center gap-1.5 font-mono text-sm text-phosphor transition-colors duration-150 hover:text-ink"
                style={{ transitionTimingFunction: "var(--ease-reading)" }}
              >
                three-step quickstart
                <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Real output from a real run, not a mockup. */}
          <div className="w-full lg:justify-self-end">
            <div className="border border-line bg-panel">
              <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
                <span className="size-2 rounded-full bg-line" aria-hidden="true" />
                <span className="size-2 rounded-full bg-line" aria-hidden="true" />
                <span className="size-2 rounded-full bg-line" aria-hidden="true" />
                <span className="ml-2 font-mono text-[11px] text-ghost">terminal</span>
              </div>
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-relaxed">
                {REPORT.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.tone === "dim"
                        ? "text-ghost"
                        : line.tone === "warn"
                          ? "text-amber-400/90"
                          : line.tone === "ok"
                            ? "text-phosphor"
                            : "text-dim"
                    }
                  >
                    {line.text || " "}
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Seventy endpoints, twice */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <h2 className="mb-3 font-display text-[clamp(1.7rem,3vw,2.3rem)] font-medium tracking-[-0.015em]">
            One API, exposed twice.
          </h2>
          <p className="mb-12 max-w-lg text-dim">
            The work of making an API agent-callable, by hand and by generation. The shape is
            the same whether you have five endpoints or five hundred.
          </p>

          <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
            <div className="bg-baseline p-7">
              <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
                by hand, per endpoint
              </p>
              <ol className="divide-y divide-line/60">
                {BY_HAND.map(([step, weight], i) => (
                  <li key={step} className="flex items-baseline gap-4 py-3 text-[15px]">
                    <span className="w-4 shrink-0 text-right font-mono text-xs text-ghost">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed text-faint">{step}</span>
                    <span className="ml-auto shrink-0 pl-4 font-mono text-xs text-ghost">
                      {weight}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-baseline p-7">
              <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-phosphor">
                with webmcp-codegen
              </p>
              <ol className="divide-y divide-line/60">
                {GENERATED.map(([step, weight], i) => (
                  <li key={step} className="flex items-baseline gap-4 py-3 text-[15px]">
                    <span className="w-4 shrink-0 text-right font-mono text-xs text-ghost">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed text-ink">{step}</span>
                    <span className="ml-auto shrink-0 pl-4 font-mono text-xs text-ghost">
                      {weight}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* The three promises */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <h2 className="mb-3 font-display text-[clamp(1.7rem,3vw,2.3rem)] font-medium tracking-[-0.015em]">
            Codegen you can trust with your repo.
          </h2>
          <p className="mb-12 max-w-lg text-dim">
            The failure mode of codegen tools is taking control away — hidden state, silent
            overwrites, magic you can't diff. webmcp-codegen is built around the opposite.
          </p>

          <div className="grid gap-px border border-line bg-line lg:grid-cols-3">
            {PROMISES.map((promise) => (
              <div key={promise.title} className="bg-baseline p-7">
                <p className="mb-4 font-mono text-[13px] text-phosphor">{promise.title}</p>
                <p className="text-[15px] leading-relaxed text-dim">{promise.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-2 font-display text-[clamp(1.4rem,2.4vw,1.9rem)] font-medium tracking-[-0.015em]">
                Point it at your spec.
              </h2>
              <p className="max-w-md text-dim">
                No install, no config. The first run is a dry-run away.
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
