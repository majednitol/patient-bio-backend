import { describe, it, expect } from "vitest";
import { QueryCache, StaleTracker, STALE_TIMES } from "./state-helpers";

describe("Phase 3: Stale-While-Revalidate", () => {
  const tracker = new StaleTracker();
  const now = Date.now();

  it("1 - data within staleTime is fresh (no refetch needed)", () => {
    const result = tracker.shouldRefetch({
      staleTime: STALE_TIMES.STANDARD,
      lastFetchedAt: now - 60_000, // 1 min ago, stale is 5 min
      now,
    });
    expect(result).toBe(false);
  });

  it("2 - data past staleTime is stale (refetch on next access)", () => {
    const result = tracker.shouldRefetch({
      staleTime: STALE_TIMES.STANDARD,
      lastFetchedAt: now - 6 * 60_000, // 6 min ago
      now,
    });
    expect(result).toBe(true);
  });

  it("3 - notifications: 30s staleTime boundary", () => {
    expect(tracker.isFresh(STALE_TIMES.REALTIME, now - 29_000, now)).toBe(true);
    expect(tracker.isFresh(STALE_TIMES.REALTIME, now - 31_000, now)).toBe(false);
  });

  it("4 - platform settings: 5min staleTime boundary", () => {
    expect(tracker.isFresh(STALE_TIMES.STANDARD, now - 4 * 60_000, now)).toBe(true);
    expect(tracker.isFresh(STALE_TIMES.STANDARD, now - 6 * 60_000, now)).toBe(false);
  });

  it("5 - diagnosis history: 10min staleTime boundary", () => {
    expect(tracker.isFresh(STALE_TIMES.LONG, now - 9 * 60_000, now)).toBe(true);
    expect(tracker.isFresh(STALE_TIMES.LONG, now - 11 * 60_000, now)).toBe(false);
  });

  it("6 - access anomalies: 15min staleTime boundary", () => {
    expect(tracker.isFresh(STALE_TIMES.ANALYTICS, now - 14 * 60_000, now)).toBe(true);
    expect(tracker.isFresh(STALE_TIMES.ANALYTICS, now - 16 * 60_000, now)).toBe(false);
  });

  it("7 - AI merge assessment: 1hr staleTime boundary", () => {
    expect(tracker.isFresh(STALE_TIMES.EXPENSIVE, now - 59 * 60_000, now)).toBe(true);
    expect(tracker.isFresh(STALE_TIMES.EXPENSIVE, now - 61 * 60_000, now)).toBe(false);
  });

  it("8 - slot recommendations: 2min staleTime for freshness", () => {
    expect(tracker.isFresh(STALE_TIMES.SHORT, now - 90_000, now)).toBe(true);
    expect(tracker.isFresh(STALE_TIMES.SHORT, now - 150_000, now)).toBe(false);
  });

  it("9 - data at exact staleTime boundary is stale", () => {
    // At exactly staleTime ms, data should be considered stale (>=)
    const result = tracker.isFresh(STALE_TIMES.REALTIME, now - STALE_TIMES.REALTIME, now);
    expect(result).toBe(false);
  });

  it("10 - window focus triggers revalidation of stale data", () => {
    const result = tracker.shouldRefetch({
      staleTime: STALE_TIMES.STANDARD,
      lastFetchedAt: now - 10 * 60_000,
      now,
      trigger: "windowFocus",
    });
    expect(result).toBe(true);
  });

  it("11 - mount triggers revalidation of stale data", () => {
    const result = tracker.shouldRefetch({
      staleTime: STALE_TIMES.STANDARD,
      lastFetchedAt: now - 10 * 60_000,
      now,
      trigger: "mount",
    });
    expect(result).toBe(true);
  });

  it("12 - fresh data is served without network request", () => {
    const cache = new QueryCache();
    cache.set("fresh-data", { value: 42 }, { staleTime: 60_000 });
    expect(cache.isStale("fresh-data")).toBe(false);
    expect(cache.get("fresh-data")).toEqual({ value: 42 });
  });

  it("13 - multiple observers share same stale timer", () => {
    const cache = new QueryCache();
    cache.set("shared", "data", { staleTime: 60_000, observerCount: 3 });
    cache.setFetchedAt("shared", now - 30_000);
    // All observers see fresh data
    expect(cache.isStale("shared")).toBe(false);
    cache.setFetchedAt("shared", now - 90_000);
    // All observers see stale data
    expect(cache.isStale("shared")).toBe(true);
  });

  it("14 - staleTime=0 means always stale", () => {
    expect(tracker.shouldRefetch({ staleTime: 0, lastFetchedAt: now, now })).toBe(true);
    expect(tracker.isFresh(0, now, now)).toBe(false);
  });

  it("15 - staleTime=Infinity means never stale", () => {
    expect(tracker.shouldRefetch({ staleTime: Infinity, lastFetchedAt: 0, now })).toBe(false);
    expect(tracker.isFresh(Infinity, 0, now)).toBe(true);
  });
});
