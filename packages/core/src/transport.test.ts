import { afterEach, describe, expect, it } from "vitest";
import { getNativeModelContext, registerNative } from "./transport.js";
import type { ModelContextLike } from "./types.js";

function fakeContext() {
  const registered: string[] = [];
  const unregistered: string[] = [];
  const ctx: ModelContextLike = {
    registerTool: (t) => registered.push(t.name),
    unregisterTool: (name) => unregistered.push(name),
  };
  return { ctx, registered, unregistered };
}

afterEach(() => {
  document.modelContext = undefined;
  navigator.modelContext = undefined;
});

describe("transport order", () => {
  it("prefers document.modelContext (current spec) over navigator (deprecated)", () => {
    const doc = fakeContext();
    const nav = fakeContext();
    document.modelContext = doc.ctx;
    navigator.modelContext = nav.ctx;
    expect(getNativeModelContext()).toBe(doc.ctx);
  });

  it("falls back to navigator.modelContext when document has none", () => {
    const nav = fakeContext();
    navigator.modelContext = nav.ctx;
    expect(getNativeModelContext()).toBe(nav.ctx);
  });

  it("returns undefined when no native context exists", () => {
    expect(getNativeModelContext()).toBeUndefined();
  });
});

describe("registerNative", () => {
  it("registers and unregisters on the native context", () => {
    const doc = fakeContext();
    document.modelContext = doc.ctx;
    const unregister = registerNative({
      name: "getCartState",
      description: "d",
      readOnly: true,
      execute: () => null,
    });
    expect(doc.registered).toEqual(["getCartState"]);
    unregister();
    expect(doc.unregistered).toEqual(["getCartState"]);
  });

  it("is a no-op without a native context and never throws on a broken one", () => {
    expect(() =>
      registerNative({ name: "a", description: "d", readOnly: true, execute: () => null })(),
    ).not.toThrow();

    document.modelContext = {
      registerTool: () => {
        throw new Error("experimental API tantrum");
      },
    };
    expect(() =>
      registerNative({ name: "b", description: "d", readOnly: true, execute: () => null })(),
    ).not.toThrow();
  });
});
