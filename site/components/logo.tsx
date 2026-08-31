import {
  WORDMARK_CAP,
  WORDMARK_DESC,
  WORDMARK_PATH_LEFT,
  WORDMARK_PATH_RIGHT,
  WORDMARK_WIDTH,
} from "@/lib/wordmark-paths";

/**
 * The webmcp-stack logo.
 *
 * The mark is three isometric layers with the top one solid accent:
 * a stack of tools, one of them live. It keeps a centered footprint
 * (so it sits cleanly next to the wordmark at any gap) and stays
 * legible at favicon size.
 *
 * The wordmark is one lowercase word, `webmcpstack`, with the color
 * split at the family boundary: `webmcp` in ink, `stack` in accent.
 * `product` appends a dim suffix ("webmcpstack / codegen") so each
 * surface can say which product of the stack it belongs to.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={["logo-mark", className].filter(Boolean).join(" ")}
    >
      <path d="M12 2.5 L21 7 L12 11.5 L3 7 Z" fill="var(--color-accent)" />
      <path
        d="M3 12 L12 16.5 L21 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M3 16.5 L12 21 L21 16.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The wordmark as inline type: JetBrains Mono Medium converted to paths
 * (see brand/wordmark.js), sized in em so it sits inside running text.
 * The cap height reads at about 0.8em of the surrounding text and the
 * descender hangs below the baseline, so it composes like a word, not
 * an image dropped on the line.
 */
export function LogoWord({ className }: { className?: string }) {
  const total = WORDMARK_CAP + WORDMARK_DESC;
  return (
    <svg
      viewBox={`0 ${-WORDMARK_CAP} ${WORDMARK_WIDTH} ${total}`}
      role="img"
      aria-label="webmcpstack"
      className={className}
      style={{
        display: "inline-block",
        height: "1em",
        verticalAlign: `-${(WORDMARK_DESC / total).toFixed(3)}em`,
      }}
    >
      <path d={WORDMARK_PATH_LEFT} fill="var(--color-ink)" />
      <path d={WORDMARK_PATH_RIGHT} fill="var(--color-accent)" />
    </svg>
  );
}

export function Logo({ product, className }: { product?: string; className?: string }) {
  return (
    <span
      className={[
        "group/logo flex items-center gap-2 font-mono text-[15px] tracking-tight text-ink",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <LogoMark className="size-5 shrink-0" />
      <span>
        webmcp<span className="text-accent">stack</span>
        {product ? <span className="text-faint"> / {product}</span> : null}
      </span>
    </span>
  );
}
