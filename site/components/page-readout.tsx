"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Footer self-readout: the page still instruments itself, quietly.
 * The hero instrument demonstrates the product on a real store; this
 * single line is the same idea turned inward: this page's own state,
 * exposed the way an agent would read it.
 */
export function PageReadout() {
  const [section, setSection] = useState("hero");
  const [scroll, setScroll] = useState("0%");
  const [elapsed, setElapsed] = useState("0:00");
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
        setScroll(`${pct}%`);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-observe-section");
            if (id) setSection(id);
          }
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    for (const el of document.querySelectorAll("[data-observe-section]")) {
      observer.observe(el);
    }

    const tick = window.setInterval(() => {
      const total = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(`${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`);
    }, 1000);

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.clearInterval(tick);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <p className="font-mono text-xs text-ghost tabular-nums" aria-live="off">
      <span className="text-faint">this page:</span> {"{ "}
      section: <span className="text-phosphor-dim">"{section}"</span>, scroll:{" "}
      <span className="text-phosphor-dim">"{scroll}"</span>, t+:{" "}
      <span className="text-phosphor-dim">"{elapsed}"</span>
      {" }"}
    </p>
  );
}
