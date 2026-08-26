import CDP from "chrome-remote-interface";
import type { ToolCallResult, ToolInfo } from "groundstate";

export interface PageConnection {
  /** URL of the connected page. */
  url: string;
  listTools: () => Promise<ToolInfo[]>;
  callTool: (name: string, args: Record<string, unknown>) => Promise<ToolCallResult>;
  close: () => Promise<void>;
}

export interface ConnectOptions {
  /** CDP endpoint, e.g. http://127.0.0.1:9222 */
  browserUrl: string;
  /** Substring to select the target page by URL. Defaults to the first Groundstate page. */
  pageUrlContains?: string;
}

/**
 * Connect to a running Chromium via CDP and find the page that has a
 * Groundstate binding (window.__GROUNDSTATE__). We talk to the page's own
 * registry rather than native WebMCP, so this works in any Chromium — no
 * flags, no origin trial.
 */
export async function connectToPage(options: ConnectOptions): Promise<PageConnection> {
  const { host, port } = parseBrowserUrl(options.browserUrl);
  const targets = await CDP.List({ host, port });
  const pages = targets.filter(
    (t) =>
      t.type === "page" && (!options.pageUrlContains || t.url.includes(options.pageUrlContains)),
  );
  if (pages.length === 0) {
    throw new Error(
      `No page found at ${options.browserUrl}` +
        (options.pageUrlContains ? ` matching "${options.pageUrlContains}"` : "") +
        ". Is Chrome running with --remote-debugging-port and the app open?",
    );
  }

  for (const page of pages) {
    const client = await CDP({ host, port, target: page.id });
    await client.Runtime.enable();
    const probe = await evaluate<boolean>(client, "Boolean(window.__GROUNDSTATE__)");
    if (probe) {
      return makeConnection(client, page.url);
    }
    await client.close();
  }

  throw new Error(
    "Connected to the browser, but no open page has a Groundstate binding. " +
      "Make sure the app calls groundstate.init() (dev build) and the page is loaded.",
  );
}

function makeConnection(client: CDP.Client, url: string): PageConnection {
  return {
    url,
    listTools: () => evaluate<ToolInfo[]>(client, "window.__GROUNDSTATE__.list()"),
    callTool: (name, args) =>
      evaluate<ToolCallResult>(
        client,
        `window.__GROUNDSTATE__.call(${JSON.stringify(name)}, ${JSON.stringify(args)})`,
      ),
    close: () => client.close(),
  };
}

async function evaluate<T>(client: CDP.Client, expression: string): Promise<T> {
  const { result, exceptionDetails } = await client.Runtime.evaluate({
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  }
  return result.value as T;
}

function parseBrowserUrl(browserUrl: string): { host: string; port: number } {
  const url = new URL(browserUrl);
  return { host: url.hostname, port: Number(url.port || 9222) };
}
