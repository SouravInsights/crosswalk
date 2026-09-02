"use client";

import { useEffect, useRef } from "react";
import { dashboardHtml } from "@webmcp-stack/codegen/dev-ui";
import { DASHBOARD_STATE } from "@/lib/demo-data";

/* The demo is the product: the real dashboard UI from
   packages/codegen/src/dev/ui.ts, mounted in a shadow root and booted from
   injected state (no server). Code disclosure lives inside the dashboard —
   each tool's detail reveals its generated source. */

export function DashboardDemo() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.shadowRoot) return;
    const root = host.attachShadow({ mode: "open" });
    // Scripts set via innerHTML or DOMParser never execute (spec-level,
    // shadow roots included). Adopt the styles and markup, then re-create
    // the script element so the dashboard's JS actually runs.
    const doc = new DOMParser().parseFromString(
      dashboardHtml(DASHBOARD_STATE as never, { scoped: true }),
      "text/html",
    );
    for (const node of Array.from(doc.querySelectorAll("style"))) {
      root.appendChild(document.importNode(node, true));
    }
    for (const node of Array.from(doc.body.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "SCRIPT") continue;
      root.appendChild(document.importNode(node, true));
    }
    const script = doc.querySelector("script");
    if (script?.textContent) {
      // The dashboard's JS uses document.getElementById and document.querySelector,
      // which do not pierce a shadow root. Delegate both to the shadow root.
      const shim =
        "(function (root) {" +
        "  var byId = document.getElementById.bind(document);" +
        "  document.getElementById = function (id) { return byId(id) || root.getElementById(id); };" +
        "  var qs = document.querySelector.bind(document);" +
        "  document.querySelector = function (sel) { return qs(sel) || root.querySelector(sel); };" +
        "})(" +
        "document.querySelector('.dashboard-demo-host').shadowRoot" +
        ");";
      const live = document.createElement("script");
      live.textContent = shim + script.textContent;
      root.appendChild(live);
    }
  }, []);

  return (
    <div className="overflow-hidden border border-line bg-panel">
      {/* Browser chrome: just the localhost bar. The dashboard lives here. */}
      <div className="flex items-center gap-3 border-b border-line bg-panel-raised/60 px-4 py-2.5">
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-2 rounded-full bg-line" />
          <span className="size-2 rounded-full bg-line" />
          <span className="size-2 rounded-full bg-line" />
        </span>
        <span className="flex min-w-0 flex-1 justify-center">
          <span className="truncate border border-line bg-baseline px-3 py-1 font-mono text-[11px] text-faint">
            localhost:7654
          </span>
        </span>
        <span className="flex w-[52px] items-center justify-end" aria-hidden="true" />
      </div>

      {/* The dashboard fills the frame. Code is revealed per-tool, inside the
          dashboard, via the progressive-disclosure affordance on each tool. */}
      <div ref={hostRef} className="dashboard-demo-host h-[30rem] sm:h-[32rem]" />
    </div>
  );
}
