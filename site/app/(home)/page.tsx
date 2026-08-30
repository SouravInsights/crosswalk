import Link from "next/link";
import { CopyCommand } from "@/components/copy-command";
import { LiveDemo } from "@/components/live-demo";

const COMMAND = "npx webmcp-codegen generate";

/* What happens on each re-run, as a ledger. The question everyone has
   after seeing codegen is "will it eat my code?" — these rows are the
   answer, stated as behavior. */

const RULES: Array<[string, string]> = [
  ["an endpoint is added", "a new file appears, with space for your code"],
  ["the spec changed", "only the part generated from the spec updates"],
  ["nothing changed", "nothing gets rewritten, and your git history stays quiet"],
  ["you edited the generated part", "your version wins; the update waits in a separate file"],
];

export default function HomePage() {
  return (
    <main className="dark flex-1 overflow-x-clip bg-baseline font-sans text-ink">
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <span className="flex items-center gap-2.5 font-mono text-sm tracking-tight text-ink">
            <span className="inline-block size-2 bg-accent" aria-hidden="true" />
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
              WebMCP lets agents use your app through tools. webmcp-codegen reads the spec
              you already have and writes them for you. Typed, checked, and yours to keep.
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

      {/* The one worry codegen always raises, answered as behavior. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em]">
            Run it again. And again.
          </h2>
          <p className="mb-10 max-w-xl text-[15px] leading-relaxed text-dim sm:mb-14">
            Your API keeps moving. Your tools should keep up, without ever eating your
            code. Exactly what happens each time:
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

      {/* CTA */}
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
            WebMCP itself is still early: tools run today in Chrome behind a flag, or
            anywhere with a small polyfill. OpenAPI is supported now; tRPC, Zod, and Prisma
            are on the roadmap.
          </p>
          <div className="flex flex-col items-center justify-between gap-3 font-mono text-[12px] text-faint sm:flex-row">
            <span>MIT · node 20+ · zero runtime dependencies</span>
            <span className="flex items-center gap-5">
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
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
