import { describe, it, expect } from "vitest";
import {
  determineDegradation,
  type DegradationLevel,
} from "./resilience-helpers";

describe("Phase 2: Graceful Degradation", () => {
  it("1. Online with full features available", () => {
    const state = determineDegradation("online", true);
    expect(state.level).toBe("full");
    expect(state.unavailableFeatures).toEqual([]);
    expect(state.availableFeatures.length).toBeGreaterThan(5);
  });

  it("2. Slow network provides partial functionality", () => {
    const state = determineDegradation("slow", true);
    expect(state.level).toBe("partial");
    expect(state.availableFeatures).toContain("view_records");
    expect(state.availableFeatures).toContain("edit_records");
    expect(state.unavailableFeatures).toContain("analytics");
  });

  it("3. Intermittent connection limits to view/edit only", () => {
    const state = determineDegradation("intermittent", true);
    expect(state.level).toBe("partial");
    expect(state.availableFeatures).toContain("view_records");
    expect(state.unavailableFeatures).toContain("sync");
    expect(state.unavailableFeatures).toContain("messaging");
  });

  it("4. Offline with cached data allows viewing", () => {
    const state = determineDegradation("offline", true);
    expect(state.level).toBe("cached");
    expect(state.availableFeatures).toEqual(["view_records"]);
    expect(state.unavailableFeatures).toContain("edit_records");
  });

  it("5. Offline without cache is fully unavailable", () => {
    const state = determineDegradation("offline", false);
    expect(state.level).toBe("unavailable");
    expect(state.availableFeatures).toEqual([]);
    expect(state.unavailableFeatures.length).toBeGreaterThan(5);
  });

  it("6. Degradation message reflects the state", () => {
    expect(determineDegradation("online", true).message).toContain("All features");
    expect(determineDegradation("offline", true).message).toContain("Offline");
    expect(determineDegradation("offline", false).message).toContain("No connection");
  });

  it("7. Slow network still allows sharing", () => {
    const state = determineDegradation("slow", true);
    expect(state.availableFeatures).toContain("share_data");
  });

  it("8. Intermittent network blocks sharing", () => {
    const state = determineDegradation("intermittent", true);
    expect(state.unavailableFeatures).toContain("share_data");
  });

  it("9. Online without cache still has full features", () => {
    const state = determineDegradation("online", false);
    expect(state.level).toBe("full");
    expect(state.availableFeatures.length).toBe(7);
  });

  it("10. Degradation levels are ordered: full > partial > cached > unavailable", () => {
    const levels: DegradationLevel[] = ["full", "partial", "cached", "unavailable"];
    const online = levels.indexOf(determineDegradation("online", true).level);
    const slow = levels.indexOf(determineDegradation("slow", true).level);
    const offline = levels.indexOf(determineDegradation("offline", true).level);
    const noCache = levels.indexOf(determineDegradation("offline", false).level);
    expect(online).toBeLessThan(slow);
    expect(slow).toBeLessThan(offline);
    expect(offline).toBeLessThan(noCache);
  });

  it("11. Notifications disabled in slow network", () => {
    const state = determineDegradation("slow", true);
    expect(state.unavailableFeatures).toContain("notifications");
  });

  it("12. Sync available in slow network", () => {
    const state = determineDegradation("slow", true);
    expect(state.availableFeatures).toContain("sync");
  });

  it("13. Available + unavailable features cover all features", () => {
    for (const net of ["online", "slow", "intermittent", "offline"] as const) {
      const state = determineDegradation(net, true);
      const all = [...state.availableFeatures, ...state.unavailableFeatures].sort();
      expect(all.length).toBe(7);
    }
  });

  it("14. No feature appears in both available and unavailable", () => {
    for (const net of ["online", "slow", "intermittent", "offline"] as const) {
      const state = determineDegradation(net, true);
      const overlap = state.availableFeatures.filter((f) => state.unavailableFeatures.includes(f));
      expect(overlap).toEqual([]);
    }
  });

  it("15. Messaging only available when fully online", () => {
    expect(determineDegradation("online", true).availableFeatures).toContain("messaging");
    expect(determineDegradation("slow", true).unavailableFeatures).toContain("messaging");
    expect(determineDegradation("intermittent", true).unavailableFeatures).toContain("messaging");
    expect(determineDegradation("offline", true).unavailableFeatures).toContain("messaging");
  });
});
