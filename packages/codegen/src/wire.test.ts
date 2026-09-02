import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyWiring, planWiring } from "./wire.js";

const NEXT_LAYOUT = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "My app" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;

const VITE_MAIN = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;

describe("planWiring", () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "webmcp-codegen-wire-"));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it("Next.js: creates a client component and adds two lines to the layout", async () => {
    await mkdir(join(cwd, "apps/web/src/app"), { recursive: true });
    await writeFile(join(cwd, "apps/web/src/app/layout.tsx"), NEXT_LAYOUT);

    const plan = await planWiring(
      cwd,
      { dir: "apps/web", framework: "next" },
      "apps/web/src/webmcp",
    );
    expect(plan?.edits).toHaveLength(2);

    if (plan?.edits.length !== 2) throw new Error("expected exactly two edits");
    const [register, layout] = plan.edits;
    expect(register?.action).toBe("create");
    expect(register?.contents).toContain('"use client"');
    expect(register?.contents).toContain("registerAllTools()");

    expect(layout?.action).toBe("modify");
    expect(layout?.contents).toContain('import { WebMCPRegister } from "../webmcp/register";');
    expect(layout?.contents).toContain("<body>\n        <WebMCPRegister />\n        {children}");
    // The original file's lines are all still there (additive only).
    expect(layout?.contents).toContain('import "./globals.css";');
    expect(layout?.contents).toContain("{children}");
  });

  it("Vite: adds the import and call to the entry file", async () => {
    await mkdir(join(cwd, "src"), { recursive: true });
    await writeFile(join(cwd, "src/main.tsx"), VITE_MAIN);

    const plan = await planWiring(cwd, { dir: ".", framework: "vite-react" }, "./src/webmcp");
    if (plan?.edits.length !== 1) throw new Error("expected exactly one edit");
    const [edit] = plan.edits;
    expect(edit?.contents).toContain('import { registerAllTools } from "./webmcp";');
    expect(edit?.contents).toContain("void registerAllTools();");
    expect(edit?.contents).toContain("createRoot(");
  });

  it("is idempotent: already-wired files produce no edits", async () => {
    await mkdir(join(cwd, "src"), { recursive: true });
    await writeFile(join(cwd, "src/main.tsx"), VITE_MAIN);

    const first = await planWiring(cwd, { dir: ".", framework: "vite-react" }, "./src/webmcp");
    if (!first) throw new Error("expected a wiring plan");
    await applyWiring(first);

    const second = await planWiring(cwd, { dir: ".", framework: "vite-react" }, "./src/webmcp");
    expect(second?.alreadyWired).toBe(true);
    expect(second?.edits).toHaveLength(0);

    // And the file on disk is exactly what the plan said it would be.
    const onDisk = await readFile(join(cwd, "src/main.tsx"), "utf8");
    expect(onDisk).toContain("registerAllTools");
  });

  it("returns null instead of guessing when no entry file exists", async () => {
    const plan = await planWiring(cwd, { dir: ".", framework: "next" }, "./src/webmcp");
    expect(plan).toBeNull();
  });

  it("returns null for frameworks we do not wire yet", async () => {
    const plan = await planWiring(cwd, { dir: ".", framework: "nuxt" }, "./src/webmcp");
    expect(plan).toBeNull();
  });
});
