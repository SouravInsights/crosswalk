import {
  Activity,
  ArrowRight,
  FileJson,
  LayoutGrid,
  RotateCcw,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import Link from "next/link";

const TOOLS = [
  {
    name: "getCheckoutState",
    desc: "The actual store — cart contents, validation errors, payment status. Not what the DOM implies.",
    icon: FileJson,
  },
  {
    name: "loadFixture",
    desc: "Teleport the app into a named state in one call. Kills the 20-minute bug-reproduction tax.",
    icon: RotateCcw,
  },
  {
    name: "getStateHistory",
    desc: "Flight recorder: every state transition with the keys that changed. The causal trace, not two snapshots.",
    icon: Activity,
  },
  {
    name: "submitCheckoutWithCard",
    desc: "Real actions you defined, schema'd and callable — no fragile selectors, no vision round-trips.",
    icon: Terminal,
  },
  {
    name: "getGroundstateHealth",
    desc: "Runs every read-only tool and reports what broke. Selectors rot loudly, never silently.",
    icon: ShieldCheck,
  },
  {
    name: "Inspector overlay",
    desc: "In-page panel to browse and invoke every tool while you author them.",
    icon: LayoutGrid,
  },
];

const PACKAGES = [
  [
    "groundstate",
    "Core SDK: observe / act / fixture / reset / record. Zero dependencies, dev-only.",
  ],
  ["@groundstate/react", "React hooks + one-line Zustand and TanStack Query auto-derivation."],
  ["@groundstate/bridge", "Local MCP server: page tools → Claude Code / Codex / Cursor, via CDP."],
  ["@groundstate/inspector", "In-page overlay to browse and invoke tools while authoring."],
];

const LOOP_STAGES = [
  {
    label: "OBSERVE",
    desc: "Know what the app actually holds — stores, query cache, form state, validation.",
  },
  {
    label: "ACT",
    desc: "Let the agent perform developer-blessed operations with schemas, not injected scripts.",
  },
  {
    label: "FIXTURE",
    desc: "Jump to any named state in one call. No clicking there, no seed scripts.",
  },
  {
    label: "RECORD",
    desc: "Buffer every transition so failures come with a causal trace, not just a snapshot.",
  },
  {
    label: "CHECK",
    desc: "Run every read-only tool and report what broke. Selector rot fails loudly.",
  },
  { label: "RESET", desc: "Return to a known baseline — the ground state — before the next run." },
];

const BADGE_TILTS = [
  "-rotate-2",
  "rotate-1",
  "-rotate-1",
  "rotate-2",
  "-rotate-[1.5deg]",
  "rotate-[0.75deg]",
];

function SectionLabel({
  index,
  children,
  className = "",
}: {
  index?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-mono text-xs tracking-widest uppercase text-muted mb-6 flex items-baseline ${className}`}
    >
      {index ? <span className="text-verified font-medium mr-2.5">{index}</span> : null}
      <span>{children}</span>
    </p>
  );
}

function SectionDivider() {
  return (
    <div className="max-w-3xl mx-auto px-6" aria-hidden="true">
      <div className="flex items-center gap-5 py-1 text-muted/40">
        <span className="h-px flex-1 bg-rule" />
        <span className="font-mono text-xs select-none">◆</span>
        <span className="h-px flex-1 bg-rule" />
      </div>
    </div>
  );
}

function Highlight({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <mark className="mark" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </mark>
  );
}

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Grain overlay */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <header>
          <SectionLabel className="hero-enter hero-enter-d1">
            A dev-only SDK for agentic frontend work
          </SectionLabel>

          <h1 className="hero-enter hero-enter-d2 text-4xl sm:text-6xl font-semibold leading-[1.05] tracking-tight text-balance mb-6">
            Give your coding agent <span className="text-verified">ground truth</span> about your
            running app.
          </h1>

          <p className="hero-enter hero-enter-d3 text-lg sm:text-xl text-muted leading-relaxed mb-10">
            Your agent writes your frontend, but it can't see inside it — it guesses from
            screenshots and DOM dumps, and you burn round-trips correcting it. Groundstate is a
            dev-only SDK that exposes your app's real state and actions as WebMCP tools, so the
            agent you already use can{" "}
            <Highlight delay={300}>ask the app what actually happened</Highlight>.
          </p>

          <div className="hero-enter hero-enter-d4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <code className="flex-1 font-mono text-sm bg-paper border border-edge px-4 py-3 text-ink">
                npm install groundstate
              </code>
              <Link
                href="/docs"
                className="group inline-flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest border-2 border-edge bg-paper text-ink px-6 py-3.5 shadow-[3px_3px_0_0_var(--plate)] hover:border-verified hover:text-verified hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:border-verified active:text-verified active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-150"
              >
                Read the docs
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 font-mono text-xs text-muted pt-1">
              <a
                href="#how-it-works"
                className="py-2.5 hover:text-ink underline underline-offset-4 decoration-rule transition-colors"
              >
                See how it works
              </a>
              <span
                className="text-muted/40 font-mono text-xs select-none px-0.5"
                aria-hidden="true"
              >
                /
              </span>
              <a
                href="https://github.com/souravinsights/groundstate"
                className="group py-2.5 text-verified hover:text-ink font-medium underline underline-offset-4 decoration-verified/40 transition-colors inline-flex items-center gap-1.5"
              >
                View on GitHub
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </header>
      </section>

      <SectionDivider />

      {/* Why */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-20" id="why">
        <SectionLabel index="01" className="reveal">
          Why this exists
        </SectionLabel>
        <div className="space-y-5 text-lg leading-relaxed max-w-2xl">
          <p className="reveal">
            Most production UI code today is written by agents. The bottleneck has moved to
            verification: the agent writes code, you click around, something's wrong, the agent
            guesses from a screenshot, tries again. Every round trip costs minutes and tokens.
          </p>
          <p className="reveal reveal-d1">
            The agent has no way to ask the app{" "}
            <em>
              "what is the cart store's actual contents right now, and why did validation reject
              that input?"
            </em>{" "}
            — so it infers. Often wrongly.
          </p>
          <p className="reveal reveal-d2 text-ink text-xl leading-relaxed border-l-2 border-mark py-3 pr-3 pl-4 -ml-4 sm:pl-5 sm:-ml-5">
            Chrome DevTools MCP tells the agent what the browser sees.{" "}
            <Highlight delay={200}>Groundstate tells it what the app knows.</Highlight>
          </p>
        </div>
      </section>

      {/* Loop */}
      <section id="how-it-works" className="section-band max-w-full py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <SectionLabel index="02" className="reveal">
            How it works
          </SectionLabel>
          <h2 className="reveal reveal-d1 text-2xl sm:text-3xl font-semibold mb-4">
            Six primitives, one loop.
          </h2>
          <p className="reveal reveal-d2 text-lg text-muted leading-relaxed max-w-xl mb-10">
            Observe, act, fixture, record, check, reset. The agent gets ground truth at every stage
            — and you get evidence, not screenshots.
          </p>

          <ol className="grid sm:grid-cols-2 gap-x-12 gap-y-10 mt-6">
            {LOOP_STAGES.map((stage, index) => (
              <li
                key={stage.label}
                className={`group flex gap-4 cursor-default select-none transition-transform duration-150 active:scale-[0.98] reveal ${index % 2 === 0 ? "reveal-d1" : "reveal-d2"}`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border border-edge bg-paper font-mono text-xs shrink-0 mt-0.5 shadow-[1.5px_1.5px_0_0_var(--plate)] transition-all duration-150 group-hover:bg-ink group-hover:text-paper group-hover:shadow-none group-hover:rotate-0 ${BADGE_TILTS[index % BADGE_TILTS.length]}`}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="font-mono text-xs tracking-widest uppercase text-verified mb-1 transition-colors group-hover:text-ink">
                    {stage.label}
                  </p>
                  <p className="text-sm text-muted leading-relaxed pr-2">{stage.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Code sample */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <SectionLabel index="03" className="reveal">
          The contract
        </SectionLabel>
        <h2 className="reveal reveal-d1 text-2xl sm:text-3xl font-semibold mb-4">
          Your app, as tools your agent can call.
        </h2>
        <p className="reveal reveal-d2 text-lg text-muted leading-relaxed max-w-xl mb-8">
          A dev-only SDK built on WebMCP. You decide what state and actions matter; any MCP agent —
          Claude Code, Codex, Cursor — gets them as first-class tools against the live, running app.
        </p>
        <pre className="reveal reveal-d3 font-mono text-[13.5px] leading-relaxed bg-paper border border-edge p-5 overflow-x-auto shadow-[4px_4px_0_0_var(--plate)]">
          <code>{`// dev builds only — init() refuses to run in production
groundstate.init({ appName: "my-app" });

// one line per Zustand store: live getCheckoutState + flight recorder
observeStore("checkout", useCheckoutStore);

// a developer-blessed action the agent may perform
groundstate.act("submitCheckoutWithCard", ({ cardToken }) => checkout.submit(cardToken));

// one-call jump to any app state — no clicking there
groundstate.fixture("cart_with_declined_card", async () => { /* seed it */ });`}</code>
        </pre>
      </section>

      {/* Tool grid */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <SectionLabel index="04" className="reveal">
          What the agent gets
        </SectionLabel>
        <div className="grid sm:grid-cols-2 gap-6">
          {TOOLS.map((t, i) => (
            <div
              key={t.name}
              className={`reveal ${i % 2 === 0 ? "reveal-d1" : "reveal-d2"} group border border-edge bg-paper p-5 shadow-[2px_2px_0_0_var(--plate-soft)] hover:shadow-[2px_2px_0_0_var(--plate)] transition-all duration-150 hover:-translate-y-0.5`}
            >
              <div className="flex items-center gap-2 mb-2">
                <t.icon className="w-4 h-4 text-verified" />
                <h3 className="font-mono text-sm font-semibold text-ink">{t.name}</h3>
              </div>
              <p className="text-sm text-muted leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section className="section-band max-w-full py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <SectionLabel index="05" className="reveal">
            Packages
          </SectionLabel>
          <div className="space-y-0 border border-edge bg-paper">
            {PACKAGES.map(([name, desc], i) => (
              <div
                key={name}
                className={`flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-5 py-4 border-b border-rule last:border-b-0 reveal ${i % 2 === 0 ? "reveal-d1" : "reveal-d2"}`}
              >
                <code className="font-mono text-sm text-verified shrink-0 sm:w-56">{name}</code>
                <span className="text-sm text-muted">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <SectionLabel index="06" className="reveal">
          Security
        </SectionLabel>
        <div className="reveal reveal-d1 border border-edge bg-paper p-6 shadow-[3px_3px_0_0_var(--plate)]">
          <h2 className="text-xl font-semibold mb-3">Dev-only, by construction.</h2>
          <p className="text-muted leading-relaxed">
            Groundstate exposes internal state and mutating actions — powerful by design, so it is
            dev/preview only. <code className="font-mono text-sm text-ink">init()</code> detects
            production builds and refuses to start. There is deliberately no override flag. Your
            users never see it.
          </p>
        </div>
      </section>

      <SectionDivider />

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-6 py-12 text-center text-sm text-muted">
        <p>
          Built on the{" "}
          <a
            href="https://developer.chrome.com/docs/ai/webmcp"
            className="text-verified hover:text-ink underline underline-offset-4 decoration-rule transition-colors"
          >
            WebMCP
          </a>{" "}
          open standard ·{" "}
          <a
            href="https://github.com/souravinsights/groundstate"
            className="text-verified hover:text-ink underline underline-offset-4 decoration-rule transition-colors"
          >
            Source on GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}
