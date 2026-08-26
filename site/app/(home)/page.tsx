import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Instrument } from "@/components/instrument";
import { PageReadout } from "@/components/page-readout";
import { ResetSection } from "@/components/reset-section";

/* Before/after with cumulative elapsed time per step, so the totals
   read as measurements instead of slogans. */
const BEFORE: Array<[step: string, elapsed: string]> = [
  ["Agent writes the fix", "0:00"],
  ["You test it. Still broken", "2:00"],
  ["You paste a screenshot", "5:00"],
  ["Agent guesses at the cause", "8:00"],
  ["You open DevTools and dig yourself", "12:00"],
];

const AFTER: Array<[step: string, elapsed: string]> = [
  ["Agent writes the fix", "0:00"],
  ["You say it's still broken", "0:05"],
  ["Agent reads the actual store", "0:10"],
  ["Agent reads the state history", "0:15"],
  ["Agent fixes the real bug", "0:25"],
];

/* What the agent sees once those three lines exist. Mirrors the real
   demo-app contract: same tool names, same descriptions. */
const CONTRACT: Array<{
  name: string;
  kind: "read" | "write";
  auto?: boolean;
  description: string;
}> = [
  {
    name: "getCheckoutState",
    kind: "read",
    auto: true,
    description:
      "Live store: cart contents, total, validation errors, payment status. What the app actually holds, not what the DOM implies.",
  },
  {
    name: "getStateHistory",
    kind: "read",
    auto: true,
    description:
      "Every transition with the keys that changed. The causal trace, not two snapshots to guess between.",
  },
  {
    name: "submitCheckoutWithCard",
    kind: "write",
    description:
      "An action you blessed: schema'd, named, and safe. Not an opaque script injected into your page.",
  },
  {
    name: "loadFixture",
    kind: "write",
    description:
      "Teleport the app into a named scenario in one call. Bug reports stop costing twenty minutes of reproduction.",
  },
  {
    name: "resetToGroundState",
    kind: "write",
    description:
      "Back to a known baseline in one call. No clicking back, no state leaking between experiments.",
  },
];

