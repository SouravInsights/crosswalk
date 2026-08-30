"use client";

import { useState } from "react";

/**
 * The namesake moment.
 *
 * Every section above argues that apps need a known baseline to return
 * to. This button makes the landing page itself honor the claim: it
 * resets the hero's demo store (via the "groundstate:reset" event the
 * Instrument listens for) and returns the visitor to the top, the
 * page's own ground state, in one click.
 */
export function ResetSection() {
  const [restored, setRestored] = useState(false);

  const reset = () => {
    window.dispatchEvent(new Event("groundstate:reset"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    setRestored(true);
    window.setTimeout(() => setRestored(false), 2600);
  };

  return (
    <div>
      <button
        type="button"
        onClick={reset}
        className="
          border border-accent/50 bg-accent/5 px-6 py-4 font-mono text-sm
          text-accent transition-all duration-200
          hover:border-accent hover:bg-accent hover:text-baseline
          active:translate-y-px
        "
        style={{ transitionTimingFunction: "var(--ease-reading)" }}
      >
        {restored ? "ground state restored" : "resetToGroundState()"}
      </button>
      <p className="mt-4 font-mono text-xs text-faint leading-relaxed">
        resets the demo store at the top of this page and your scroll position.
      </p>
    </div>
  );
}
