import { describe, it, expect } from "vitest";
import { QueryCache } from "./state-helpers";

describe("Phase 1: Cache Behavior", () => {
  it("1 - stores and retrieves data by exact key", () => {
    const cache = new QueryCache();
    cache.set("appointments", [{ id: "a1" }]);
    expect(cache.get("appointments")).toEqual([{ id: "a1" }]);
  });

  it("2 - returns undefined for missing keys", () => {
    const cache = new QueryCache();
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("3 - stores data with composite keys (array)", () => {
    const cache = new QueryCache();
    cache.set(["notifications", "user-1"], [{ id: "n1" }]);
    expect(cache.get(["notifications", "user-1"])).toEqual([{ id: "n1" }]);
  });

  it("4 - different user IDs produce isolated cache entries", () => {
    const cache = new QueryCache();
    cache.set(["notifications", "user-1"], [{ id: "n1" }]);
    cache.set(["notifications", "user-2"], [{ id: "n2" }]);
    expect(cache.get(["notifications", "user-1"])).toEqual([{ id: "n1" }]);
    expect(cache.get(["notifications", "user-2"])).toEqual([{ id: "n2" }]);
  });

  it("5 - cache entry with gcTime=0 is immediately eligible for GC", () => {
    const cache = new QueryCache();
    cache.set("temp", "data", { observerCount: 0 });
    cache.setFetchedAt("temp", Date.now() - 1);
    const removed = cache.gc(0);
    expect(removed).toContain("temp");
    expect(cache.get("temp")).toBeUndefined();
  });

  it("6 - cache entry with active observers is not GC'd", () => {
    const cache = new QueryCache();
    cache.set("active", "data", { observerCount: 1 });
    cache.setFetchedAt("active", 0);
    const removed = cache.gc(0);
    expect(removed).toHaveLength(0);
    expect(cache.get("active")).toBe("data");
  });

  it("7 - cache entry without observers is GC'd after gcTime", () => {
    const cache = new QueryCache();
    cache.set("inactive", "data", { observerCount: 0 });
    cache.setFetchedAt("inactive", Date.now() - 10000);
    const removed = cache.gc(5000);
    expect(removed).toContain("inactive");
  });

  it("8 - getAll returns all entries", () => {
    const cache = new QueryCache();
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.getAll().size).toBe(3);
  });

  it("9 - handles 1000+ entries without performance degradation", () => {
    const cache = new QueryCache();
    const start = performance.now();
    for (let i = 0; i < 1500; i++) {
      cache.set(`key-${i}`, { index: i });
    }
    for (let i = 0; i < 1500; i++) {
      cache.get(`key-${i}`);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000); // should be well under 1s
    expect(cache.size()).toBe(1500);
  });

  it("10 - key serialization treats ['a','b'] != ['b','a']", () => {
    const cache = new QueryCache();
    cache.set(["a", "b"], "first");
    cache.set(["b", "a"], "second");
    expect(cache.get(["a", "b"])).toBe("first");
    expect(cache.get(["b", "a"])).toBe("second");
  });

  it("11 - setting same key overwrites previous data", () => {
    const cache = new QueryCache();
    cache.set("key", "old");
    cache.set("key", "new");
    expect(cache.get("key")).toBe("new");
  });

  it("12 - preserves data types (objects, arrays, nulls)", () => {
    const cache = new QueryCache();
    cache.set("obj", { nested: { deep: true } });
    cache.set("arr", [1, [2, 3]]);
    cache.set("nil", null);
    expect(cache.get("obj")).toEqual({ nested: { deep: true } });
    expect(cache.get("arr")).toEqual([1, [2, 3]]);
    expect(cache.get("nil")).toBeNull();
  });

  it("13 - enabled=false prevents cache population", () => {
    const cache = new QueryCache();
    cache.set("disabled", "data", { enabled: false });
    expect(cache.get("disabled")).toBeUndefined();
  });

  it("14 - returns stale data while revalidating", () => {
    const cache = new QueryCache();
    cache.set("stale-key", "old-data", { staleTime: 100 });
    cache.setFetchedAt("stale-key", Date.now() - 200);
    // Data is stale but still retrievable
    expect(cache.isStale("stale-key")).toBe(true);
    expect(cache.get("stale-key")).toBe("old-data");
  });

  it("15 - clearing cache removes all entries", () => {
    const cache = new QueryCache();
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get("a")).toBeUndefined();
  });
});
