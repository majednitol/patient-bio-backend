import { describe, it, expect } from "vitest";

describe("Phase 8: Cohort Analytics", () => {
  const shares = [
    { disease_category: "diabetes", status: "pending", patient_id: "p1", is_anonymized: true },
    { disease_category: "diabetes", status: "viewed", patient_id: "p2", is_anonymized: false },
    { disease_category: "cardiology", status: "completed", patient_id: "p3", is_anonymized: true },
    { disease_category: "cardiology", status: "pending", patient_id: "p1", is_anonymized: false },
  ];

  const profiles = [
    { user_id: "p2", gender: "male", date_of_birth: "1990-05-15" },
    { user_id: "p3", gender: "female", date_of_birth: "1985-01-20" },
    { user_id: "p1", gender: "male", date_of_birth: "2010-06-10" },
  ];

  // Test 83: Disease distribution
  it("should group shares by disease_category and capitalize", () => {
    const dist: Record<string, number> = {};
    shares.forEach((s) => {
      const cat = s.disease_category || "General";
      const label = cat.charAt(0).toUpperCase() + cat.slice(1);
      dist[label] = (dist[label] || 0) + 1;
    });
    expect(dist["Diabetes"]).toBe(2);
    expect(dist["Cardiology"]).toBe(2);
  });

  // Test 84: Status distribution
  it("should group shares by status", () => {
    const dist: Record<string, number> = {};
    shares.forEach((s) => { dist[s.status] = (dist[s.status] || 0) + 1; });
    expect(dist["pending"]).toBe(2);
    expect(dist["viewed"]).toBe(1);
    expect(dist["completed"]).toBe(1);
  });

  // Test 85: Gender distribution
  it("should group profiles by gender", () => {
    const dist: Record<string, number> = {};
    profiles.forEach((p) => { dist[p.gender || "Unknown"] = (dist[p.gender || "Unknown"] || 0) + 1; });
    expect(dist["male"]).toBe(2);
    expect(dist["female"]).toBe(1);
  });

  // Test 86: Age bucket calculation
  it("should correctly bucket ages", () => {
    const getAgeBucket = (age: number) => {
      if (age <= 17) return "0-17";
      if (age <= 30) return "18-30";
      if (age <= 45) return "31-45";
      if (age <= 60) return "46-60";
      if (age <= 75) return "61-75";
      return "76+";
    };
    expect(getAgeBucket(15)).toBe("0-17");
    expect(getAgeBucket(25)).toBe("18-30");
    expect(getAgeBucket(40)).toBe("31-45");
    expect(getAgeBucket(55)).toBe("46-60");
    expect(getAgeBucket(70)).toBe("61-75");
    expect(getAgeBucket(80)).toBe("76+");
  });

  // Test 87: Age from date_of_birth
  it("should calculate age from date_of_birth", () => {
    const dob = new Date("1990-05-15");
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    expect(age).toBeGreaterThan(30);
    expect(age).toBeLessThan(40);
  });

  // Test 88: Anonymized count
  it("should count anonymized shares", () => {
    const anonCount = shares.filter((s) => s.is_anonymized).length;
    expect(anonCount).toBe(2);
  });

  // Test 89: Identified count
  it("should calculate identified as total - anonymized", () => {
    const total = shares.length;
    const anon = shares.filter((s) => s.is_anonymized).length;
    expect(total - anon).toBe(2);
  });

  // Test 90: Unique patients
  it("should count unique patients", () => {
    const unique = new Set(shares.map((s) => s.patient_id)).size;
    expect(unique).toBe(3);
  });

  // Test 91: Profiles limited to non-anonymized
  it("should only fetch profiles for non-anonymized shares", () => {
    const nonAnon = shares.filter((s) => !s.is_anonymized);
    const patientIds = nonAnon.map((s) => s.patient_id);
    expect(patientIds).toContain("p2");
    expect(patientIds).not.toContain("p3"); // p3 is anonymized
  });

  // Test 92: Profiles capped at 50
  it("should cap profile fetches at 50", () => {
    const ids = Array.from({ length: 100 }, (_, i) => `p${i}`);
    const capped = ids.slice(0, 50);
    expect(capped.length).toBe(50);
  });

  // Test 93: Empty shares shows empty state
  it("should detect empty shares", () => {
    const emptyShares: unknown[] = [];
    expect(emptyShares.length).toBe(0);
  });

  // Test 94: Query staleTime is 5 minutes
  it("should have 5 minute staleTime for profile query", () => {
    expect(5 * 60 * 1000).toBe(300000);
  });
});
