import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ColorSwatch } from "@/components/color-swatch";
import { Logo, LogoMark, LogoWord } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Brand guidelines",
  description: "Logos, wordmark, colors, and usage rules for webmcp-stack.",
};

const REPO = "https://github.com/SouravInsights/webmcp-stack";

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="scroll-mt-24 font-display text-xl font-semibold tracking-tight text-ink">
      {children}
    </h2>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 max-w-2xl space-y-3 text-[14px] leading-relaxed text-dim">{children}</div>;
}

function DownloadButton({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      download
      className="border border-line px-2.5 py-1 font-mono text-[11px] text-dim transition-colors duration-150 hover:border-faint hover:text-ink"
      style={{ transitionTimingFunction: "var(--ease-reading)" }}
    >
      {children}
    </a>
  );
}

function AssetCard({
  label,
  svg,
  png,
  dark,
  children,
}: {
  label: string;
  svg: string;
  png?: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-line">
      <div
        className={`flex h-44 items-center justify-center ${
          dark ? "bg-[#0a0b0f]" : "border-b border-line bg-white"
        }`}
      >
        {children}
      </div>
      <div className="flex items-center justify-between border-t border-line bg-panel px-3.5 py-2.5">
        <span className="font-mono text-[11.5px] text-faint">{label}</span>
        <span className="flex items-center gap-2">
          <DownloadButton href={svg}>SVG</DownloadButton>
          {png ? <DownloadButton href={png}>PNG</DownloadButton> : null}
        </span>
      </div>
    </div>
  );
}

const COLORS = [
  { name: "Baseline", hex: "#0a0b0f", rgb: "RGB 10, 11, 15" },
  { name: "Panel", hex: "#0f1117", rgb: "RGB 15, 17, 23" },
  { name: "Ink", hex: "#e9ecf2", rgb: "RGB 233, 236, 242", border: true },
  { name: "Dim", hex: "#9aa3b2", rgb: "RGB 154, 163, 178" },
  { name: "Faint", hex: "#5d6575", rgb: "RGB 93, 101, 117" },
  { name: "Accent", hex: "#58a6ff", rgb: "RGB 88, 166, 255" },
  { name: "Signal", hex: "#e3b341", rgb: "RGB 227, 179, 65" },
  { name: "Fault", hex: "#f47067", rgb: "RGB 244, 112, 103" },
];

const TOC = [
  ["naming", "Naming"],
  ["usage", "Usage"],
  ["wordmark", "Wordmark"],
  ["logomark", "Logomark"],
  ["colors", "Colors"],
] as const;

