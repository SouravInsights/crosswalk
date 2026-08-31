"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * A brand color card: swatch on top, name and values below.
 * Clicking anywhere copies the hex value.
 */
export function ColorSwatch({
  name,
  hex,
  rgb,
  border,
}: {
  name: string;
  hex: string;
  rgb: string;
  border?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(hex);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${name} hex value ${hex}`}
      className="group border border-line bg-panel text-left transition-colors duration-150 hover:border-faint"
      style={{ transitionTimingFunction: "var(--ease-reading)" }}
    >
      <span
        className={`block h-24 w-full ${border ? "border-b border-line" : ""}`}
        style={{ backgroundColor: hex }}
      />
      <span className="block px-3.5 py-3">
        <span className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-ink">{name}</span>
          {copied ? (
            <Check className="size-3.5 text-accent" />
          ) : (
            <Copy className="size-3.5 text-ghost transition-colors group-hover:text-dim" />
          )}
        </span>
        <span className="mt-1 block font-mono text-[11.5px] text-faint">{rgb}</span>
        <span className="block font-mono text-[11.5px] text-dim">{hex}</span>
      </span>
    </button>
  );
}
