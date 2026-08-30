/**
 * The dashboard UI: one self-contained HTML page (inline CSS and JS), served
 * by the dev server. No framework, no build step, no CDN: the page must work
 * offline and add zero dependencies to the package.
 *
 * Design bar (per the first-run spec): this is a product surface, in the
 * idiom of Storybook / Mintlify / Scalar. Same tokens as the site: dark
 * neutral surfaces, one accent blue, hairline borders, system sans for prose
 * and mono for names and code. Keyboard navigation throughout: up/down move
 * through tools, ⌘K focuses search, ⌘S saves an edit.
 */

export function dashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>webmcp-codegen</title>
<style>
  :root {
    --baseline: #0a0b0f;
    --panel: #0f1117;
    --panel-raised: #151822;
    --line: #20242f;
    --ink: #e9ecf2;
    --dim: #9aa3b2;
    --faint: #5d6575;
    --ghost: #3b4150;
    --accent: #58a6ff;
    --signal: #e3b341;
    --fault: #f47067;
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
  }
  ::selection { background: var(--accent); color: var(--baseline); }
  button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
  input, textarea { font: inherit; color: var(--ink); background: var(--panel); border: 1px solid var(--line); border-radius: 6px; }
  input:focus-visible, textarea:focus-visible, button:focus-visible { outline: 1px solid var(--accent); outline-offset: 2px; }

  #app { display: grid; grid-template-columns: 300px 1fr; height: 100vh; }

  /* ── Sidebar ─────────────────────────────────────────────── */
  aside {
    border-right: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .brand {
    display: flex; align-items: center; gap: 10px;
    padding: 16px 16px 12px;
    font-family: var(--mono); font-size: 13px; letter-spacing: -0.01em;
  }
  .brand::before { content: ""; width: 8px; height: 8px; background: var(--accent); }
  .brand .meta { color: var(--faint); font-size: 11px; margin-left: auto; }
  .search { padding: 0 12px 12px; }
  .search input {
    width: 100%; padding: 7px 10px; font-family: var(--mono); font-size: 12px;
  }
  .search input::placeholder { color: var(--ghost); }
  .tools { overflow-y: auto; flex: 1; padding: 4px 8px 16px; }
  .tool {
    display: flex; align-items: center; gap: 8px; width: 100%;
    padding: 7px 8px; border-radius: 6px; text-align: left;
    color: var(--dim);
  }
  .tool:hover { background: var(--panel); color: var(--ink); }
  .tool[aria-selected="true"] { background: var(--panel-raised); color: var(--ink); }
  .tool .name { font-family: var(--mono); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tool .verb {
    margin-left: auto; font-family: var(--mono); font-size: 10px;
    padding: 2px 6px; border-radius: 4px; border: 1px solid var(--line);
    color: var(--faint); flex-shrink: 0;
  }
  .tool .verb.read { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
  .tool .verb.write { color: var(--signal); border-color: color-mix(in srgb, var(--signal) 35%, transparent); }
  .tool .verb.destructive { color: var(--fault); border-color: color-mix(in srgb, var(--fault) 35%, transparent); }
  .tool .off {
    width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    background: var(--ghost);
  }
  .tool .off[title] { cursor: help; }
  .empty { padding: 24px 16px; color: var(--faint); font-size: 13px; line-height: 1.6; }

  /* ── Detail pane ─────────────────────────────────────────── */
  main { overflow-y: auto; min-width: 0; }
  .detail { max-width: 780px; padding: 32px 40px 80px; }
  .crumb { font-family: var(--mono); font-size: 11px; color: var(--ghost); margin-bottom: 10px; }
  h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 6px; font-family: var(--mono); }
  .route { font-family: var(--mono); font-size: 12px; color: var(--faint); margin-bottom: 24px; }
  .badges { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
  .badge {
    font-family: var(--mono); font-size: 11px; padding: 3px 8px;
    border: 1px solid var(--line); border-radius: 999px; color: var(--dim);
  }
  .badge.accent { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
  .badge.warn { color: var(--signal); border-color: color-mix(in srgb, var(--signal) 35%, transparent); }
  .badge.err { color: var(--fault); border-color: color-mix(in srgb, var(--fault) 35%, transparent); }

  .field-label {
    font-family: var(--mono); font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.18em; color: var(--faint); margin: 28px 0 8px;
  }
  textarea#desc {
    width: 100%; min-height: 70px; padding: 10px 12px; font-size: 14px;
    line-height: 1.55; resize: vertical;
  }
  .hint { color: var(--faint); font-size: 12px; margin-top: 6px; line-height: 1.5; }
  .row { display: flex; align-items: center; gap: 12px; }
  .save {
    margin-top: 10px; padding: 7px 14px; border: 1px solid var(--line);
    border-radius: 6px; font-size: 13px; color: var(--ink); background: var(--panel-raised);
  }
  .save:hover { border-color: var(--accent); }
  .save[disabled] { opacity: 0.4; cursor: default; }
  .saved { color: var(--accent); font-size: 12px; font-family: var(--mono); }

  /* Toggle */
  .toggle-row { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); margin-top: 28px; }
  .switch { position: relative; width: 34px; height: 20px; border-radius: 999px; background: var(--ghost); transition: background 150ms; flex-shrink: 0; }
  .switch[aria-checked="true"] { background: var(--accent); }
  .switch::after {
    content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
    border-radius: 50%; background: var(--ink); transition: left 150ms;
  }
  .switch[aria-checked="true"]::after { left: 16px; }
  .toggle-copy { font-size: 13px; color: var(--dim); line-height: 1.5; }
  .toggle-copy strong { color: var(--ink); font-weight: 600; }

  /* Findings */
  .finding {
    display: flex; gap: 8px; padding: 10px 12px; border: 1px solid var(--line);
    border-radius: 6px; font-size: 12.5px; line-height: 1.5; color: var(--dim);
    margin-bottom: 8px; background: var(--panel);
  }
  .finding.warn { border-color: color-mix(in srgb, var(--signal) 30%, transparent); }
  .finding.error { border-color: color-mix(in srgb, var(--fault) 30%, transparent); }
  .finding .icon { color: var(--signal); }
  .finding.error .icon { color: var(--fault); }

  /* Try it */
  .try { margin-top: 28px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
  .try > header { padding: 12px 16px; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 10px; }
  .try > header h2 { font-size: 13px; margin: 0; font-weight: 600; }
  .try > header .note { color: var(--faint); font-size: 11.5px; margin-left: auto; }
  .try .body { padding: 16px; }
  .param { display: grid; grid-template-columns: 180px 1fr; gap: 12px; align-items: center; margin-bottom: 10px; }
  .param label { font-family: var(--mono); font-size: 12px; color: var(--dim); }
  .param label .req { color: var(--fault); }
  .param input { padding: 7px 10px; font-family: var(--mono); font-size: 12px; width: 100%; }
  .base-url { margin-bottom: 14px; }
  .base-url input { width: 100%; padding: 7px 10px; font-family: var(--mono); font-size: 12px; }
  .run {
    margin-top: 6px; padding: 8px 16px; border-radius: 6px; font-size: 13px;
    background: var(--accent); color: var(--baseline); font-weight: 600;
  }
  .run[disabled] { opacity: 0.5; cursor: default; }
  pre.result {
    margin: 14px 0 0; padding: 12px 14px; background: var(--baseline);
    border: 1px solid var(--line); border-radius: 6px; font-family: var(--mono);
    font-size: 12px; line-height: 1.55; overflow-x: auto; max-height: 320px;
    color: var(--dim); white-space: pre-wrap; word-break: break-word;
  }
  pre.result.ok { border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
  pre.result.err { border-color: color-mix(in srgb, var(--fault) 35%, transparent); }

  .placeholder { max-width: 480px; margin: 20vh auto 0; text-align: center; color: var(--faint); line-height: 1.7; }
  .placeholder kbd {
    font-family: var(--mono); font-size: 11px; border: 1px solid var(--line);
    border-radius: 4px; padding: 1px 5px; color: var(--dim);
  }
  .toast {
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: var(--panel-raised); border: 1px solid var(--line); color: var(--ink);
    padding: 8px 14px; border-radius: 6px; font-size: 12.5px; opacity: 0;
    transition: opacity 150ms; pointer-events: none;
  }
  .toast.show { opacity: 1; }
</style>
</head>
<body>
<div id="app">
  <aside>
    <div class="brand">webmcp-codegen <span class="meta" id="tool-count"></span></div>
    <div class="search"><input id="search" type="text" placeholder="filter tools  (⌘K)" spellcheck="false" /></div>
    <div class="tools" id="tool-list" role="listbox" aria-label="Tools"></div>
  </aside>
  <main id="detail">
    <div class="placeholder">
      <p>Loading your tools…</p>
    </div>
  </main>
</div>
<div class="toast" id="toast"></div>

<script>
(function () {
  var state = null;
  var selected = null;
  var filter = "";

  var listEl = document.getElementById("tool-list");
  var detailEl = document.getElementById("detail");
  var searchEl = document.getElementById("search");
  var toastEl = document.getElementById("toast");

  function esc(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  function api(path, options) {
    return fetch(path, options).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body.error || ("Request failed: " + res.status));
        return body;
      });
    });
  }

  function load() {
    return api("/api/state").then(function (next) {
      state = next;
      if (!selected && state.tools.length > 0) selected = state.tools[0].name;
      renderList();
      renderDetail();
    }).catch(function (error) {
      detailEl.innerHTML = '<div class="placeholder"><p>Could not load tools.</p><p>' + esc(error.message) + "</p></div>";
    });
  }

  function visibleTools() {
    if (!filter) return state.tools;
    var needle = filter.toLowerCase();
    return state.tools.filter(function (tool) {
      return tool.name.indexOf(needle) !== -1 ||
        (tool.path || "").toLowerCase().indexOf(needle) !== -1 ||
        tool.description.toLowerCase().indexOf(needle) !== -1;
    });
  }

  function renderList() {
    document.getElementById("tool-count").textContent = state.tools.length + " tools";
    var tools = visibleTools();
    if (tools.length === 0) {
      listEl.innerHTML = '<div class="empty">No tools match.</div>';
      return;
    }
    listEl.innerHTML = tools.map(function (tool) {
      var disabled = tool.enabled ? "" : '<span class="off" title="starts disabled"></span>';
      return '<button class="tool" role="option" aria-selected="' + (tool.name === selected) + '" data-name="' + esc(tool.name) + '">' +
        disabled +
        '<span class="name">' + esc(tool.name) + "</span>" +
        '<span class="verb ' + esc(tool.sideEffect) + '">' + esc(tool.verb || "") + "</span>" +
        "</button>";
    }).join("");
    Array.prototype.forEach.call(listEl.children, function (child) {
      child.addEventListener("click", function () {
        selected = child.getAttribute("data-name");
        renderList();
        renderDetail();
      });
    });
  }

  function currentTool() {
    return state.tools.find(function (tool) { return tool.name === selected; });
  }

  function renderDetail() {
    var tool = currentTool();
    if (!tool) {
      detailEl.innerHTML = '<div class="placeholder"><p>Select a tool on the left.</p><p><kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>⌘K</kbd> to search.</p></div>';
      return;
    }

    var badges = [
      '<span class="badge accent">' + esc(tool.sideEffect) + "</span>",
      tool.enabled ? '<span class="badge">enabled</span>' : '<span class="badge warn">starts disabled</span>',
      tool.endpointRole !== "endpoint" ? '<span class="badge err">' + esc(tool.endpointRole) + " endpoint</span>" : "",
      tool.piiInOutput.length > 0 ? '<span class="badge warn">pii: ' + esc(tool.piiInOutput.join(", ")) + "</span>" : "",
    ].filter(Boolean).join("");

    var findings = tool.findings.map(function (finding) {
      var icon = finding.level === "error" ? "✖" : "⚠";
      return '<div class="finding ' + esc(finding.level) + '"><span class="icon">' + icon + "</span><span>" + esc(finding.message) + "</span></div>";
    }).join("");

    var schema = tool.inputSchema || {};
    var properties = schema.properties || {};
    var required = schema.required || [];
    var fields = Object.keys(properties).map(function (key) {
      var field = properties[key];
      var type = field.type === "number" || field.type === "integer" ? "number" : "text";
      var req = required.indexOf(key) !== -1 ? ' <span class="req">*</span>' : "";
      var label = esc(key) + req + (field.description ? '<div class="hint">' + esc(field.description) + "</div>" : "");
      return '<div class="param"><label for="f-' + esc(key) + '">' + label + '</label>' +
        '<input id="f-' + esc(key) + '" data-field="' + esc(key) + '" data-type="' + esc(field.type || "string") + '" type="' + type + '" spellcheck="false" /></div>';
    }).join("");

    var baseUrl = "";
    try { baseUrl = localStorage.getItem("webmcp-codegen:baseUrl") || tool.serverUrl || ""; } catch (e) {}

    detailEl.innerHTML =
      '<div class="detail">' +
      '<div class="crumb">' + esc(state.label) + (state.outDir ? " → " + esc(state.outDir) : "") + "</div>" +
      "<h1>" + esc(tool.name) + "</h1>" +
      '<div class="route">' + esc((tool.verb || "") + " " + (tool.path || "")) + "</div>" +
      '<div class="badges">' + badges + "</div>" +

      (findings ? '<div class="field-label">audit findings</div>' + findings : "") +

      '<div class="field-label">description</div>' +
      '<textarea id="desc" spellcheck="false">' + esc(tool.description) + "</textarea>" +
      '<div class="row"><button class="save" id="save-desc">save description</button><span class="saved" id="saved-desc"></span></div>' +
      '<div class="hint">Agents pick tools by this text. Saved to .webmcp-codegen.json, so it survives regeneration. ⌘S to save.</div>' +

      '<div class="toggle-row">' +
      '<button class="switch" id="toggle-enabled" role="switch" aria-checked="' + tool.enabled + '" aria-label="Enabled"></button>' +
      '<div class="toggle-copy"><strong>' + (tool.enabled ? "Enabled" : "Disabled") + ".</strong> " +
      (tool.enabled
        ? "This tool works as soon as the app registers it."
        : "The generated code is there, commented out. Flipping this regenerates it enabled on the next run.") +
      "</div></div>" +

      '<div class="try"><header><h2>try it</h2><span class="note">direct call, server-side. no browser session here.</span></header>' +
      '<div class="body">' +
      '<div class="base-url"><input id="base-url" type="text" placeholder="base URL, e.g. http://localhost:3000" value="' + esc(baseUrl) + '" spellcheck="false" /></div>' +
      (fields || '<div class="hint">This tool takes no inputs.</div>') +
      '<button class="run" id="run">run</button>' +
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
      toast("saved to .webmcp-codegen.json");
    }).catch(function (error) { toast(error.message); });
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
      toast(next ? "enabled on next generate" : "disabled on next generate");
    }).catch(function (error) { toast(error.message); });
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
    resultEl.hidden = true;
    api("/api/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: tool.name, input: input, baseUrl: baseUrl || undefined }),
    }).then(function (result) {
      resultEl.hidden = false;
      resultEl.className = "result " + (result.ok ? "ok" : "err");
      resultEl.textContent =
        (result.status ? "HTTP " + result.status + "\\n\\n" : "") +
        (result.error ? result.error : JSON.stringify(result.body, null, 2));
    }).catch(function (error) {
      resultEl.hidden = false;
      resultEl.className = "result err";
      resultEl.textContent = error.message;
    }).finally(function () {
      runEl.disabled = false;
    });
  }

  /* Keyboard: up/down moves through the visible tools, cmd-K focuses
     search, cmd-S saves the description being edited. */
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
