import { describe, expect, it } from "vitest";
import { MemoryCache } from "./cache.js";

describe("MemoryCache", () => {
  it("evicts older entries when the byte limit is exceeded", () => {
    const cache = new MemoryCache(5);

    cache.set("a", "123");
    cache.set("b", "456");

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("456");
    expect(cache.sizeBytes).toBe(3);
  });

  it("refreshes recency on reads", () => {
    const cache = new MemoryCache(6);

    cache.set("a", "123");
    cache.set("b", "456");
    expect(cache.get("a")).toBe("123");
    cache.set("c", "789");

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("123");
    expect(cache.get("c")).toBe("789");
  });
});
