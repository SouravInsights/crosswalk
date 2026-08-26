import { __resetForTests, init, listTools } from "groundstate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { observeQueries, observeStore, type StoreLike } from "./stores.js";

beforeEach(() => init());
afterEach(() => __resetForTests());

function vanillaStore<T extends Record<string, unknown>>(
  initial: T,
): StoreLike<T> & {
  set: (next: Partial<T>) => void;
} {
  let state = initial;
  const listeners = new Set<(s: T, p: T) => void>();
  return {
    getState: () => state,
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    set: (next) => {
      const prev = state;
      state = { ...state, ...next };
      for (const l of listeners) l(state, prev);
    },
  };
}

describe("observeStore", () => {
  it("derives a live observable and strips action functions", async () => {
    const store = vanillaStore({ count: 1, increment: () => {} });
    observeStore("counter", store);

    const result = await window.__GROUNDSTATE__?.call("getCounterState");
    expect(result).toEqual({ ok: true, result: { count: 1 } });
  });

  it("flight-records transitions by default", async () => {
    const store = vanillaStore({ count: 0 });
    observeStore("counter", store);
    store.set({ count: 1 });

    const history = await window.__GROUNDSTATE__?.call("getStateHistory", { source: "counter" });
    expect(history?.ok).toBe(true);
    const entries = (history as { ok: true; result: unknown[] }).result;
    expect(entries).toHaveLength(2);
  });

  it("skips recording when record: false", () => {
    const store = vanillaStore({ count: 0 });
    observeStore("counter", store, { record: false });
    expect(listTools().map((t) => t.name)).not.toContain("getStateHistory");
  });
});

describe("observeQueries", () => {
  it("summarizes the query cache with error messages flattened", async () => {
    const client = {
      getQueryCache: () => ({
        getAll: () => [
          {
            queryKey: ["trips", 1],
            state: {
              status: "error",
              fetchStatus: "idle",
              dataUpdatedAt: 123,
              error: new Error("500 from /api/trips"),
            },
          },
        ],
      }),
    };
    observeQueries(client);

    const result = await window.__GROUNDSTATE__?.call("getQueriesState");
    expect(result).toEqual({
      ok: true,
      result: [
        {
          queryKey: ["trips", 1],
          status: "error",
          fetchStatus: "idle",
          dataUpdatedAt: 123,
          error: "500 from /api/trips",
        },
      ],
    });
  });
});
