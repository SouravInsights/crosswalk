import { describe, expect, it } from "vitest";
import { ToolRegistry } from "./registry.js";

function tool(name: string, execute: () => unknown = () => null) {
  return { name, description: "t", readOnly: true, execute };
}

describe("ToolRegistry", () => {
  it("rejects invalid tool names", () => {
    const r = new ToolRegistry();
    expect(() => r.register(tool("1bad"))).toThrow(/Invalid tool name/);
    expect(() => r.register(tool("has space"))).toThrow(/Invalid tool name/);
  });

  it("rejects duplicate names", () => {
    const r = new ToolRegistry();
    r.register(tool("a"));
    expect(() => r.register(tool("a"))).toThrow(/already registered/);
  });

  it("normalizes undefined results to null", async () => {
    const r = new ToolRegistry();
    r.register(tool("a", () => undefined));
    expect(await r.call("a")).toEqual({ ok: true, result: null });
  });

  it("fails actionably on non-JSON-serializable results", async () => {
    const r = new ToolRegistry();
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    r.register(tool("a", () => cyclic));
    const result = await r.call("a");
    expect(result).toEqual({ ok: false, error: expect.stringContaining("not JSON-serializable") });
  });
});
