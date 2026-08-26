# @groundstate/bridge

Local MCP server that connects a running page's [Groundstate](https://www.npmjs.com/package/groundstate)
tools to any MCP client — Claude Code, Codex, Cursor, Gemini CLI.

No mainstream agent client consumes WebMCP natively yet; the bridge is how Groundstate works
**today**, in any Chromium browser, no flags required. It finds your page over the Chrome
DevTools Protocol and serves its registered tools over MCP stdio.

## Setup

1. Run your app (dev server) with Groundstate initialized.

2. Start Chrome with a debugging port, using a throwaway profile:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 --user-data-dir=/tmp/groundstate-profile http://localhost:5173
```

3. Connect your agent:

```bash
# Claude Code
claude mcp add groundstate -- npx @groundstate/bridge --page localhost:5173

# Codex
codex mcp add groundstate -- npx @groundstate/bridge --page localhost:5173
```

Your agent now sees every tool the page registered — `getCheckoutState`, `loadFixture`,
`getStateHistory`, `getGroundstateHealth`, and whatever you exposed — live against the
running app.

## Options

| Flag | Default | Meaning |
|---|---|---|
| `--browser-url` | `http://127.0.0.1:9222` | CDP endpoint of the running Chromium |
| `--page` | first Groundstate page | Pick the target page by URL substring |

## How it works

The bridge talks to the page's Groundstate registry (`window.__GROUNDSTATE__`) via CDP
`Runtime.evaluate` — it does not depend on native WebMCP support. Tool lists are fetched
live on every request, so registrations that come and go with navigation just work.

## Security

Use a dedicated Chrome profile (`--user-data-dir`) — the debugging port grants control over
that browser instance to local processes. Don't browse sensitive sites in it. The bridge is
built for locally-controlled browsers; an authenticated transport for shared preview
deployments is on the roadmap.
