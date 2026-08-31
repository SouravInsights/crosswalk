import type { Metadata } from "next";
import Link from "next/link";
import { Logo, LogoWord } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "About",
  description: "What webmcp-stack is, why it exists, and who is building it.",
};

const REPO = "https://github.com/SouravInsights/webmcp-stack";

/**
 * The exploded stack: the logo taken apart, one layer per stage of the
 * problem. Settles into place on load, top layer last.
 */
function ExplodedStack() {
  const layers = [
    // Bottom layer: outline
    <path
      key="b"
      d="M3 19.5 L12 24 L21 19.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      className="layer-in"
      style={{ animationDelay: "0ms" }}
    />,
    // Middle layer: outline
    <path
      key="m"
      d="M3 13.5 L12 18 L21 13.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      className="layer-in"
      style={{ animationDelay: "140ms" }}
    />,
    // Top layer: solid accent
    <path
      key="t"
      d="M12 5 L21 9.5 L12 14 L3 9.5 Z"
      fill="var(--color-accent)"
      className="layer-in"
      style={{ animationDelay: "280ms" }}
    />,
  ];
  return (
    <svg
      viewBox="0 0 24 27"
      fill="none"
      aria-hidden="true"
      className="size-20 text-dim sm:size-24"
    >
      {layers}
    </svg>
  );
}

const LIFECYCLE = [
  { stage: "Generate", tool: "codegen", today: true },
  { stage: "Understand", tool: "the dashboard", today: true },
  { stage: "Review", tool: "the audit pass", today: true },
  { stage: "Test", tool: "the dashboard", today: true },
  { stage: "Control", tool: "config + overrides", today: true },
  { stage: "Observe", tool: "telemetry", today: false },
  { stage: "Secure", tool: "audit reports", today: false },
];

const PRINCIPLES = [
  {
    n: "01",
    title: "The generated code belongs to you",
    body: "Real files in your repo, no runtime dependency, no lock-in. Inspect them, modify them, delete the generator and keep the files. shadcn-style energy, not a runtime you rent.",
  },
  {
    n: "02",
    title: "Safety first",
    body: "Giving agents access to application actions is a new security surface. The stack treats it that way: every tool is classified, risky tools start disabled, and the audit blocks what should never be an agent tool at all. You decide what to expose; the tools enforce the decision.",
  },
  {
    n: "03",
    title: "Open-source first",
    body: "Everything here is genuinely useful on its own and self-hostable. If a hosted service ever exists, it adds convenience: collaboration, analytics, observability. It never gates the core developer experience.",
  },
];

