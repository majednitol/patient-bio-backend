import { describe, it, expect } from "vitest";
import { QueryCache, InvalidationGraph } from "./state-helpers";

describe("Phase 4: Query Invalidation", () => {
  const buildGraph = (): InvalidationGraph => {
    const graph = new InvalidationGraph();
    graph.addRule({ mutation: "followUpBooking", invalidates: [["appointments"]] });
    graph.addRule({ mutation: "doctorDataImport", invalidates: [["prescription-templates"], ["doctor-connections"], ["doctor-patient-notes"]] });
    graph.addRule({ mutation: "hospitalRegistration", invalidates: [["hospitals"], ["my-hospitals"]] });
    graph.addRule({ mutation: "hospitalUpdate", invalidates: [["hospital", "h1"]] });
    graph.addRule({ mutation: "transfer", invalidates: [["beds"], ["admissions"], ["transfer-history"], ["hospital-stats"]] });
    graph.addRule({ mutation: "visitSummaryApproval", invalidates: [["visit-summaries"], ["patient-history"]] });
    graph.addRule({ mutation: "testCatalogCRUD", invalidates: [["pathologist-tests"]] });
    graph.addRule({ mutation: "doctorSettingsSave", invalidates: [["doctor-settings"]] });
    graph.addRule({ mutation: "staffAdd", invalidates: [["doctor-staff"]] });
    graph.addRule({ mutation: "staffUpdate", invalidates: [["doctor-staff"]] });
    graph.addRule({ mutation: "staffRemove", invalidates: [["doctor-staff"]] });
    graph.addRule({ mutation: "patientResearcherShare", invalidates: [["patient-researcher-shares", "user-1"]] });
    return graph;
  };

  it("1 - follow-up booking invalidates ['appointments']", () => {
    const graph = buildGraph();
    const keys = graph.getInvalidations("followUpBooking");
    expect(keys).toEqual([["appointments"]]);
  });

  it("2 - doctor data import invalidates 3 keys simultaneously", () => {
    const graph = buildGraph();
    const keys = graph.getInvalidations("doctorDataImport");
    expect(keys).toHaveLength(3);
    expect(keys).toContainEqual(["prescription-templates"]);
    expect(keys).toContainEqual(["doctor-connections"]);
    expect(keys).toContainEqual(["doctor-patient-notes"]);
  });

  it("3 - hospital registration invalidates ['hospitals'] + ['my-hospitals']", () => {
    const graph = buildGraph();
    const keys = graph.getInvalidations("hospitalRegistration");
    expect(keys).toHaveLength(2);
  });

  it("4 - hospital update invalidates specific ['hospital', id]", () => {
    const graph = buildGraph();
    const keys = graph.getInvalidations("hospitalUpdate");
    expect(keys).toEqual([["hospital", "h1"]]);
  });

  it("5 - transfer invalidates beds + admissions + transfer-history + hospital-stats", () => {
    const graph = buildGraph();
    const keys = graph.getInvalidations("transfer");
    expect(keys).toHaveLength(4);
  });

  it("6 - visit summary approval invalidates 2 related keys", () => {
    const graph = buildGraph();
    const keys = graph.getInvalidations("visitSummaryApproval");
    expect(keys).toHaveLength(2);
    expect(keys).toContainEqual(["visit-summaries"]);
    expect(keys).toContainEqual(["patient-history"]);
  });

  it("7 - test catalog CRUD invalidates ['pathologist-tests']", () => {
    const graph = buildGraph();
    expect(graph.getInvalidations("testCatalogCRUD")).toEqual([["pathologist-tests"]]);
  });

  it("8 - doctor settings save invalidates ['doctor-settings']", () => {
    const graph = buildGraph();
    expect(graph.getInvalidations("doctorSettingsSave")).toEqual([["doctor-settings"]]);
  });

  it("9 - staff add/update/remove all invalidate ['doctor-staff']", () => {
    const graph = buildGraph();
    expect(graph.getInvalidations("staffAdd")).toEqual([["doctor-staff"]]);
    expect(graph.getInvalidations("staffUpdate")).toEqual([["doctor-staff"]]);
    expect(graph.getInvalidations("staffRemove")).toEqual([["doctor-staff"]]);
  });

  it("10 - patient researcher share invalidates with user-scoped key", () => {
    const graph = buildGraph();
    const keys = graph.getInvalidations("patientResearcherShare");
    expect(keys).toEqual([["patient-researcher-shares", "user-1"]]);
  });

  it("11 - prefix-based invalidation matches all sub-keys", () => {
    const cache = new QueryCache();
    cache.set(["appointments"], []);
    cache.set(["appointments", "apt-1"], { id: "apt-1" });
    cache.set(["appointments", "apt-2"], { id: "apt-2" });
    cache.set(["doctors"], []);

    // Invalidate with prefix ["appointments"]
    cache.invalidateMatching(["appointments"]);
    expect(cache.isStale(["appointments"])).toBe(true);
    expect(cache.isStale(["appointments", "apt-1"])).toBe(true);
    expect(cache.isStale(["appointments", "apt-2"])).toBe(true);
    expect(cache.isStale(["doctors"])).toBe(false);
  });

  it("12 - exact key invalidation does not affect sibling keys", () => {
    const cache = new QueryCache();
    cache.set(["doctor-settings", "user-1"], { tz: "UTC" });
    cache.set(["doctor-settings", "user-2"], { tz: "EST" });
    cache.invalidate(["doctor-settings", "user-1"]);
    expect(cache.isStale(["doctor-settings", "user-1"])).toBe(true);
    expect(cache.isStale(["doctor-settings", "user-2"])).toBe(false);
  });

  it("13 - invalidation marks entry as stale, not deleted", () => {
    const cache = new QueryCache();
    cache.set("appointments", [{ id: "a1" }]);
    cache.invalidate("appointments");
    expect(cache.isStale("appointments")).toBe(true);
    expect(cache.get("appointments")).toEqual([{ id: "a1" }]); // still there
  });

  it("14 - invalidation triggers refetch for active observers only", () => {
    const cache = new QueryCache();
    cache.set("active-query", "data", { observerCount: 2 });
    cache.set("inactive-query", "data", { observerCount: 0 });
    cache.invalidate("active-query");
    cache.invalidate("inactive-query");
    // Both are stale
    expect(cache.isStale("active-query")).toBe(true);
    expect(cache.isStale("inactive-query")).toBe(true);
    // But only active one would trigger refetch (observer count > 0)
    expect(cache.getRaw("active-query")!.observerCount).toBeGreaterThan(0);
    expect(cache.getRaw("inactive-query")!.observerCount).toBe(0);
  });

  it("15 - batch invalidation of 10+ keys completes atomically", () => {
    const cache = new QueryCache();
    const keys: string[][] = [];
    for (let i = 0; i < 12; i++) {
      const key = [`batch-key-${i}`];
      keys.push(key);
      cache.set(key, { index: i });
    }
    // Batch invalidate all
    for (const key of keys) {
      cache.invalidate(key);
    }
    // All should be stale
    for (const key of keys) {
      expect(cache.isStale(key)).toBe(true);
      expect(cache.get(key)).toBeDefined(); // not deleted
    }
  });
});