export default function BrandPage() {
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
            <Link href="/about" className="transition-colors duration-150 hover:text-ink">
              about
            </Link>
            <a href={REPO} className="transition-colors duration-150 hover:text-ink">
              github
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="lg:grid lg:grid-cols-[1fr_160px] lg:gap-12">
          <div className="min-w-0 py-16 sm:py-20">
            {/* Header */}
            <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-faint">
              webmcp-stack
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Brand guidelines
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-dim">
              Everything you need to reference <LogoWord /> in your project: the mark, the
              wordmark, and the colors. Click any hex value to copy it.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="/brand/webmcp-stack-brand.zip"
                download
                className="flex items-center gap-2 bg-ink px-4 py-2 font-mono text-[12.5px] font-medium text-baseline transition-colors duration-150 hover:bg-white"
                style={{ transitionTimingFunction: "var(--ease-reading)" }}
              >
                <Download className="size-3.5" />
                Download brand assets
              </a>
              <a
                href={`${REPO}/issues`}
                className="border border-line px-4 py-2 font-mono text-[12.5px] text-dim transition-colors duration-150 hover:border-faint hover:text-ink"
                style={{ transitionTimingFunction: "var(--ease-reading)" }}
              >
                Get in touch
              </a>
            </div>

            {/* Naming */}
            <section className="mt-16 border-t border-line pt-12">
              <SectionHeading id="naming">Naming</SectionHeading>
              <Prose>
                <p>
                  &ldquo;webmcp-stack&rdquo; is written lowercase with a hyphen in prose, URLs, and
                  package scopes. The wordmark renders it as one word, <LogoWord />, with the
                  color split at the family boundary. Both spellings are the same name; never
                  &ldquo;WebMCP Stack&rdquo; in body copy unless it starts a sentence, and never
                  &ldquo;WMCP&rdquo; or &ldquo;the stack&rdquo; alone.
                </p>
                <p>
                  Products are functional names under the scope:{" "}
                  <span className="font-mono text-ink">@webmcp-stack/codegen</span>, and later{" "}
                  <span className="font-mono text-ink">@webmcp-stack/audit</span>,{" "}
                  <span className="font-mono text-ink">@webmcp-stack/telemetry</span>. On a surface
                  that belongs to one product, the lockup adds a dim suffix: <LogoWord />{" "}
                  <span className="font-mono text-faint">/ codegen</span>.
                </p>
              </Prose>
            </section>

            {/* Usage */}
            <section className="mt-14 border-t border-line pt-12">
              <SectionHeading id="usage">Usage</SectionHeading>
              <Prose>
                <p>
                  Give the assets room to breathe. Scale them up or down, but never stretch,
                  recolor, outline, rotate, or layer effects on top of them. Keep at least the
                  height of the logomark as clear space on every side so the mark stands on its own.
                </p>
                <p>
                  The code is MIT, the marks are not a grant of endorsement. Use them to refer to
                  the project, link to it, or write about it. Do not alter the files, imply a
                  relationship or endorsement that does not exist, or combine them with other marks
                  without asking first. Need something custom?{" "}
                  <a href={`${REPO}/issues`} className="text-ink underline underline-offset-4">
                    Open an issue
                  </a>
                  .
                </p>
              </Prose>
            </section>

            {/* Wordmark */}
            <section className="mt-14 border-t border-line pt-12">
              <SectionHeading id="wordmark">Wordmark</SectionHeading>
              <Prose>
                <p>
                  Prefer the wordmark whenever space allows. It is set in JetBrains Mono Medium and
                  shipped as vector paths, so it renders correctly without the font installed. Use
                  the light version on dark surfaces and the dark version on light surfaces.
                </p>
              </Prose>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <AssetCard
                  label="Light on dark"
                  svg="/brand/wordmark-light-on-dark.svg"
                  png="/brand/png/wordmark-light-on-dark-1024.png"
                  dark
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/wordmark-light-on-dark.svg"
                    alt="webmcp-stack wordmark, light on dark"
                    className="w-56"
                  />
                </AssetCard>
                <AssetCard
                  label="Dark on light"
                  svg="/brand/wordmark-dark-on-light.svg"
                  png="/brand/png/wordmark-dark-on-light-1024.png"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/wordmark-dark-on-light.svg"
                    alt="webmcp-stack wordmark, dark on light"
                    className="w-56"
                  />
                </AssetCard>
              </div>
            </section>

            {/* Logomark */}
            <section className="mt-14 border-t border-line pt-12">
              <SectionHeading id="logomark">Logomark</SectionHeading>
              <Prose>
                <p>
                  Three isometric layers; the top layer is solid accent. A stack of tools, one of
                  them live. Use the logomark for avatars, favicons, and tight layouts; reach for
                  the wordmark first when you have the room.
                </p>
              </Prose>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <AssetCard label="Light on dark" svg="/brand/logo-mark.svg" png="/brand/png/mark-dark-512.png" dark>
                  <LogoMark className="size-12 text-ink" />
                </AssetCard>
                <AssetCard label="Dark on light" svg="/brand/logo-mark-light.svg" png="/brand/png/mark-light-512.png">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/logo-mark-light.svg" alt="webmcp-stack mark, dark on light" className="size-12" />
                </AssetCard>
                <AssetCard label="Avatar tile" svg="/brand/logo-mark-tile.svg" png="/brand/png/avatar-tile-512.png" dark>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/logo-mark-tile.svg" alt="webmcp-stack avatar tile" className="size-12 rounded-md" />
                </AssetCard>
              </div>
            </section>

            {/* Colors */}
            <section className="mt-14 border-t border-line pt-12">
              <SectionHeading id="colors">Colors</SectionHeading>
              <Prose>
                <p>
                  A dark neutral surface palette with a single blue accent, the blue GitHub ships
                  on its dark theme. Token names describe the role, not the hue. Click any card to
                  copy its hex value.
                </p>
              </Prose>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {COLORS.map((c) => (
                  <ColorSwatch key={c.name} {...c} />
                ))}
              </div>
            </section>

            {/* Footer note */}
            <p className="mt-16 border-t border-line pt-8 text-[13px] leading-relaxed text-faint">
              Need something that isn&rsquo;t here, or permission for a specific use case?{" "}
              <a href={`${REPO}/issues`} className="text-dim underline underline-offset-4">
                Open an issue
              </a>{" "}
              and we&rsquo;ll help.
            </p>
          </div>

          {/* On this page */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 py-20">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ghost">
                On this page
              </p>
              <ul className="mt-4 space-y-2.5">
                {TOC.map(([id, label]) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="text-[13px] text-faint transition-colors duration-150 hover:text-ink"
                      style={{ transitionTimingFunction: "var(--ease-reading)" }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
