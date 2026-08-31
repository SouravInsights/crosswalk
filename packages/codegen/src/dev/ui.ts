/**
 * The dashboard's UI: a single HTML page with embedded CSS and JS.
 * Design goals: professional, scannable, no visual noise.
 *
 * Layout:
 *   - Left sidebar: search + tool list, grouped by risk
 *   - Right panel: tool detail with edit, toggle, and test sections
 *
 * No framework, no build step. Plain HTML/CSS/JS shipped as a string.
 */

interface UiTool {
  name: string;
  description: string;
  sideEffect: string;
  enabled: boolean;
  endpointRole: string;
  piiInOutput: string[];
  findings: { level: string; message: string }[];
  inputSchema?: Record<string, unknown>;
  serverUrl?: string;
  requiresAuth?: boolean;
  verb?: string;
  path?: string;
}

interface UiState {
  label: string;
  outDir?: string;
  tools: UiTool[];
  skipped: { ref: string; reason: string }[];
  notes: string[];
}

export function dashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>webmcp-codegen</title>
<style>
  :root {
    --baseline: #0a0b0f;
    --surface: #10131a;
    --surface-raised: #161a23;
    --line: #1e2330;
    --line-subtle: #161a23;
    --ink: #e9ecf2;
    --dim: #9aa3b2;
    --faint: #5d6575;
    --ghost: #3b4150;
    --accent: #58a6ff;
    --accent-dim: rgba(88, 166, 255, 0.15);
    --signal: #e3b341;
    --signal-dim: rgba(227, 179, 65, 0.15);
    --fault: #f47067;
    --fault-dim: rgba(244, 112, 103, 0.15);
    --sans: ui-sans-serif, system-ui, -apple-system, sans-serif;
    --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body {
    background: var(--baseline);
    color: var(--ink);
    font-family: var(--sans);
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }
  ::selection { background: var(--accent); color: var(--baseline); }

  /* Layout */
  .app { display: flex; height: 100vh; }
  .sidebar {
    width: 320px;
    min-width: 320px;
    border-right: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    background: var(--surface);
  }
  .main {
    flex: 1;
    overflow-y: auto;
    background: var(--baseline);
  }

  /* Sidebar header */
  .sidebar-header {
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--line-subtle);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 4px;
  }
  .brand-mark {
    width: 24px;
    height: 24px;
    background: linear-gradient(135deg, var(--accent), #7c3aed);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: white;
  }
  .brand-sub {
    color: var(--faint);
    font-size: 12px;
  }

  /* Search */
  .search-wrap {
    padding: 12px 16px;
    border-bottom: 1px solid var(--line-subtle);
  }
  .search {
    width: 100%;
    background: var(--surface-raised);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 8px 12px 8px 32px;
    color: var(--ink);
    font-size: 13px;
    font-family: inherit;
    position: relative;
  }
  .search:focus {
    outline: none;
    border-color: var(--accent);
  }
  .search-icon {
    position: absolute;
    left: 28px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--faint);
    pointer-events: none;
  }
  .search-wrap { position: relative; }

  /* Tool list */
  .tool-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }
  .tool-group {
    padding: 8px 16px 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--faint);
  }
  .tool {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 16px;
    border: none;
    background: none;
    color: var(--ink);
    font-size: 13px;
    font-family: var(--mono);
    text-align: left;
    cursor: pointer;
    transition: background 0.1s;
  }
  .tool:hover { background: var(--surface-raised); }
  .tool[aria-selected="true"] {
    background: var(--accent-dim);
    border-right: 2px solid var(--accent);
  }
  .tool-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .tool-indicator.read { background: var(--accent); }
  .tool-indicator.write { background: var(--signal); }
  .tool-indicator.destructive { background: var(--fault); }
  .tool-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tool-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--surface-raised);
    color: var(--dim);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .tool-badge.disabled { color: var(--signal); }

  /* Main content */
  .detail {
    max-width: 640px;
    margin: 0 auto;
    padding: 32px 40px;
  }
  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--faint);
    text-align: center;
    padding: 40px;
  }
  .placeholder-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--surface-raised);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    color: var(--ghost);
  }
  .placeholder kbd {
    background: var(--surface-raised);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: var(--mono);
    font-size: 12px;
  }

  /* Detail header */
  .detail-header {
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--line-subtle);
  }
  .detail-crumb {
    font-size: 12px;
    color: var(--faint);
    margin-bottom: 8px;
    font-family: var(--mono);
  }
  .detail-title {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 8px;
    font-family: var(--mono);
  }
  .detail-route {
    font-family: var(--mono);
    font-size: 13px;
    color: var(--dim);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .verb {
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
  }
  .verb.read { color: var(--accent); background: var(--accent-dim); }
  .verb.write { color: var(--signal); background: var(--signal-dim); }
  .verb.destructive { color: var(--fault); background: var(--fault-dim); }

  /* Badges */
  .badges {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
  }
  .badge {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 500;
  }
  .badge.read { color: var(--accent); background: var(--accent-dim); }
  .badge.write { color: var(--signal); background: var(--signal-dim); }
  .badge.destructive { color: var(--fault); background: var(--fault-dim); }
  .badge.disabled { color: var(--signal); background: var(--signal-dim); }
  .badge.auth { color: var(--fault); background: var(--fault-dim); }

  /* Sections */
  .section {
    margin-bottom: 28px;
  }
  .section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--faint);
    margin-bottom: 10px;
  }

  /* Description edit */
  .description-edit {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 12px;
    color: var(--ink);
    font-size: 14px;
    font-family: inherit;
    line-height: 1.5;
    resize: vertical;
    min-height: 80px;
  }
  .description-edit:focus {
    outline: none;
    border-color: var(--accent);
  }
  .edit-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 10px;
  }
  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink);
  }
  .btn:hover { background: var(--surface-raised); border-color: var(--ghost); }
  .btn-primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--baseline);
  }
  .btn-primary:hover { background: #4a95ee; border-color: #4a95ee; }
  .saved-indicator {
    font-size: 12px;
    color: var(--accent);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .saved-indicator.show { opacity: 1; }
  .edit-hint {
    font-size: 12px;
    color: var(--faint);
    margin-top: 8px;
    line-height: 1.5;
  }

  /* Toggle */
  .toggle-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
  }
  .switch {
    width: 40px;
    height: 22px;
    border-radius: 11px;
    background: var(--surface-raised);
    border: 1px solid var(--line);
    position: relative;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  .switch::after {
    content: "";
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--dim);
    top: 2px;
    left: 2px;
    transition: all 0.2s;
  }
  .switch[aria-checked="true"] {
    background: var(--accent);
    border-color: var(--accent);
  }
  .switch[aria-checked="true"]::after {
    left: 20px;
    background: white;
  }
  .toggle-copy { font-size: 13px; line-height: 1.5; }
  .toggle-copy strong { display: block; margin-bottom: 2px; }

  /* Try it */
  .try-section {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
  }
  .try-header {
    padding: 14px 16px;
    border-bottom: 1px solid var(--line-subtle);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .try-header h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
  }
  .try-note {
    font-size: 11px;
    color: var(--faint);
  }
  .try-body { padding: 16px; }
  .auth-note {
    background: var(--signal-dim);
    border: 1px solid var(--signal);
    color: var(--signal);
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 12px;
    margin-bottom: 14px;
    line-height: 1.5;
  }
  .base-url-input {
    width: 100%;
    background: var(--baseline);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 8px 12px;
    color: var(--ink);
    font-size: 13px;
    font-family: var(--mono);
    margin-bottom: 14px;
  }
  .base-url-input:focus {
    outline: none;
    border-color: var(--accent);
  }
  .param-list { margin-bottom: 14px; }
  .param {
    margin-bottom: 12px;
  }
  .param-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 4px;
    color: var(--dim);
  }
  .param-label .req { color: var(--fault); }
  .param-hint {
    font-size: 11px;
    color: var(--faint);
    margin-top: 2px;
  }
  .param-input {
    width: 100%;
    background: var(--baseline);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 8px 12px;
    color: var(--ink);
    font-size: 13px;
    font-family: var(--mono);
  }
  .param-input:focus {
    outline: none;
    border-color: var(--accent);
  }
  .run-btn {
    width: 100%;
    padding: 10px;
    background: var(--accent);
    border: none;
    border-radius: 6px;
    color: var(--baseline);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .run-btn:hover { background: #4a95ee; }
  .run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .result {
    margin-top: 14px;
    padding: 12px;
    background: var(--baseline);
    border: 1px solid var(--line);
    border-radius: 6px;
    font-family: var(--mono);
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 300px;
    overflow-y: auto;
  }
  .result.ok { border-color: var(--accent); }
  .result.err { border-color: var(--fault); }

  /* Findings */
  .findings {
    margin-bottom: 20px;
  }
  .finding {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 6px;
    margin-bottom: 8px;
    font-size: 13px;
    line-height: 1.5;
  }
  .finding.warning { border-left: 3px solid var(--signal); }
  .finding.error { border-left: 3px solid var(--fault); }
  .finding-icon { flex-shrink: 0; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--ghost); }
</style>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="brand">
        <div class="brand-mark">W</div>
        <span>webmcp-codegen</span>
      </div>
      <div class="brand-sub" id="tool-count"></div>
    </div>
    <div class="search-wrap">
      <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>
      <input type="text" class="search" id="search" placeholder="Search tools..." spellcheck="false" />
    </div>
    <div class="tool-list" id="tool-list"></div>
  </aside>
  <main class="main" id="main">
    <div class="placeholder" id="placeholder">
      <div class="placeholder-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      </div>
      <p>Select a tool to view details</p>
      <p style="font-size: 12px; margin-top: 8px;">
        <kbd>↑</kbd> <kbd>↓</kbd> to navigate &nbsp;·&nbsp; <kbd>⌘K</kbd> to search
      </p>
    </div>
    <div class="detail" id="detail" hidden></div>
  </main>
</div>

<script>
(function () {
  var state = null;
  var selected = null;
  var filter = "";

  var listEl = document.getElementById("tool-list");
  var detailEl = document.getElementById("detail");
  var placeholderEl = document.getElementById("placeholder");
  var searchEl = document.getElementById("search");
  var countEl = document.getElementById("tool-count");

  function esc(text) {
    var div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  function api(path, options) {
    return fetch(path, options).then(function (res) {
      if (!res.ok) throw new Error("Request failed: " + res.status);
      return res.json();
    });
  }

  function load() {
    api("/api/state").then(function (data) {
      state = data;
      countEl.textContent = data.tools.length + " tools from " + data.label;
      renderList();
      renderDetail();
    }).catch(function (error) {
      console.error("Failed to load tools:", error);
      countEl.textContent = "Failed to load";
      listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--fault);">Error loading tools: ' + esc(error.message) + '</div>';
    });
  }

  function visibleTools() {
    if (!state) return [];
    var f = filter.toLowerCase();
    return state.tools.filter(function (tool) {
      return tool.name.toLowerCase().indexOf(f) !== -1 ||
        (tool.description && tool.description.toLowerCase().indexOf(f) !== -1);
    });
  }

  function groupTools(tools) {
    var groups = { read: [], write: [], destructive: [] };
    tools.forEach(function (tool) {
      var key = tool.sideEffect || "read";
      if (!groups[key]) groups[key] = [];
      groups[key].push(tool);
    });
    return groups;
  }

  function renderList() {
    var tools = visibleTools();
    var groups = groupTools(tools);
    var html = "";

    ["read", "write", "destructive"].forEach(function (risk) {
      var group = groups[risk];
      if (!group || group.length === 0) return;
      html += '<div class="tool-group">' + risk + ' (' + group.length + ')</div>';
      group.forEach(function (tool) {
        var isSelected = tool.name === selected;
        html += '<button class="tool" data-name="' + esc(tool.name) + '" aria-selected="' + isSelected + '">' +
          '<span class="tool-indicator ' + risk + '"></span>' +
          '<span class="tool-name">' + esc(tool.name) + "</span>" +
          (!tool.enabled ? '<span class="tool-badge disabled">off</span>' : "") +
          "</button>";
      });
    });

    if (tools.length === 0) {
      html = '<div style="padding: 20px; text-align: center; color: var(--faint);">No tools match your search</div>';
    }

    listEl.innerHTML = html;

    Array.prototype.forEach.call(listEl.querySelectorAll(".tool"), function (btn) {
      btn.addEventListener("click", function () {
        selected = btn.getAttribute("data-name");
        renderList();
        renderDetail();
      });
    });
  }

  function currentTool() {
    if (!state || !selected) return null;
    return state.tools.find(function (tool) { return tool.name === selected; });
  }

  function renderDetail() {
    var tool = currentTool();
    if (!tool) {
      detailEl.hidden = true;
      placeholderEl.hidden = false;
      return;
    }

    placeholderEl.hidden = true;
    detailEl.hidden = false;

    var badges = [
      '<span class="badge ' + tool.sideEffect + '">' + tool.sideEffect + "</span>",
      !tool.enabled ? '<span class="badge disabled">starts disabled</span>' : "",
      tool.endpointRole !== "endpoint" ? '<span class="badge auth">' + tool.endpointRole + "</span>" : "",
      tool.piiInOutput.length > 0 ? '<span class="badge write">pii: ' + esc(tool.piiInOutput.join(", ")) + "</span>" : "",
    ].filter(Boolean).join("");

    var findings = tool.findings.map(function (finding) {
      var icon = finding.level === "error" ? "✖" : "⚠";
      return '<div class="finding ' + finding.level + '"><span class="finding-icon">' + icon + "</span><span>" + esc(finding.message) + "</span></div>";
    }).join("");

    var schema = tool.inputSchema || {};
    var properties = schema.properties || {};
    var required = schema.required || [];
    var fields = Object.keys(properties).map(function (key) {
      var field = properties[key];
      var type = field.type === "number" || field.type === "integer" ? "number" : "text";
      var req = required.indexOf(key) !== -1 ? ' <span class="req">*</span>' : "";
      var hint = field.description ? '<div class="param-hint">' + esc(field.description) + "</div>" : "";
      return '<div class="param"><label class="param-label">' + esc(key) + req + '</label>' +
        '<input class="param-input" data-field="' + esc(key) + '" data-type="' + esc(field.type || "string") + '" type="' + type + '" spellcheck="false" />' +
        hint + "</div>";
    }).join("");

    var baseUrl = "";
    try { baseUrl = localStorage.getItem("webmcp-codegen:baseUrl") || tool.serverUrl || ""; } catch (e) {}

    detailEl.innerHTML =
      '<div class="detail-header">' +
      '<div class="detail-crumb">' + esc(state.label) + (state.outDir ? " → " + esc(state.outDir) : "") + "</div>" +
      '<h1 class="detail-title">' + esc(tool.name) + "</h1>" +
      '<div class="detail-route">' +
      '<span class="verb ' + tool.sideEffect + '">' + esc(tool.verb || "GET") + "</span>" +
      "<span>" + esc(tool.path || "") + "</span>" +
      "</div>" +
      '<div class="badges">' + badges + "</div>" +
      "</div>" +

      (findings ? '<div class="section"><div class="section-label">Audit findings</div>' + findings + "</div>" : "") +

      '<div class="section">' +
      '<div class="section-label">Description</div>' +
      '<textarea class="description-edit" id="desc" spellcheck="false">' + esc(tool.description) + "</textarea>" +
      '<div class="edit-actions">' +
      '<button class="btn btn-primary" id="save-desc">Save</button>' +
      '<span class="saved-indicator" id="saved">Saved</span>' +
      "</div>" +
      '<div class="edit-hint">Agents pick tools by this text. Saved to .webmcp-codegen.json, so it survives regeneration. ⌘S to save.</div>' +
      "</div>" +

      '<div class="section">' +
      '<div class="section-label">Status</div>' +
      '<div class="toggle-row">' +
      '<button class="switch" id="toggle-enabled" role="switch" aria-checked="' + tool.enabled + '" aria-label="Enabled"></button>' +
      '<div class="toggle-copy"><strong>' + (tool.enabled ? "Enabled" : "Disabled") + "</strong>" +
      (tool.enabled
        ? "This tool works as soon as the app registers it."
        : "The generated code is there, commented out. Flipping this regenerates it enabled on the next run.") +
      "</div></div>" +
      "</div>" +

      '<div class="section">' +
      '<div class="section-label">Test</div>' +
      '<div class="try-section">' +
      '<div class="try-header"><h3>Run this tool</h3><span class="try-note">server-side, no browser session</span></div>' +
      '<div class="try-body">' +
      (tool.requiresAuth
        ? '<div class="auth-note">⚠ This endpoint requires a browser session. The dashboard runs server-side, so you will get a 401. Test it in Chrome DevTools where you are signed in.</div>'
        : "") +
      '<input class="base-url-input" id="base-url" type="text" placeholder="Base URL (e.g. http://localhost:3000)" value="' + esc(baseUrl) + '" spellcheck="false" />' +
      (fields || '<div style="color: var(--faint); font-size: 13px; margin-bottom: 14px;">This tool takes no inputs.</div>') +
      '<button class="run-btn" id="run">Run tool</button>' +
      '<pre class="result" id="result" hidden></pre>' +
      "</div></div>" +
      "</div>";

    document.getElementById("save-desc").addEventListener("click", saveDescription);
    document.getElementById("toggle-enabled").addEventListener("click", toggleEnabled);
    document.getElementById("run").addEventListener("click", runTool);
    document.getElementById("base-url").addEventListener("change", function (event) {
      try { localStorage.setItem("webmcp-codegen:baseUrl", event.target.value); } catch (e) {}
    });
  }

  function saveDescription() {
    var tool = currentTool();
    var desc = document.getElementById("desc").value.trim();
    if (!tool || !desc) return;
    api("/api/override", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: tool.name, description: desc }),
    }).then(function () {
      tool.description = desc;
      var saved = document.getElementById("saved");
      saved.classList.add("show");
      setTimeout(function () { saved.classList.remove("show"); }, 2000);
    }).catch(function (error) { alert(error.message); });
  }

  function toggleEnabled() {
    var tool = currentTool();
    if (!tool) return;
    var next = !tool.enabled;
    api("/api/override", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: tool.name, enabled: next }),
    }).then(function () {
      tool.enabled = next;
      renderList();
      renderDetail();
    }).catch(function (error) { alert(error.message); });
  }

  function runTool() {
    var tool = currentTool();
    if (!tool) return;
    var input = {};
    Array.prototype.forEach.call(document.querySelectorAll("[data-field]"), function (field) {
      var value = field.value;
      if (value === "") return;
      var type = field.getAttribute("data-type");
      if (type === "number" || type === "integer") value = Number(value);
      if (type === "boolean") value = value === "true";
      if (type === "object" || type === "array") {
        try { value = JSON.parse(value); } catch (e) { /* keep as string */ }
      }
      input[field.getAttribute("data-field")] = value;
    });
    var baseUrl = document.getElementById("base-url").value.trim();
    var resultEl = document.getElementById("result");
    var runEl = document.getElementById("run");
    runEl.disabled = true;
    runEl.textContent = "Running...";
    resultEl.hidden = true;
    api("/api/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: tool.name, input: input, baseUrl: baseUrl || undefined }),
    }).then(function (result) {
      resultEl.hidden = false;
      resultEl.className = "result " + (result.ok ? "ok" : "err");
      resultEl.textContent =
        (result.status ? "HTTP " + result.status + "\n\n" : "") +
        (result.error ? result.error : JSON.stringify(result.body, null, 2));
    }).catch(function (error) {
      resultEl.hidden = false;
      resultEl.className = "result err";
      resultEl.textContent = error.message;
    }).finally(function () {
      runEl.disabled = false;
      runEl.textContent = "Run tool";
    });
  }

  /* Keyboard navigation */
  document.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault();
      searchEl.focus();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "s") {
      event.preventDefault();
      saveDescription();
      return;
    }
    if (event.target === searchEl || event.target.tagName === "TEXTAREA" || event.target.tagName === "INPUT") {
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    var tools = visibleTools();
    var index = tools.findIndex(function (tool) { return tool.name === selected; });
    var next = event.key === "ArrowDown" ? index + 1 : index - 1;
    if (next < 0 || next >= tools.length) return;
    event.preventDefault();
    selected = tools[next].name;
    renderList();
    renderDetail();
    var button = listEl.querySelector('[aria-selected="true"]');
    if (button) button.scrollIntoView({ block: "nearest" });
  });

  searchEl.addEventListener("input", function (event) {
    filter = event.target.value;
    renderList();
  });

  load();
})();
</script>
</body>
</html>`;
}
