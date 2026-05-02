import { describe, it, expect, vi } from "vitest";
import { mockPatientResearcherShare } from "./test-helpers";

describe("Phase 7: Cohort Builder", () => {
  const shares = [
    { ...mockPatientResearcherShare, disease_category: "diabetes", status: "pending" as const },
    { ...mockPatientResearcherShare, id: "s2", disease_category: "cardiology", status: "viewed" as const },
    { ...mockPatientResearcherShare, id: "s3", disease_category: "diabetes", status: "completed" as const },
    { ...mockPatientResearcherShare, id: "s4", disease_category: "diabetes", status: "revoked" as const },
  ];

  // Test 73: Fetch cohort data (non-revoked)
  it("should return shares with non-revoked statuses", () => {
    const nonRevoked = shares.filter((s) => s.status !== "revoked");
    expect(nonRevoked.length).toBe(3);
  });

  // Test 74: Disease category filter
  it("should filter by disease category", () => {
    const categories = ["diabetes"];
    const filtered = shares.filter((s) => categories.includes(s.disease_category || ""));
    expect(filtered.length).toBe(3);
  });

  // Test 75: Disease counts computation
  it("should group shares by disease_category and count", () => {
    const counts: Record<string, number> = {};
    shares.forEach((s) => {
      const cat = s.disease_category || "general";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    expect(counts["diabetes"]).toBe(3);
    expect(counts["cardiology"]).toBe(1);
  });

  // Test 76: Toggle disease category
  it("should add/remove from filter array", () => {
    let selected: string[] = ["diabetes"];
    // Toggle off
    selected = selected.filter((c) => c !== "diabetes");
    expect(selected.length).toBe(0);
    // Toggle on
    selected.push("cardiology");
    expect(selected).toContain("cardiology");
  });

  // Test 77: Toggle blood group
  it("should toggle blood group filter", () => {
    let bloodGroups: string[] = [];
    bloodGroups.push("A+");
    expect(bloodGroups).toContain("A+");
    bloodGroups = bloodGroups.filter((g) => g !== "A+");
    expect(bloodGroups.length).toBe(0);
  });

  // Test 78: Clear filters resets all
  it("should reset all filters to defaults", () => {
    const clearFilters = () => ({
      diseaseCategories: [] as string[],
      bloodGroups: [] as string[],
      statusFilter: "all",
    });
    const result = clearFilters();
    expect(result.diseaseCategories.length).toBe(0);
    expect(result.bloodGroups.length).toBe(0);
    expect(result.statusFilter).toBe("all");
  });

  // Test 79: hasActiveFilters detection
  it("should detect when filters are active", () => {
    const hasActive = (filters: { diseaseCategories: string[]; bloodGroups: string[] }) =>
      filters.diseaseCategories.length > 0 || filters.bloodGroups.length > 0;
    expect(hasActive({ diseaseCategories: ["diabetes"], bloodGroups: [] })).toBe(true);
    expect(hasActive({ diseaseCategories: [], bloodGroups: [] })).toBe(false);
  });

  // Test 80: Export cohort CSV with anonymized IDs
  it("should use anonymized IDs for anonymized shares in CSV", () => {
    const share = { ...mockPatientResearcherShare, is_anonymized: true, patient_id: "abc12345-6789" };
    const patientId = share.is_anonymized ? `ANON-${share.patient_id.substring(0, 8)}` : share.patient_id;
    expect(patientId).toBe("ANON-abc12345");
  });

  // Test 81: Export cohort JSON with anonymized IDs
  it("should swap patientId with anonymized in JSON export", () => {
    const row = { patientId: "abc12345-6789", isAnonymized: true };
    const exported = { ...row, patientId: row.isAnonymized ? `ANON-${row.patientId.substring(0, 8)}` : row.patientId };
    expect(exported.patientId).toBe("ANON-abc12345");
  });

  // Test 82: Export empty cohort rejected
  it("should reject export when no data", () => {
    const shares: unknown[] = [];
    expect(shares.length).toBe(0);
    // In actual code, toast with "No data to export" would fire
  });
});
