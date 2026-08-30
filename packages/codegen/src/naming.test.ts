import { describe, expect, it } from "vitest";
import {
  dedupeNames,
  nameFromRoute,
  stripVersionPrefix,
  TOOL_NAME_PATTERN,
  toToolName,
} from "./naming.js";

describe("toToolName", () => {
  it("slugifies camelCase operationIds", () => {
    expect(toToolName("getOrderStatus")).toBe("get-order-status");
  });

  it("handles snake_case and SCREAMING_CASE", () => {
    expect(toToolName("list_pets")).toBe("list-pets");
    expect(toToolName("LISTPets")).toBe("list-pets");
  });

  it("strips path syntax", () => {
    expect(toToolName("/orders/{id}/cancel")).toBe("orders-id-cancel");
  });

  it("prefixes names that would start with a digit", () => {
    expect(toToolName("123status")).toBe("tool-123status");
  });

  it("always produces a name the WebMCP runtime accepts", () => {
    const messy = ["getOrderStatus", "/a/{b}/c", "do_thing NOW!", "99 Luftballons", "..."];
    for (const input of messy) {
      expect(toToolName(input)).toMatch(TOOL_NAME_PATTERN);
    }
  });
});

describe("nameFromRoute", () => {
  it("builds a readable name from method + path", () => {
    expect(nameFromRoute("get", "/orders/{id}")).toBe("get-orders-id");
  });
});

describe("dedupeNames", () => {
  it("keeps unique names untouched", () => {
    const { names, renames } = dedupeNames([{ name: "a" }, { name: "b" }]);
    expect(names).toEqual(["a", "b"]);
    expect(renames).toEqual([]);
  });

  it("disambiguates collisions with the HTTP method, then a counter", () => {
    const { names, renames } = dedupeNames([
      { name: "orders", httpMethod: "GET" },
      { name: "orders", httpMethod: "POST" },
      { name: "orders", httpMethod: "POST" },
    ]);
    // The first keeps the plain name; later ones get disambiguated.
    expect(names[0]).toBe("orders");
    expect(new Set(names).size).toBe(3);
    expect(renames).toHaveLength(2);
    for (const name of names) expect(name).toMatch(TOOL_NAME_PATTERN);
  });
});

describe("stripVersionPrefix", () => {
  it("drops the version segment when nearly every name shares it", () => {
    const { names, note } = stripVersionPrefix([
      { name: "get-v1-trips" },
      { name: "get-v1-users" },
      { name: "post-v1-trips" },
    ]);
    expect(names).toEqual(["get-trips", "get-users", "post-trips"]);
    expect(note).toContain("v1");
  });

  it("leaves names alone when the version is not shared", () => {
    const { names, note } = stripVersionPrefix([
      { name: "get-v1-trips" },
      { name: "get-users" },
      { name: "get-orders" },
      { name: "get-products" },
    ]);
    expect(names).toEqual(["get-v1-trips", "get-users", "get-orders", "get-products"]);
    expect(note).toBeUndefined();
  });

  it("only touches route-derived names, not operationIds that mention a version", () => {
    // "preview-v2-changes" does not start with an HTTP method, so it neither
    // counts toward the shared prefix nor gets stripped.
    const { names, note } = stripVersionPrefix([
      { name: "get-v1-a" },
      { name: "get-v1-b" },
      { name: "get-v1-c" },
      { name: "get-v1-d" },
      { name: "preview-v2-changes" },
    ]);
    expect(names).toEqual(["get-a", "get-b", "get-c", "get-d", "preview-v2-changes"]);
    expect(note).toContain("v1");
  });
});
