import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { startDevServer } from "./server.js";

const PETSTORE = fileURLToPath(new URL("../../../../examples/openapi-petstore", import.meta.url));

describe("dev server", () => {
  it("serves each tool's generated source in /api/state", async () => {
    // The config's relative spec path resolves against the process cwd, the
    // same as running `webmcp-codegen dev` from the example directory.
    const previous = process.cwd();
    process.chdir(PETSTORE);
    const server = await startDevServer({ cwd: PETSTORE, port: 0, open: false });
    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const response = await fetch(`http://127.0.0.1:${port}/api/state`);
      expect(response.status).toBe(200);
      const state = (await response.json()) as {
        tools: { name: string; source?: { fileName: string; code: string } }[];
      };
      expect(state.tools.length).toBeGreaterThan(0);
      for (const tool of state.tools) {
        expect(tool.source?.fileName).toBe(`${tool.name}.webmcp.ts`);
        expect(tool.source?.code).toContain("webmcp-codegen: generated");
      }
    } finally {
      server.close();
      process.chdir(previous);
    }
  }, 15000);
});
