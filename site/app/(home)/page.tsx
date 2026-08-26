import Link from "next/link";

const TOOLS = [
  {
    name: "getCheckoutState",
    desc: "The actual store — cart contents, validation errors, payment status. Not what the DOM implies.",
  },
  {
    name: "loadFixture",
    desc: "Teleport the app into a named state in one call. Kills the 20-minute bug-reproduction tax.",
  },
  {
    name: "getStateHistory",
    desc: "Flight recorder: every state transition with the keys that changed. The causal trace, not two snapshots.",
  },
  {
    name: "submitCheckoutWithCard",
    desc: "Real actions you defined, schema'd and callable — no fragile selectors, no vision round-trips.",
  },
  {
    name: "getGroundstateHealth",
    desc: "Runs every read-only tool and reports what broke. Selectors rot loudly, never silently.",
  },
  {
    name: "Inspector overlay",
    desc: "In-page panel to browse and invoke every tool while you author them.",
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

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-12 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">Groundstate</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Give your coding agent <em className="not-italic text-emerald-400">ground truth</em> about
          your running app
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-fd-muted-foreground">
          Your agent writes your frontend, but it can't see inside it — it guesses from screenshots
          and DOM dumps, and you burn round-trips correcting it. Groundstate ends the guessing.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/docs"
            className="rounded-lg bg-emerald-500 px-7 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            Get started
          </Link>
          <a
            href="https://github.com/souravinsights/groundstate"
            className="rounded-lg border border-fd-border px-7 py-3 font-semibold transition hover:bg-fd-accent"
          >
            GitHub
          </a>
        </div>
      </section>

      {/* Positioning */}
      <p className="mx-auto max-w-2xl px-6 pb-16 text-center text-fd-muted-foreground">
        Chrome DevTools MCP tells the agent what the browser sees.
        <br />
        <strong className="text-fd-foreground">Groundstate tells it what the app knows.</strong>
      </p>

      {/* Code sample */}
      <section className="mx-auto max-w-3xl border-t border-fd-border px-6 py-14">
        <h2 className="text-2xl font-bold">Your app, as tools your agent can call</h2>
        <p className="mt-3 text-fd-muted-foreground">
          A dev-only SDK built on WebMCP: you decide what state and actions matter, and any MCP
          agent — Claude Code, Codex, Cursor — gets them as first-class tools against the live,
          running app.
        </p>
        <pre className="mt-6 overflow-x-auto rounded-xl border border-fd-border bg-fd-card p-5 text-[13.5px] leading-relaxed">
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
      <section className="mx-auto max-w-4xl border-t border-fd-border px-6 py-14">
        <h2 className="text-2xl font-bold">What the agent gets</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <div key={t.name} className="rounded-xl border border-fd-border bg-fd-card p-5">
              <h3 className="font-mono text-sm font-semibold text-sky-400">{t.name}</h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quickstart */}
      <section className="mx-auto max-w-3xl border-t border-fd-border px-6 py-14">
        <h2 className="text-2xl font-bold">Quickstart</h2>
        <ol className="mt-6 space-y-6">
          {[
            ["Instrument your app (dev builds only)", "npm install groundstate @groundstate/react"],
            [
              "Run Chrome with a debugging port",
              "chrome --remote-debugging-port=9222 \\\n  --user-data-dir=/tmp/gs http://localhost:5173",
            ],
            [
              "Connect the agent you already use",
              "claude mcp add groundstate -- npx @groundstate/bridge --page localhost:5173",
            ],
          ].map(([label, cmd], i) => (
            <li key={label} className="flex gap-4">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-fd-border bg-fd-card font-bold text-emerald-400">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{label}</p>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-3 text-[13px]">
                  <code>{cmd}</code>
                </pre>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-fd-muted-foreground">
          That's it — your agent now reads real state, performs real actions, and jumps to real
          fixtures against the running app. Works in any Chromium browser today; the same
          registrations light up automatically when native WebMCP agents ship.
        </p>
      </section>

      {/* Packages */}
      <section className="mx-auto max-w-3xl border-t border-fd-border px-6 py-14">
        <h2 className="text-2xl font-bold">Packages</h2>
        <div className="mt-6 overflow-hidden rounded-xl border border-fd-border">
          {PACKAGES.map(([name, desc]) => (
            <div
              key={name}
              className="flex flex-col gap-1 border-b border-fd-border bg-fd-card p-4 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <code className="flex-none font-mono text-sm text-sky-400 sm:w-56">{name}</code>
              <span className="text-sm text-fd-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="mx-auto max-w-3xl border-t border-fd-border px-6 py-14">
        <h2 className="text-2xl font-bold">Security, by construction</h2>
        <p className="mt-3 text-fd-muted-foreground">
          Groundstate exposes internal state and mutating actions — powerful by design, so it is
          dev/preview only. <code className="text-fd-foreground">init()</code> detects production
          builds and refuses to start; there is deliberately no override flag. Your users never see
          it.
        </p>
      </section>

      <footer className="border-t border-fd-border px-6 py-12 text-center text-sm text-fd-muted-foreground">
        Built on the{" "}
        <a href="https://developer.chrome.com/docs/ai/webmcp" className="text-sky-400">
          WebMCP
        </a>{" "}
        open standard (W3C, Chrome origin trial) ·{" "}
        <a href="https://github.com/souravinsights/groundstate" className="text-sky-400">
          Source on GitHub
        </a>
      </footer>
    </main>
  );
}
