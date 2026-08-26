import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetForTests, act, fixture, init, listTools, observe, reset } from "./groundstate.js";
import { GroundstateProductionError } from "./guard.js";

afterEach(() => {
  __resetForTests();
  vi.unstubAllEnvs();
});

describe("init", () => {
  it("refuses to initialize in a production environment", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => init()).toThrow(GroundstateProductionError);
  });

  it("binds window.__GROUNDSTATE__ with version, list and call", async () => {
    init({ appName: "demo" });
    const binding = window.__GROUNDSTATE__;
    expect(binding).toBeDefined();
    expect(binding?.appName).toBe("demo");
    expect(binding?.list().map((t) => t.name)).toEqual(["getGroundstateHealth"]);
    const result = await binding?.call("nope");
    expect(result).toEqual({ ok: false, error: expect.stringContaining('Unknown tool "nope"') });
  });

  it("is idempotent", () => {
    init();
    expect(() => init()).not.toThrow();
  });
});

describe("observe", () => {
  it("throws before init with an actionable message", () => {
    expect(() => observe("cart", () => ({}))).toThrow(/before init/);
  });

  it("registers get<Name>State and returns live values at call time", async () => {
    init();
    const store = { items: [] as string[] };
    observe("cart", () => ({ items: store.items }));

    expect(listTools().map((t) => t.name)).toContain("getCartState");

    const before = await window.__GROUNDSTATE__?.call("getCartState");
    expect(before).toEqual({ ok: true, result: { items: [] } });

    store.items.push("book");
    const after = await window.__GROUNDSTATE__?.call("getCartState");
    expect(after).toEqual({ ok: true, result: { items: ["book"] } });
  });

  it("marks observables read-only and supports unregister", () => {
    init();
    const unregister = observe("auth", () => ({ user: null }));
    expect(listTools().find((t) => t.name === "getAuthState")?.readOnly).toBe(true);
    unregister();
    expect(listTools().find((t) => t.name === "getAuthState")).toBeUndefined();
  });
});

describe("act", () => {
  it("registers a callable, mutating tool that receives args", async () => {
    init();
    let received: unknown;
    act("submitCheckout", (args) => {
      received = args;
      return { status: "declined" };
    });

    const tool = listTools().find((t) => t.name === "submitCheckout");
    expect(tool?.readOnly).toBe(false);

    const result = await window.__GROUNDSTATE__?.call("submitCheckout", { card: "test" });
    expect(result).toEqual({ ok: true, result: { status: "declined" } });
    expect(received).toEqual({ card: "test" });
  });

  it("surfaces tool errors as { ok: false } instead of throwing across the boundary", async () => {
    init();
    act("explode", () => {
      throw new Error("boom");
    });
    const result = await window.__GROUNDSTATE__?.call("explode");
    expect(result).toEqual({ ok: false, error: "boom" });
  });
});

describe("fixtures", () => {
  it("registers shared loadFixture/listFixtures tools on first fixture", async () => {
    init();
    let loaded = false;
    fixture("empty_cart", () => {
      loaded = true;
    });

    const names = listTools().map((t) => t.name);
    expect(names).toContain("loadFixture");
    expect(names).toContain("listFixtures");

    const list = await window.__GROUNDSTATE__?.call("listFixtures");
    expect(list).toEqual({
      ok: true,
      result: [{ name: "empty_cart", description: expect.any(String) }],
    });

    const load = await window.__GROUNDSTATE__?.call("loadFixture", { name: "empty_cart" });
    expect(load).toEqual({ ok: true, result: { loaded: "empty_cart" } });
    expect(loaded).toBe(true);
  });

  it("rejects unknown fixtures with the list of available ones", async () => {
    init();
    fixture("empty_cart", () => {});
    const result = await window.__GROUNDSTATE__?.call("loadFixture", { name: "missing" });
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("Available fixtures: empty_cart"),
    });
  });

  it("rejects duplicate fixture names", () => {
    init();
    fixture("empty_cart", () => {});
    expect(() => fixture("empty_cart", () => {})).toThrow(/already registered/);
  });
});

describe("reset", () => {
  it("registers resetToGroundState", async () => {
    init();
    let called = false;
    reset(() => {
      called = true;
    });
    const result = await window.__GROUNDSTATE__?.call("resetToGroundState");
    expect(result).toEqual({ ok: true, result: { reset: true } });
    expect(called).toBe(true);
  });
});
