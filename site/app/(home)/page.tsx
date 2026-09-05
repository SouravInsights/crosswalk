import { ArrowDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
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

/* The whole product story as one sheet of guaranteed properties, numbered
   like clauses in a standard. The naming claim leads the list, not the page. */
const TOOL_STANDARD: Array<{ title: string; body: ReactNode }> = [
  {
    title: "A name that says what it does",
    body: (
      <span className="flex flex-col gap-1">
        <s className="font-mono text-faint">post-trips-trip-id-story-generate</s>
        <span className="font-mono">
          <span className="text-ghost">→ </span>
          <span className="font-medium text-accent">generate-story</span>
        </span>
      </span>
    ),
  },
  {
    title: "A description an agent can act on",
    body: "What it does, when to use it, what it returns.",
  },
  {
    title: "Inputs spelled out in words",
    body: "Required, optional, limits: written in, never guessed.",
  },
  {
    title: "Dangerous tools start disabled",
    body: "Auth, admin, and destructive ones stay off until you turn them on.",
  },
  {
    title: "Failures that say what to try next",
    body: "A readable reason, never a stack trace.",
  },
  {
    title: "A human keeps the final click",
    body: "Payments and deletes stop at a confirmation.",
  },
  {
    title: "Re-runs never touch your code",
    body: "The spec moves, the tools update, your edits survive.",
  },
  {
    title: "No account, no telemetry, no runtime",
    body: "Plain TypeScript in your repo, nothing imported back.",
  },
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
              One command reads your OpenAPI spec or validation schemas and writes them: typed,
              checked for safety, ready to test in the local playground.
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

      {/* The standard: the one section a scanner needs, rendered as the
          thing it claims to be — a spec sheet. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-6 sm:py-24">
          <h2 className="mb-3 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-medium tracking-[-0.015em]">
            What every generated tool ships with.
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-[15px] leading-relaxed text-dim sm:mb-16">
            An agent never sees your API. It sees each tool's name, description, and schema, and
            nothing else. So each one meets every line of the same standard:
          </p>

          {/* The standard as a physical sheet, in the page's own material:
              dark card stock, taped to the desk, punched for a binder,
              ruled clauses, a handwritten note, and the stamp it earns. */}
          <div className="relative mx-auto max-w-3xl border border-line bg-panel text-left shadow-[0_10px_70px_rgba(0,0,0,0.7)]">
            {/* Card-stock grain: SVG turbulence noise plus a soft edge
                vignette, so the surface reads matte, not flat. */}
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
              <filter id="sheet-grain">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.9"
                  numOctaves="2"
                  stitchTiles="stitch"
                />
                <feColorMatrix type="saturate" values="0" />
              </filter>
              <rect width="100%" height="100%" filter="url(#sheet-grain)" opacity="0.05" />
            </svg>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 shadow-[inset_0_0_90px_rgba(0,0,0,0.35)]"
            />

            {/* Binder holes punched down the left edge: true voids, the
                desk's darkness shows through. Sized down slightly on
                mobile to match the tighter margin. */}
            {["top-[23%]", "top-[48%]", "top-[73%]"].map((pos) => (
              <span
                key={pos}
                aria-hidden="true"
                className={`absolute left-2.5 ${pos} size-3 rounded-full border border-line bg-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] sm:left-3 sm:size-3.5`}
              />
            ))}

            {/* Masthead. Padding tightens on mobile — the original desktop
                margin left too little room for the clause text to breathe
                on a phone. */}
            <div className="pl-9 pr-5 pt-8 sm:pl-14 sm:pr-11 sm:pt-11">
              <div className="flex items-baseline justify-between">
                <p className="text-[19px] leading-none">
                  <LogoWord />
                  <span className="ml-2.5 font-mono text-[10px] tracking-[0.2em] text-faint">
                    / CODEGEN
                  </span>
                </p>
                <span className="font-mono text-[10px] tracking-[0.2em] text-faint">NO. 001</span>
              </div>
              <p className="mt-6 font-display text-[clamp(1.7rem,3.6vw,2.5rem)] font-medium leading-none tracking-[-0.015em] text-ink">
                The tool standard.
              </p>
              <p className="mt-3 max-w-md rotate-[0.4deg] font-[family-name:var(--font-caveat)] text-[19px] leading-snug text-dim">
                every generated tool, checked against all eight on every run
              </p>
              <div className="mt-7 border-b border-ink/25" />
              <div className="mt-[3px] border-b border-line" />
            </div>

            {/* The clauses. On mobile the number sits inline with the title
                (a real numbered line, not a stray column); at sm the same
                two elements drop into the grid as separate columns via
                `contents`, so there's one markup shape for both layouts. */}
            <div className="pl-9 pr-5 sm:pl-14 sm:pr-11">
              {TOOL_STANDARD.map(({ title, body }, i) => (
                <div
                  key={title}
                  className="border-b border-line py-3.5 last:border-b-0 sm:grid sm:grid-cols-[2rem_minmax(0,2fr)_minmax(0,3fr)] sm:items-baseline sm:gap-6 sm:py-4"
                >
                  <div className="flex items-baseline gap-2.5 sm:contents">
                    <p className="font-mono text-[11px] font-medium text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <p className="text-[13.5px] font-medium leading-snug text-ink">{title}</p>
                  </div>
                  <p className="mt-1.5 pl-6 text-[13.5px] leading-relaxed text-dim sm:mt-0 sm:pl-0">
                    {body}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer: the colophon, signed. Stacked on mobile so the
                signature isn't forced right, under the stamp; side by
                side once there's room for it. */}
            <div className="flex flex-col gap-2 pb-8 pl-9 pr-5 pt-5 font-mono text-[10px] tracking-[0.2em] text-faint sm:flex-row sm:items-baseline sm:justify-between sm:gap-0 sm:pl-14 sm:pr-11">
              <span>EVERY GENERATED TOOL, EVERY RUN</span>
              <span className="rotate-[-3deg] font-[family-name:var(--font-caveat)] text-[18px] normal-case tracking-normal text-accent sm:mr-20">
                webmcp-stack
              </span>
            </div>

            {/* The stamp: the one flourish, earned by the run that checks
                it. Smaller on mobile so it stays a corner detail instead
                of crowding the sheet. */}
            <svg
              viewBox="0 0 96 96"
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -right-4 size-20 rotate-[-9deg] text-accent opacity-90 sm:-bottom-9 sm:-right-10 sm:size-28"
            >
              <defs>
                <path id="stamp-ring" d="M48 15 a33 33 0 1 1 -0.01 0" fill="none" />
              </defs>
              <circle cx="48" cy="48" r="45" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="48" cy="48" r="26" fill="none" stroke="currentColor" strokeWidth="1" />
              <text
                fontSize="7.2"
                letterSpacing="1.6"
                fill="currentColor"
                fontFamily="monospace"
                fontWeight="600"
              >
                <textPath href="#stamp-ring" textLength="205">
                  CHECKED ON EVERY RUN ✕ WEBMCP-STACK
                </textPath>
              </text>
              <g transform="translate(36.5,34.5)">
                <path
                  d="M3 19.5 L12 24 L21 19.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 13.5 L12 18 L21 13.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path d="M12 5 L21 9.5 L12 14 L3 9.5 Z" fill="currentColor" />
              </g>
            </svg>
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
