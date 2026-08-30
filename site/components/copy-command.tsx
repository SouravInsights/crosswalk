"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * A terminal-style command line with a copy button.
 * The one interactive element on the page, and deliberately so:
 * the call to action is the command, so copying it should be effortless.
 */
export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // Clipboard can be unavailable (insecure context, permissions). Fall
      // back to selection so the command is still one keystroke away.
      const range = document.createRange();
      const el = document.getElementById(`copy-command-${command.length}`);
      if (el) {
        range.selectNodeContents(el);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex items-center gap-3 border border-line bg-panel py-2.5 pl-4 pr-2 font-mono text-[13px]">
      <span className="select-none text-ghost">$</span>
      <span id={`copy-command-${command.length}`} className="whitespace-nowrap text-ink">
        {command}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy command"}
        className="ml-auto flex size-7 items-center justify-center border border-line text-dim transition-colors duration-150 hover:border-dim hover:text-ink"
        style={{ transitionTimingFunction: "var(--ease-reading)" }}
      >
        {copied ? <Check className="size-3.5 text-phosphor" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}
