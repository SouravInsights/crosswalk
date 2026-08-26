import { afterEach, describe, expect, it } from "vitest";
import { __resetForTests, doctor, init, listTools, observe, record } from "./groundstate.js";
import { FlightRecorder } from "./recorder.js";

afterEach(() => {
  __resetForTests();
});

function fakeSource(initial: Record<string, unknown>) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    source: {
      subscribe: (l: () => void) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
      snapshot: () => state,
    },
    setState: (next: Record<string, unknown>) => {
      state = next;
      for (const l of listeners) l();
    },
  };
}

describe("record", () => {
  it("registers getStateHistory and buffers transitions with changed keys", async () => {
    init();
    const { source, setState } = fakeSource({ count: 0, label: "a" });
    record("counter", source);

    expect(listTools().map((t) => t.name)).toContain("getStateHistory");

    setState({ count: 1, label: "a" });
    setState({ count: 1, label: "b" });

    const result = await window.__GROUNDSTATE__?.call("getStateHistory", { source: "counter" });
    expect(result?.ok).toBe(true);
    const entries = (result as { ok: true; result: Array<Record<string, unknown>> }).result;
    expect(entries).toHaveLength(3);
    expect(entries[0]?.changedKeys).toEqual(["*initial*"]);
    expect(entries[1]?.changedKeys).toEqual(["count"]);
    expect(entries[2]?.changedKeys).toEqual(["label"]);
    expect(entries[2]?.state).toEqual({ count: 1, label: "b" });
  });

  it("stops recording after unregister", async () => {
    init();
    const { source, setState } = fakeSource({ n: 0 });
    const stop = record("s", source);
    stop();
    setState({ n: 1 });
    const result = await window.__GROUNDSTATE__?.call("getStateHistory", {});
    const entries = (result as { ok: true; result: unknown[] }).result;
    expect(entries).toHaveLength(1); // only the initial snapshot
  });
});

describe("FlightRecorder", () => {
  it("caps the buffer at the limit", () => {
    const r = new FlightRecorder(3);
    for (let i = 0; i < 10; i++) r.push("x", { i });
    expect(r.history()).toHaveLength(3);
    expect(r.history()[2]?.state).toEqual({ i: 9 });
  });
});

describe("doctor / getGroundstateHealth", () => {
  it("reports broken observables loudly instead of silently", async () => {
    init({ appName: "t" });
    observe("good", () => ({ fine: true }));
    observe("broken", () => {
      throw new Error("store was refactored");
    });

    const report = await doctor();
    expect(report.healthy).toBe(false);
    const broken = report.tools.find((t) => t.name === "getBrokenState");
    expect(broken).toMatchObject({ ok: false, error: "store was refactored" });
    const good = report.tools.find((t) => t.name === "getGoodState");
    expect(good).toMatchObject({ ok: true, checked: true });
  });

  it("is exposed as a tool and presence-checks mutating tools without running them", async () => {
    init();
    let ran = false;
    const { act } = await import("./groundstate.js");
    act("dangerous", () => {
      ran = true;
    });
    const result = await window.__GROUNDSTATE__?.call("getGroundstateHealth", {});
    expect(result?.ok).toBe(true);
    expect(ran).toBe(false);
    const report = (result as { ok: true; result: { tools: Array<{ name: string }> } }).result;
    expect(report.tools.map((t) => t.name)).toContain("dangerous");
  });
});
