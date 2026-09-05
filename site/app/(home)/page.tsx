import { ArrowDown } from "lucide-react";
import Link from "next/link";
import { CopyCommand } from "@/components/copy-command";
import { DashboardDemo } from "@/components/dashboard-demo";
import { LogoWord } from "@/components/logo";
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

/* Safety is the product's spine: what the audit refuses to ship. */
const AUDIT_CATCHES: Array<[string, string]> = [
  [
    "webhook receivers",
    "Endpoints that exist for other servers, not for users. Skipped, so an agent never holds a tool that fires your payment-webhook route.",
  ],
  [
    "admin operations",
    "Admin-only paths and role-gated actions. Flagged: generation stops until you decide.",
  ],
  [
    "auth boundaries",
    "Login, signup, token refresh. Blocked, so an agent never carries your user's credentials into an AI model.",
  ],
];

/* The objection, answered as behavior. */
const RULES: Array<[string, string]> = [
  ["an endpoint is added", "a new file appears, with space for your code"],
  ["the spec changed", "only the part generated from the spec updates"],
  ["nothing changed", "nothing gets rewritten, and your git history stays quiet"],
  ["you edited the generated part", "your version wins; the update waits in a separate file"],
];

/* What every generated tool carries, whatever it came from. The bar is the
   WebMCP authoring standard the coding-agent playbooks teach. */
const TOOL_STANDARD: Array<[string, string]> = [
  [
    "A name that says what it does",
    "get-trip, generate-story, list-destination-candidates. Never the raw route.",
  ],
  [
    "A description an agent can act on",
    "What it does, when to use it, what it returns, in plain language.",
  ],
  [
    "Inputs with their rules, in words",
    "Required, optional, allowed values, limits: written into the schema, not left to guesswork.",
  ],
  [
    "Its risk, declared up front",
    "Read-only tools are marked read-only so agents treat them that way. Writes start disabled.",
  ],
  [
    "Failures an agent can act on",
    "A failure tells the agent what to try next, not a stack trace. An empty result says so, in words.",
  ],
  [
    "A human between the agent and the action",
    "Payments, deletes, and other irreversible steps stop at a confirmation, not at a warning sentence.",
  ],
];

/* "What's the catch?" — answered as a checklist of the usual ones
   that aren't here. */
const GUARANTEES: Array<[string, string]> = [
  [
    "The files are yours",
    "Plain TypeScript in your repo. Read them, diff them, edit them. They never import this package, so uninstalling it changes nothing.",
  ],
  [
    "It never phones home",
    "No account, no telemetry, no uploads. It reads a local file and writes local files.",
  ],
  [
    "You review before anything is written",
    "The first run shows every file and every warning, and writes nothing.",
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
          </div>
        </div>
      </section>

      {/* What a generated tool carries: the authoring standard, stated. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em]">
            What a generated tool carries.
          </h2>
          <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-dim sm:mb-14">
            Agents choose and call tools on the strength of their names, descriptions, and schemas,
            so those are written to the WebMCP authoring standard: the same bar the coding-agent
            playbooks teach. Every tool, whatever it was generated from.
          </p>
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {TOOL_STANDARD.map(([title, body]) => (
              <div key={title} className="border-l-2 border-accent/40 pl-5">
                <h3 className="mb-2 text-[13.5px] font-medium leading-snug text-ink">{title}</h3>
                <p className="text-[13.5px] leading-relaxed text-dim">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety: what the audit refuses to ship. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em]">
            Not a dumb API-to-tool converter.
          </h2>
          <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-dim sm:mb-14">
            Every run checks each tool before it is written. Admin routes, auth endpoints, and
            destructive operations start disabled. An agent sees only what you choose to ship.
          </p>
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {AUDIT_CATCHES.map(([title, body]) => (
              <div key={title} className="border-l-2 border-fault/50 pl-5">
                <h3 className="mb-2 font-mono text-[13.5px] font-medium leading-snug text-ink">
                  ✕ {title}
                </h3>
                <p className="text-[13.5px] leading-relaxed text-dim">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The objection: "won't codegen eat my code?" Answered as behavior. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em]">
            Your API changes. Your tools keep up.
          </h2>
          <p className="mb-10 max-w-xl text-[15px] leading-relaxed text-dim sm:mb-14">
            Re-run the command whenever the spec moves. What happens each time:
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
                <p
                  className="hidden font-mono text-[12.5px] text-ghost sm:block"
                  aria-hidden="true"
                >
                  →
                </p>
                <p className="text-[14.5px] leading-relaxed text-ink">{then}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* "What's the catch?" as a checklist. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em]">
            What's the catch?
          </h2>
          <p className="mb-10 max-w-xl text-[15px] leading-relaxed text-dim sm:mb-14">
            The usual ones aren't here.
          </p>

          <div className="max-w-3xl border border-line bg-panel">
            {GUARANTEES.map(([claim, detail], i) => (
              <div
                key={claim}
                className={`flex gap-3.5 px-5 py-4 sm:px-6 sm:py-5 ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <span className="mt-0.5 font-mono text-[13px] text-accent" aria-hidden="true">
                  ✓
                </span>
                <p className="text-[14.5px] leading-relaxed text-dim">
                  <span className="font-medium text-ink">{claim}.</span> {detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The stack: codegen today, two more on the roadmap. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.2em] text-faint">
            The stack
          </p>
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em]">
            One product of a stack.
          </h2>
          <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-dim sm:mb-14">
            codegen is the first product of <LogoWord />: it reads your API spec and validation
            schemas and writes the tools. Two more are on the roadmap:
          </p>

          <div className="border-y border-line">
            {[
              [
                "@webmcp-stack/telemetry",
                "see how agents actually use your tools: which ones get called, which fail, which never get found",
              ],
              [
                "@webmcp-stack/audit",
                "check any site's WebMCP tools with a URL, before or after you ship",
              ],
            ].map(([pkg, what], i) => (
              <div
                key={pkg}
                className={`grid gap-1.5 px-1 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-baseline sm:gap-6 sm:py-5 ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <p className="font-mono text-[12.5px] leading-relaxed text-dim">{pkg}</p>
                <p className="text-[14.5px] leading-relaxed text-ink">{what}</p>
              </div>
            ))}
          </div>

          <Link
            href="/about"
            className="mt-8 inline-block font-mono text-[13px] text-dim transition-colors duration-150 hover:text-ink"
            style={{ transitionTimingFunction: "var(--ease-reading)" }}
          >
            why the stack exists →
          </Link>
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