export default function AboutPage() {
  return (
    <main className="dark flex-1 bg-baseline font-sans text-ink">
      {/* Nav */}
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link href="/" aria-label="webmcp-stack home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-5 font-mono text-[13px] text-dim sm:gap-6">
            <Link href="/docs" className="transition-colors duration-150 hover:text-ink">
              docs
            </Link>
            <Link href="/brand" className="transition-colors duration-150 hover:text-ink">
              brand
            </Link>
            <a href={REPO} className="transition-colors duration-150 hover:text-ink">
              github
            </a>
          </nav>
        </div>
      </header>

      {/* Hero: the claim and the mark, taken apart. */}
      <section className="relative overflow-hidden">
        <div
          className="absolute left-1/2 top-[-200px] size-[560px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[120px]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-24 text-center sm:px-6 sm:pb-20 sm:pt-32">
          <div className="mb-8 flex justify-center">
            <ExplodedStack />
          </div>
          <h1 className="font-display text-[clamp(2rem,5.5vw,3.4rem)] font-medium leading-[1.08] tracking-[-0.02em]">
            Agents are learning to use the web the hard way.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15.5px] leading-relaxed text-dim sm:text-[16.5px]">
            Today, an agent that wants to use your app reads the screen and simulates clicks.
            WebMCP gives it a better path: your app exposes typed tools, and the agent calls them.{" "}
            <LogoWord /> is the tooling for building that surface, and for keeping it safe.
          </p>
        </div>
      </section>

      {/* Why this exists */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-faint">
            Why this exists
          </p>
          <div className="mt-5 space-y-5 text-[15px] leading-[1.75] text-dim sm:text-[15.5px]">
            <p>
              WebMCP is early. It runs today in Chrome behind a flag, and most apps have nothing
              for an agent to call yet. But the direction is clear: apps will expose tools, and
              agents will use them the way people use interfaces.
            </p>
            <p>
              The catch is that someone has to author those tools, and the naive version of that
              goes badly. Point a generator at an API without thinking and you ship payment
              webhooks, admin endpoints, and auth flows as things an agent can call. The
              interesting problem was never <span className="text-ink">can</span> an agent call
              your app. It is <span className="text-ink">what</span> it should be allowed to call,
              and who decided.
            </p>
            <p>
              <LogoWord /> exists to make WebMCP practical for real applications. Not a single
              tool, but the tooling for the whole lifecycle of an agent-facing surface, built so
              developers stay in control of what agents can actually do.
            </p>
          </div>
        </div>
      </section>

      {/* The lifecycle */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-faint">
            The lifecycle
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.4rem,3vw,2rem)] font-medium tracking-[-0.015em]">
            One loop, from spec to production.
          </h2>
          <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-3">
            {LIFECYCLE.map((s, i) => (
              <span key={s.stage} className="flex items-center gap-2">
                <span
                  className={`group relative border px-3 py-1.5 font-mono text-[12.5px] transition-colors duration-150 ${
                    s.today
                      ? "border-line bg-panel text-ink hover:border-accent/60"
                      : "border-dashed border-line text-faint"
                  }`}
                  style={{ transitionTimingFunction: "var(--ease-reading)" }}
                  title={s.today ? `Today: ${s.tool}` : `Planned: ${s.tool}`}
                >
                  {s.stage}
                  {!s.today && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wider text-ghost">
                      soon
                    </span>
                  )}
                </span>
                {i < LIFECYCLE.length - 1 && <span className="text-ghost">→</span>}
              </span>
            ))}
          </div>
          <p className="mt-8 max-w-2xl text-[14.5px] leading-relaxed text-dim">
            The first five stages work today:{" "}
            <span className="font-mono text-[13px] text-accent">@webmcp-stack/codegen</span>{" "}
            generates the tools, its dashboard lets you understand and test them, the audit pass
            reviews them, and config keeps you in control.{" "}
            <span className="font-mono text-[13px] text-dim">@webmcp-stack/telemetry</span> and{" "}
            <span className="font-mono text-[13px] text-dim">@webmcp-stack/audit</span> close the
            loop: see how agents actually use your tools, and check any site&rsquo;s WebMCP surface
            with a URL. One stack, not a pile of unrelated utilities.
          </p>
        </div>
      </section>

      {/* Principles */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-faint">
            Principles
          </p>
          <div className="mt-8 space-y-0">
            {PRINCIPLES.map((p) => (
              <div
                key={p.n}
                className="grid gap-2 border-t border-line py-7 first:border-t-0 sm:grid-cols-[64px_1fr] sm:gap-6"
              >
                <span className="font-mono text-[13px] text-accent">{p.n}</span>
                <div>
                  <h3 className="text-[16px] font-medium text-ink">{p.title}</h3>
                  <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-dim">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is building this */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-faint">
            Who is building this
          </p>
          <div className="group/author mt-8 mb-8 flex items-center gap-4 border-b border-line pb-8 sm:gap-5">
            <a
              href="https://souravinsights.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block shrink-0"
              aria-label="Sourav's website"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/avatar.jpeg"
                alt="Sourav"
                className="size-16 rounded-full border border-line object-cover shadow-sm transition-transform duration-300 ease-out group-hover/author:-rotate-3 group-hover/author:scale-105 sm:size-20"
              />
            </a>
            <div>
              <h3 className="text-xl font-semibold text-ink sm:text-2xl">
                <a
                  href="https://souravinsights.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-150 hover:text-accent"
                >
                  Sourav
                </a>
              </h3>
              <p className="mt-1 font-mono text-xs text-faint">Product engineer</p>
            </div>
          </div>
          <div className="space-y-5 text-[15px] leading-[1.75] text-dim sm:text-[15.5px]">
            <p>
              Hi, I&rsquo;m{" "}
              <a
                href="https://souravinsights.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-accent"
              >
                Sourav
              </a>
              , a product engineer. I&rsquo;ve spent the last few years building for small teams
              (Paragraph, Pimlico, Gallery, RabbitHole) and working on my own things.
            </p>
          </div>

          {/* The other things: credibility as a builder, not a bio line. */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              {
                name: "beenthere",
                href: "https://www.beenthere.page/",
                note: "a minimal travel platform",
              },
              {
                name: "safe to merge",
                href: "https://www.safetomerge.com/",
                note: "a handbook on shipping software with agents",
              },
            ].map((p) => (
              <a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group border border-line bg-panel px-4 py-3.5 transition-colors duration-150 hover:border-accent/60"
                style={{ transitionTimingFunction: "var(--ease-reading)" }}
              >
                <span className="flex items-center justify-between font-mono text-[13px] text-ink">
                  {p.name}
                  <span className="text-ghost transition-colors group-hover:text-accent">→</span>
                </span>
                <span className="mt-1 block text-[13px] text-faint">{p.note}</span>
              </a>
            ))}
          </div>

          <div className="mt-6 space-y-5 text-[15px] leading-[1.75] text-dim sm:text-[15.5px]">
            <p>
              I started <LogoWord /> while making BeenThere agent-native. Generating tools from a
              spec turned out to be the easy part. The harder problem is everything around the
              generation: knowing which endpoints should never become tools, reviewing what an
              agent will see, and staying in control of the surface after you ship. That is the
              problem this stack exists to solve.
            </p>
            <p>
              <LogoWord /> is open source and open in direction. If you are building with WebMCP,
              or figuring out what agents should be allowed to do in production,{" "}
              <a
                href={`${REPO}/issues`}
                className="text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-accent"
              >
                come say what you need
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
