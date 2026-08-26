#!/usr/bin/env node
import { parseArgs } from "node:util";
import { connectToPage } from "./cdp.js";
import { serve } from "./server.js";

const HELP = `groundstate-bridge — serve a running page's Groundstate tools to any MCP client.

Usage:
  groundstate-bridge [--browser-url <url>] [--page <url-substring>]

Options:
  --browser-url  CDP endpoint of a running Chromium (default: http://127.0.0.1:9222)
  --page         Pick the target page by URL substring (default: first page with Groundstate)
  --help         Show this help

Example MCP client config (Claude Code):
  claude mcp add groundstate -- npx @groundstate/bridge --page localhost:5173

Start Chrome with a debugging port first, e.g.:
  chrome --remote-debugging-port=9222 --user-data-dir=/tmp/groundstate-profile
`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "browser-url": { type: "string", default: "http://127.0.0.1:9222" },
      page: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    process.stdout.write(HELP);
    return;
  }

  const page = await connectToPage({
    browserUrl: values["browser-url"] as string,
    pageUrlContains: values.page,
  });

  // stdout is the MCP transport; diagnostics go to stderr only.
  process.stderr.write(`groundstate-bridge: connected to ${page.url}\n`);
  await serve(page);
}

main().catch((err) => {
  process.stderr.write(`groundstate-bridge: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