export default function HomePage() {
  return (
    <main className="dark flex-1 bg-baseline text-ink font-sans">
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="flex items-center gap-2.5 font-mono text-sm tracking-tight text-ink">
            <span className="inline-block size-2 bg-phosphor" aria-hidden="true" />
            groundstate
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
      <section data-observe-section="hero" className="relative border-b border-line">
        <div className="gs-grid-bg absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-36 sm:pt-44 lg:grid-cols-[1fr_440px] lg:gap-16 lg:pb-28">
          <div>
            <h1 className="mb-7 font-display text-[clamp(2.6rem,5.5vw,4.2rem)] font-medium leading-[1.06] tracking-[-0.02em]">
              Your agent writes your frontend.
              <br />
              <span className="text-faint">It can't see inside it.</span>
            </h1>

            <p className="mb-10 max-w-lg text-[17px] leading-relaxed text-dim">
              So you spend your day being its eyes: clicking around, describing what's on screen,
              pasting console output. Groundstate exposes your app's real state and actions as tools
              the agent calls directly, so it can ask the app instead of guessing.
            </p>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="border border-line bg-panel px-4 py-3 font-mono text-sm">
                <span className="select-none text-ghost">$ </span>
                npm install groundstate
              </div>
              <Link
                href="/docs"
                className="group inline-flex items-center gap-1.5 font-mono text-sm text-phosphor transition-colors duration-150 hover:text-ink"
                style={{ transitionTimingFunction: "var(--ease-reading)" }}
              >
                five-minute setup
                <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* A working miniature of the product, not a mockup. */}
          <div className="w-full lg:justify-self-end">
            <Instrument />
          </div>
        </div>
      </section>

      {/* One bug, fixed twice */}
      <section data-observe-section="loop" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <h2 className="mb-3 font-display text-[clamp(1.7rem,3vw,2.3rem)] font-medium tracking-[-0.015em]">
            One bug, fixed twice.
          </h2>
          <p className="mb-12 max-w-lg text-dim">
            A checkout total that won't update, with and without ground truth. The shape is the same
            for any flow in any app.
          </p>

          <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
            <div className="bg-baseline p-7">
              <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
                without groundstate
              </p>
              <ol className="divide-y divide-line/60">
                {BEFORE.map(([step, elapsed], i) => (
                  <li key={step} className="flex items-baseline gap-4 py-3 text-[15px]">
                    <span className="w-4 shrink-0 text-right font-mono text-xs text-ghost">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed text-faint">{step}</span>
                    <span className="ml-auto shrink-0 pl-4 font-mono text-xs tabular-nums text-ghost">
                      {elapsed}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-6 flex items-baseline justify-between border-t border-line pt-5 font-mono">
                <span className="text-[11px] uppercase tracking-[0.2em] text-faint">total</span>
                <span className="text-sm tabular-nums text-dim">15:00 · 4 round trips</span>
              </p>
            </div>

            <div className="bg-panel p-7">
              <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-phosphor-dim">
                with groundstate
              </p>
              <ol className="divide-y divide-line/60">
                {AFTER.map(([step, elapsed], i) => (
                  <li key={step} className="flex items-baseline gap-4 py-3 text-[15px]">
                    <span className="w-4 shrink-0 text-right font-mono text-xs text-phosphor-dim/70">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed text-ink">{step}</span>
                    <span className="ml-auto shrink-0 pl-4 font-mono text-xs tabular-nums text-phosphor-dim">
                      {elapsed}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-6 flex items-baseline justify-between border-t border-phosphor/25 pt-5 font-mono">
                <span className="text-[11px] uppercase tracking-[0.2em] text-phosphor-dim">
                  total
                </span>
                <span className="text-sm tabular-nums text-phosphor">0:30 · 0 round trips</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What you write, what the agent sees */}
      <section data-observe-section="contract" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <h2 className="mb-4 font-display text-[clamp(1.7rem,3vw,2.3rem)] font-medium tracking-[-0.015em]">
            Three lines in your dev build.
          </h2>
          <p className="mb-4 max-w-2xl leading-relaxed text-dim">
            Any MCP-capable agent (Claude Code, Cursor, Codex) gets the tools automatically through
            the bridge. Zustand and TanStack Query observables derive from what you already have;
            curation is the upgrade path, not the entry fee.
          </p>
          <p className="mb-12 max-w-2xl leading-relaxed text-dim">
            <code className="font-mono text-sm text-phosphor-dim">init()</code> refuses to run in
            production builds. There is no override flag. Your users never see it.
          </p>

          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
                what you write
              </p>
              <div className="border border-line bg-panel">
                <div className="border-b border-line px-4 py-2.5 font-mono text-[11px] text-faint">
                  instrumentation.ts
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-[1.9] text-dim">
                  <code>{`import { init, act, fixture } from "groundstate";
import { observeStore } from "@groundstate/react";

init({ appName: "checkout" });

observeStore("checkout", useCheckoutStore);
act("submitCheckoutWithCard", submitWithCard);
fixture("cart_with_declined_card", seedDeclined);

// init() throws in production. No override flag.`}</code>
                </pre>
              </div>
            </div>

            <div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
                what the agent sees
              </p>
              <ul className="divide-y divide-line/70 border-y border-line">
                {CONTRACT.map((tool) => (
                  <li key={tool.name} className="py-4">
                    <div className="flex items-baseline gap-3 font-mono text-[13px]">
                      <span className={tool.kind === "read" ? "text-phosphor" : "text-signal"}>
                        {tool.name}
                      </span>
                      {tool.auto ? (
                        <span className="ml-auto text-[11px] text-ghost">auto-derived</span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-dim">
                      {tool.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* The honest objection */}
      <section data-observe-section="alongside" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="max-w-3xl">
            <h2 className="mb-6 font-display text-[clamp(1.7rem,3vw,2.3rem)] font-medium tracking-[-0.015em]">
              "I already have Chrome DevTools MCP."
            </h2>
            <p className="mb-5 leading-relaxed text-dim">
              Keep it. DevTools MCP shows the agent what the browser sees (console errors, network
              requests, DOM snapshots) and does it well, with zero setup.
            </p>
            <p className="mb-12 leading-relaxed text-dim">
              Groundstate adds what it structurally cannot: your app's internal state, actions
              you've blessed, and one-call fixtures. Use both.
            </p>
            {/* The positioning line, restored from the product doc. */}
            <p className="font-display text-[clamp(1.4rem,2.6vw,1.9rem)] font-medium leading-snug tracking-[-0.01em]">
              DevTools MCP tells the agent what the browser sees.
              <br />
              <span className="text-phosphor">Groundstate tells it what the app knows.</span>
            </p>
          </div>
        </div>
      </section>

      {/* The namesake */}
      <section data-observe-section="baseline" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="max-w-3xl">
            <h2 className="mb-6 font-display text-[clamp(1.7rem,3vw,2.3rem)] font-medium tracking-[-0.015em]">
              Every app has a ground state.
              <br />
              <span className="text-faint">This page has one too.</span>
            </h2>
            <p className="mb-10 max-w-xl leading-relaxed text-dim">
              In physics, the ground state is the known baseline a system returns to. Groundstate
              gives your app the same thing: one call, and the cart is empty, the flags are default,
              the experiment never happened. The demo store at the top of this page works the same
              way.
            </p>
            <ResetSection />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer data-observe-section="footer">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-xs text-faint">groundstate · dev-only sdk</span>
          <PageReadout />
          <span className="font-mono text-xs text-faint">
            built on{" "}
            <a
              href="https://developer.chrome.com/docs/ai/webmcp"
              className="text-dim transition-colors duration-150 hover:text-ink"
              style={{ transitionTimingFunction: "var(--ease-reading)" }}
            >
              WebMCP
            </a>
          </span>
        </div>
      </footer>
    </main>
  );
}
