/**
 * The webmcp-stack logo.
 *
 * The mark is two squares mid-stack: an outlined square below, a solid
 * accent square landing on top. It reads as layers — a stack of tools
 * on top of the spec — and stays legible at favicon size.
 *
 * The wordmark is one lowercase word, `webmcpstack`, with the color
 * split at the family boundary: `webmcp` in ink, `stack` in accent.
 * `product` appends a dim suffix ("webmcpstack / codegen") so each
 * surface can say which product of the stack it belongs to.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="2.5" y="10.5" width="10" height="10" stroke="currentColor" strokeWidth="1.8" />
      <rect x="11.5" y="3.5" width="10" height="10" fill="var(--color-accent)" />
    </svg>
  );
}

export function Logo({ product, className }: { product?: string; className?: string }) {
  return (
    <span
      className={[
        "flex items-center gap-2.5 font-mono text-sm tracking-tight text-ink",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <LogoMark className="size-3.5 shrink-0" />
      <span>
        webmcp<span className="text-accent">stack</span>
        {product ? <span className="text-faint"> / {product}</span> : null}
      </span>
    </span>
  );
}
