import Link from "next/link";
import { CopyCommand } from "@/components/copy-command";
import { LiveDemo } from "@/components/live-demo";
import { Logo } from "@/components/logo";

const COMMAND = "npx @webmcp-stack/codegen generate";

/* Why now, as three plain statements: what agents can do once your app
   exposes tools. Each is an outcome for the app, not a feature of the CLI. */

const UNLOCKS: Array<{ title: string; body: string }> = [
  {
    title: "Agents finish tasks, not just read pages",
    body: '"Rebook my flight", "export my data", "add this to my cart". With tools, a user\'s agent can actually do these inside your app, with the user\'s session.',
  },
  {
    title: "Agents prefer apps that have tools",
    body: "Given a choice between clicking around a DOM and calling a well-described tool, agents pick the tool. Every time. Apps without tools get driven clumsily, or skipped.",
  },
  {
    title: "Your spec is already the hard part",
    body: "Names, types, descriptions: the information agents need is information you already maintain. The missing piece was getting it into the browser. That piece is a command now.",
  },
];

/* The codegen objection, answered as behavior. */

const RULES: Array<[string, string]> = [
  ["an endpoint is added", "a new file appears, with space for your code"],
  ["the spec changed", "only the part generated from the spec updates"],
  ["nothing changed", "nothing gets rewritten, and your git history stays quiet"],
  ["you edited the generated part", "your version wins; the update waits in a separate file"],
];

/* "What's the catch?" — answered as a checklist of the usual ones
   that aren't here. The engineering story, told as what you never
   have to think about. */

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
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Logo product="codegen" />
          <nav className="flex items-center gap-5 font-mono text-[13px] text-dim sm:gap-6">
            <Link
              href="/docs"
              className="transition-colors duration-150 hover:text-ink"
              style={{ transitionTimingFunction: "var(--ease-reading)" }}
            >
              docs
            </Link>
            <Link
              href="/about"
              className="transition-colors duration-150 hover:text-ink"
              style={{ transitionTimingFunction: "var(--ease-reading)" }}
            >
              about
            </Link>
            <a
              href="https://github.com/SouravInsights/webmcp-stack"
              className="transition-colors duration-150 hover:text-ink"
              style={{ transitionTimingFunction: "var(--ease-reading)" }}
            >
              github
            </a>
          </nav>
        </div>
      </header>

      {/* Hero: the claim, the command, the proof. */}
      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0" aria-hidden="true" />
        <div
          className="absolute left-1/2 top-[-260px] size-[720px] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-[130px]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-36 sm:px-6 sm:pb-28 sm:pt-44">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-6 font-display text-[clamp(2.4rem,7vw,4.6rem)] font-medium leading-[1.03] tracking-[-0.02em]">
              Turn your API into tools AI agents can call.
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-[16px] leading-relaxed text-dim sm:text-[17px]">
              One command reads your OpenAPI spec and writes a WebMCP tool for every endpoint:
              typed, checked for safety, and committed to your repo as code you own.
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

          {/* The proof: click an endpoint, see the file the CLI writes. */}
          <div className="mx-auto mt-16 max-w-5xl sm:mt-20">
            <LiveDemo />
          </div>
        </div>
      </section>

      {/* Why now: the eventual goal. What tools unlock for your app. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em]">
            What happens when the user is an agent?
          </h2>
          <p className="mb-10 max-w-xl text-[15px] leading-relaxed text-dim sm:mb-14">
            Today, an agent that wants to use your app does it the hard way: it reads the screen and
            simulates clicks. WebMCP, now shipping in Chrome, gives agents a better path. Your app
            exposes tools; agents call them. The question stops being whether your app works for
            agents and starts being whether it has anything for them to call.
          </p>
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {UNLOCKS.map((unlock) => (
              <div key={unlock.title} className="border-l-2 border-accent/40 pl-5">
                <h3 className="mb-2 text-[15.5px] font-medium leading-snug text-ink">
                  {unlock.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed text-dim">{unlock.body}</p>
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
            Re-run the command whenever the spec moves. Regeneration never touches code you wrote.
            The exact behavior:
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

      {/* CTA: repeat the one action, with the risk removed. */}
      <section className="relative overflow-hidden border-t border-line">
        <div
          className="absolute bottom-[-280px] left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-accent/[0.05] blur-[120px]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-20 text-center sm:px-6 sm:py-28">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-medium tracking-[-0.015em]">
            Point it at your spec.
          </h2>
          <p className="mx-auto mb-10 max-w-md text-dim">
            The first run writes nothing. It only shows you the tools hiding in your API.
          </p>
          <div className="flex justify-center">
            <CopyCommand command={`${COMMAND} --dry-run`} />
          </div>
        </div>
      </section>

      {/* Footer: metadata and the honest status note, small and quiet. */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
          <p className="mx-auto mb-6 max-w-xl text-center text-[12.5px] leading-relaxed text-faint">
            WebMCP itself is still early: tools run today in Chrome behind a flag, or anywhere with
            a small polyfill. OpenAPI is supported now; tRPC, Zod, and Prisma are on the roadmap.
          </p>
          <div className="flex flex-col items-center justify-between gap-3 font-mono text-[12px] text-faint sm:flex-row">
            <span className="flex items-center gap-4">
              <Logo />
              <span>MIT · node 20+ · zero runtime dependencies</span>
            </span>
            <span className="flex items-center gap-5">
              <Link
                href="/docs"
                className="transition-colors duration-150 hover:text-ink"
                style={{ transitionTimingFunction: "var(--ease-reading)" }}
              >
                docs
              </Link>
              <Link
                href="/about"
                className="transition-colors duration-150 hover:text-ink"
                style={{ transitionTimingFunction: "var(--ease-reading)" }}
              >
                about
              </Link>
              <Link
                href="/brand"
                className="transition-colors duration-150 hover:text-ink"
                style={{ transitionTimingFunction: "var(--ease-reading)" }}
              >
                brand
              </Link>
              <a
                href="https://github.com/SouravInsights/webmcp-stack"
                className="transition-colors duration-150 hover:text-ink"
                style={{ transitionTimingFunction: "var(--ease-reading)" }}
              >
                github
              </a>
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
