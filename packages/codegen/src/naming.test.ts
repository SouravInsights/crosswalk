import { describe, expect, it } from "vitest";
import { dedupeNames, nameFromRoute, TOOL_NAME_PATTERN, toToolName } from "./naming.js";

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
