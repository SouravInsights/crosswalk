import { ArrowDown } from "lucide-react";
import Link from "next/link";
import { CopyCommand } from "@/components/copy-command";
import { DashboardDemo } from "@/components/dashboard-demo";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

const COMMAND = "npx @webmcp-stack/codegen generate";

/* The logo, taken apart: three layers settling into a stack on load,
   top layer last. Same motion as the about page hero. */
function HeroMark() {
  return (
    <svg viewBox="0 0 24 27" fill="none" aria-hidden="true" className="size-16 text-dim sm:size-20">
      <path
        d="M3 19.5 L12 24 L21 19.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        className="layer-in"
        style={{ animationDelay: "0ms" }}
      />
      <path
        d="M3 13.5 L12 18 L21 13.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        className="layer-in"
        style={{ animationDelay: "140ms" }}
      />
      <path
        d="M12 5 L21 9.5 L12 14 L3 9.5 Z"
        fill="var(--color-accent)"
        className="layer-in"
        style={{ animationDelay: "280ms" }}
      />
    </svg>
  );
}

/* The whole product story in one scannable grid: what every generated
   tool carries, whatever it was generated from. */
const TOOL_STANDARD: Array<[string, string]> = [
  ["A name that says what it does", "generate-story, not post-trips-trip-id-story-generate."],
  [
    "A description an agent can act on",
    "What it does, when to use it, what it returns. In plain language.",
  ],
  [
    "Inputs spelled out in words",
    "Required, optional, allowed values, limits. Written in, never guessed.",
  ],
  [
    "Danger never ships by default",
    "Auth, admin, and destructive endpoints start blocked. Writes start disabled. An agent sees only what you choose.",
  ],
  ["Failures an agent can act on", "A reason and what to try next, never a stack trace."],
  [
    "A human keeps the final click",
    "Payments and deletes stop at a confirmation, not a warning sentence.",
  ],
  [
    "Re-runs never touch your code",
    "The spec moves, the tools update, your edits and git history survive.",
  ],
  [
    "No account, no telemetry, no runtime",
    "Plain TypeScript in your repo. The files never import this package.",
  ],
];

export default function HomePage() {
  return (
    <main className="dark flex-1 overflow-x-clip bg-baseline font-sans text-ink">
      <SiteNav overlay product="codegen" />

      {/* Hero: the mark settles, then the claim, the command, the proof. */}
      <section className="relative overflow-hidden">
        <div
          className="absolute left-1/2 top-[-260px] size-[720px] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-[130px]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-40">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-7 flex justify-center">
              <HeroMark />
            </div>
            <h1 className="mb-6 font-display text-[clamp(2.4rem,7vw,4.6rem)] font-medium leading-[1.03] tracking-[-0.02em]">
              Turn your API into tools AI agents can call.
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-[16px] leading-relaxed text-dim sm:text-[17px]">
              One command reads your OpenAPI spec or validation schemas and writes the WebMCP tools
              AI agents call: typed and checked for safety. Review and test them in the local
              playground.
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

          {/* The proof: the dashboard itself. The only WebMCP CLI that has one.
              The chip tells first-time visitors what they're looking at. */}
          <div className="mx-auto mt-10 max-w-5xl sm:mt-12">
            <div className="mb-5 flex justify-center">
              <span className="flex items-center gap-2 border border-line bg-panel px-3.5 py-1.5 font-mono text-[12px] text-dim">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                the built-in playground
                <ArrowDown className="size-3 text-faint" aria-hidden="true" />
              </span>
            </div>
            <DashboardDemo />
            <p className="mx-auto mt-5 max-w-md text-center text-[13px] leading-relaxed text-faint">
              <span className="font-mono text-dim">npx @webmcp-stack/codegen dev</span> opens this
              locally. Review every tool and test calls before an agent ever sees one.
            </p>
          </div>
        </div>
      </section>

      {/* The standard: the one section a scanner needs. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em]">
            What a generated tool carries.
          </h2>
          <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-dim sm:mb-14">
            Agents choose and call tools from names, descriptions, and schemas alone, so every
            generated tool meets the WebMCP authoring standard:
          </p>
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {TOOL_STANDARD.map(([title, body]) => (
              <div key={title} className="border-l-2 border-accent/40 pl-5">
                <h3 className="mb-2 text-[13.5px] font-medium leading-snug text-ink">{title}</h3>
                <p className="text-[13.5px] leading-relaxed text-dim">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA: repeat the one action, with the risk removed. */}
      <section className="relative overflow-hidden border-t border-line">
        <div
          className="absolute bottom-[-280px] left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-accent/[0.05] blur-[120px]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-20 text-center sm:px-6 sm:py-28">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-medium tracking-[-0.015em]">
            Point it at your API.
          </h2>
          <p className="mx-auto mb-10 max-w-md text-dim">
            The first run writes nothing. It only shows you the tools hiding in your API.
          </p>
          <div className="flex justify-center">
            <CopyCommand command={`${COMMAND} --dry-run`} />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
