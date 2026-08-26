import type { ToolInfo } from "groundstate";

export interface InspectorOptions {
  /** Corner for the toggle button (default "bottom-right"). */
  position?: "bottom-right" | "bottom-left";
  /** Start with the panel open (default false). */
  open?: boolean;
}

export interface InspectorHandle {
  /** Remove the inspector from the page. */
  unmount: () => void;
}

/**
 * Mount the Groundstate inspector: a small in-page overlay listing every tool
 * the app currently exposes, with a runner to invoke them and see live
 * results. Dev aid for authoring observe/act/fixture calls — rendered in a
 * shadow root so it never collides with app styles.
 */
export function mountInspector(options: InspectorOptions = {}): InspectorHandle {
  if (typeof document === "undefined") {
    return { unmount: () => {} };
  }

  const host = document.createElement("div");
  host.id = "groundstate-inspector";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.appendChild(buildStyles(options.position ?? "bottom-right"));

  const toggle = el("button", { class: "gs-toggle", title: "Groundstate inspector" }, "GS");
  const panel = el("div", { class: "gs-panel" });
  if (!options.open) panel.classList.add("gs-hidden");

  toggle.addEventListener("click", () => {
    panel.classList.toggle("gs-hidden");
    if (!panel.classList.contains("gs-hidden")) renderPanel(panel);
  });

  shadow.appendChild(toggle);
  shadow.appendChild(panel);
  document.body.appendChild(host);

  if (options.open) renderPanel(panel);

  return {
    unmount: () => {
      host.remove();
    },
  };
}

function renderPanel(panel: HTMLElement): void {
  panel.replaceChildren();

  const binding = window.__GROUNDSTATE__;
  const header = el("div", { class: "gs-header" });
  header.appendChild(el("strong", {}, "Groundstate"));
  header.appendChild(
    el("span", { class: "gs-muted" }, binding ? ` v${binding.version}` : " — not initialized"),
  );
  const refresh = el("button", { class: "gs-refresh", title: "Refresh tools" }, "↻");
  refresh.addEventListener("click", () => renderPanel(panel));
  header.appendChild(refresh);
  panel.appendChild(header);

  if (!binding) {
    panel.appendChild(
      el(
        "p",
        { class: "gs-muted gs-pad" },
        "window.__GROUNDSTATE__ is missing. Call groundstate.init() in a dev build first.",
      ),
    );
    return;
  }

  const tools = binding.list();
  if (tools.length === 0) {
    panel.appendChild(
      el(
        "p",
        { class: "gs-muted gs-pad" },
        "No tools registered yet. Add observe/act/fixture calls.",
      ),
    );
    return;
  }

  const list = el("div", { class: "gs-list" });
  for (const tool of tools) {
    list.appendChild(renderTool(tool, binding));
  }
  panel.appendChild(list);
}

function renderTool(tool: ToolInfo, binding: NonNullable<Window["__GROUNDSTATE__"]>): HTMLElement {
  const details = el("details", { class: "gs-tool" });
  const summary = el("summary");
  summary.appendChild(el("code", {}, tool.name));
  summary.appendChild(
    el(
      "span",
      { class: tool.readOnly ? "gs-badge gs-ro" : "gs-badge gs-rw" },
      tool.readOnly ? "read" : "mutate",
    ),
  );
  details.appendChild(summary);

  const body = el("div", { class: "gs-tool-body" });
  body.appendChild(el("p", { class: "gs-muted" }, tool.description));

  const args = el("textarea", {
    class: "gs-args",
    rows: "2",
    placeholder: tool.inputSchema ? JSON.stringify(exampleArgs(tool.inputSchema)) : "{}",
  }) as HTMLTextAreaElement;
  if (tool.inputSchema) body.appendChild(args);

  const run = el("button", { class: "gs-run" }, "Run");
  const output = el("pre", { class: "gs-output gs-hidden" });

  run.addEventListener("click", async () => {
    let parsed: Record<string, unknown> = {};
    if (tool.inputSchema && args.value.trim()) {
      try {
        parsed = JSON.parse(args.value) as Record<string, unknown>;
      } catch {
        output.textContent = "Invalid JSON in arguments.";
        output.classList.remove("gs-hidden");
        return;
      }
    }
    output.textContent = "…";
    output.classList.remove("gs-hidden");
    const result = await binding.call(tool.name, parsed);
    output.textContent = result.ok
      ? JSON.stringify(result.result, null, 2)
      : `Error: ${result.error}`;
    output.classList.toggle("gs-error", !result.ok);
  });

  body.appendChild(run);
  body.appendChild(output);
  details.appendChild(body);
  return details;
}

function exampleArgs(schema: Record<string, unknown>): Record<string, unknown> {
  const props = (schema.properties ?? {}) as Record<string, { type?: string }>;
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(props)) {
    out[key] = def.type === "number" ? 0 : def.type === "boolean" ? false : "";
  }
  return out;
}

function el(tag: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildStyles(position: "bottom-right" | "bottom-left"): HTMLStyleElement {
  const side = position === "bottom-right" ? "right" : "left";
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .gs-hidden { display: none !important; }
    .gs-toggle {
      position: fixed; bottom: 16px; ${side}: 16px; z-index: 2147483646;
      width: 40px; height: 40px; border-radius: 20px; border: 1px solid #333;
      background: #111; color: #7ee787; font-weight: 700; font-size: 13px;
      cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,.4);
    }
    .gs-panel {
      position: fixed; bottom: 64px; ${side}: 16px; z-index: 2147483646;
      width: 360px; max-height: 70vh; overflow: auto; border-radius: 10px;
      background: #0d1117; color: #e6edf3; border: 1px solid #30363d;
      box-shadow: 0 8px 30px rgba(0,0,0,.5); font-size: 12px;
    }
    .gs-header {
      display: flex; align-items: center; gap: 6px; padding: 10px 12px;
      border-bottom: 1px solid #30363d; position: sticky; top: 0; background: #0d1117;
    }
    .gs-refresh { margin-left: auto; background: none; border: none; color: #e6edf3; cursor: pointer; font-size: 14px; }
    .gs-muted { color: #8b949e; }
    .gs-pad { padding: 12px; margin: 0; }
    .gs-list { padding: 6px; }
    .gs-tool { border: 1px solid #21262d; border-radius: 6px; margin: 6px; background: #161b22; }
    .gs-tool summary { padding: 8px 10px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .gs-tool code { color: #79c0ff; }
    .gs-badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; margin-left: auto; }
    .gs-ro { background: #1f3d2b; color: #7ee787; }
    .gs-rw { background: #3d2b1f; color: #ffa657; }
    .gs-tool-body { padding: 0 10px 10px; }
    .gs-tool-body p { margin: 4px 0 8px; }
    .gs-args { width: 100%; background: #0d1117; color: #e6edf3; border: 1px solid #30363d; border-radius: 6px; padding: 6px; }
    .gs-run {
      margin-top: 6px; padding: 4px 14px; border-radius: 6px; border: 1px solid #238636;
      background: #238636; color: #fff; cursor: pointer;
    }
    .gs-output {
      margin-top: 8px; padding: 8px; background: #010409; border: 1px solid #21262d;
      border-radius: 6px; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow: auto;
    }
    .gs-error { color: #ff7b72; }
  `;
  return style;
}
