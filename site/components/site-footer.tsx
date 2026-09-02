import Link from "next/link";
import { Logo, LogoWord } from "@/components/logo";

const REPO = "https://github.com/SouravInsights/webmcp-stack";

/**
 * The sign-off mark. At rest it is the assembled logo; on hover the
 * layers settle apart, the same motion as the about page hero. Purely
 * decorative.
 */
function FooterMark() {
  return (
    <span
      className="footer-mark inline-flex text-faint"
      aria-hidden="true"
      title="the stack, at rest"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
        <path d="M12 2.5 L21 7 L12 11.5 L3 7 Z" fill="var(--color-accent)" />
        <path
          d="M3 12 L12 16.5 L21 12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M3 16.5 L12 21 L21 16.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" aria-label="webmcp-stack home" className="inline-block">
              <Logo />
            </Link>
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-dim">
              The open-source developer stack for WebMCP. Give agents useful capabilities without
              losing visibility or control over what they can do.
            </p>
          </div>
          <nav aria-label="Product">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ghost">product</p>
            <ul className="mt-4 space-y-2.5 text-[13.5px]">
              <li>
                <Link
                  href="/docs"
                  className="text-dim transition-colors duration-150 hover:text-ink"
                >
                  docs
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/quickstart"
                  className="text-dim transition-colors duration-150 hover:text-ink"
                >
                  quickstart
                </Link>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/@webmcp-stack/codegen"
                  className="text-dim transition-colors duration-150 hover:text-ink"
                >
                  npm
                </a>
              </li>
            </ul>
          </nav>
          <nav aria-label="Project">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ghost">project</p>
            <ul className="mt-4 space-y-2.5 text-[13.5px]">
              <li>
                <Link
                  href="/about"
                  className="text-dim transition-colors duration-150 hover:text-ink"
                >
                  about
                </Link>
              </li>
              <li>
                <Link
                  href="/brand"
                  className="text-dim transition-colors duration-150 hover:text-ink"
                >
                  brand
                </Link>
              </li>
              <li>
                <a href={REPO} className="text-dim transition-colors duration-150 hover:text-ink">
                  github
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-14 flex items-center justify-between border-t border-line pt-6">
          <p className="font-mono text-[11.5px] text-faint">
            © 2026 <LogoWord />, MIT license
          </p>
          <FooterMark />
        </div>
      </div>
    </footer>
  );
}
