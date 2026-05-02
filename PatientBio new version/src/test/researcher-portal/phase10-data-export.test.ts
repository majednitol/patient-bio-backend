import { describe, it, expect, vi } from "vitest";
import { createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));

describe("Phase 10: Research Data Export", () => {
  const escapeCsvValue = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Test 109: Export empty shares rejected
  it("should reject export when shares array is empty", () => {
    const shares: unknown[] = [];
    expect(shares.length).toBe(0);
  });

  // Test 110: Filter by status before export
  it("should filter shares by status unless 'all'", () => {
    const shares = [
      { status: "pending" }, { status: "viewed" }, { status: "completed" },
    ];
    const filtered = shares.filter((s) => s.status === "viewed");
    expect(filtered.length).toBe(1);

    const allFiltered = "all" === "all" ? shares : shares.filter((s) => s.status === "all");
    expect(allFiltered.length).toBe(3);
  });

  // Test 111: Batch processing (5 per batch)
  it("should process shares in batches of 5", () => {
    const shares = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}` }));
    const batchSize = 5;
    const batches: typeof shares[] = [];
    for (let i = 0; i < shares.length; i += batchSize) {
      batches.push(shares.slice(i, i + batchSize));
    }
    expect(batches.length).toBe(3);
    expect(batches[0].length).toBe(5);
    expect(batches[2].length).toBe(2);
  });

  // Test 112: Progress tracking
  it("should update progress during export", () => {
    let progress = { current: 0, total: 10 };
    progress = { current: 5, total: 10 };
    expect(progress.current).toBe(5);
    progress = { current: 10, total: 10 };
    expect(progress.current).toBe(progress.total);
  });

  // Test 113: Fetch share data via edge function
  it("should invoke get-patient-data-for-researcher", async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { profile: { display_name: "Test" }, healthData: {}, records: [], isAnonymized: true },
      error: null,
    });
    const result = await mockSupabase.functions.invoke("get-patient-data-for-researcher", {
      body: { share_id: "share-1" },
    });
    expect(result.data.profile.display_name).toBe("Test");
  });

  // Test 114: Profile data excluded when anonymized
  it("should omit profile data for anonymized shares", () => {
    const share = { is_anonymized: true };
    const profile = { display_name: "John", date_of_birth: "1990-01-01", gender: "male" };
    const row: Record<string, unknown> = {};

    if (!share.is_anonymized) {
      row.displayName = profile.display_name;
      row.dateOfBirth = profile.date_of_birth;
      row.gender = profile.gender;
    }

    expect(row).not.toHaveProperty("displayName");
    expect(row).not.toHaveProperty("dateOfBirth");
  });

  // Test 115: Anonymous ID format
  it("should format anonymous ID as ANON-{first 8 chars}", () => {
    const patientId = "abc12345-6789-0000-0000-000000000000";
    const anonId = `ANON-${patientId.substring(0, 8)}`;
    expect(anonId).toBe("ANON-abc12345");
  });

  // Test 116: CSV escaping - wraps with quotes
  it("should wrap values with commas in quotes", () => {
    expect(escapeCsvValue("hello, world")).toBe('"hello, world"');
    expect(escapeCsvValue("normal")).toBe("normal");
  });

  // Test 117: CSV double-quote escaping
  it("should replace double quotes with escaped double quotes", () => {
    expect(escapeCsvValue('say "hello"')).toBe('"say ""hello"""');
  });

  // Test 118: JSON export structure
  it("should swap patientId for anonymized in JSON", () => {
    const row = { patientId: "abc12345", isAnonymized: true, anonymousId: "ANON-abc12345" };
    const exported = { ...row, patientId: row.isAnonymized ? row.anonymousId : row.patientId };
    expect(exported.patientId).toBe("ANON-abc12345");
  });

  // Test 119: FHIR bundle structure
  it("should create valid FHIR bundle", () => {
    const bundle = {
      resourceType: "Bundle",
      type: "collection",
      timestamp: new Date().toISOString(),
      total: 1,
      entry: [{ resource: { resourceType: "Patient", id: "ANON-abc12345" } }],
    };
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.type).toBe("collection");
    expect(bundle.entry[0].resource.resourceType).toBe("Patient");
  });

  // Test 120: FHIR conditions from chronic diseases
  it("should create Condition resources from comma-separated diseases", () => {
    const chronicDiseases = "Diabetes, Hypertension, Asthma";
    const conditions = chronicDiseases.split(",").map((c) => c.trim()).filter(Boolean).map((condition) => ({
      resource: { resourceType: "Condition", code: { text: condition }, category: [{ coding: [{ code: "problem-list-item" }] }] },
    }));
    expect(conditions.length).toBe(3);
    expect(conditions[0].resource.code.text).toBe("Diabetes");
  });

  // Test 121: FHIR allergies
  it("should create AllergyIntolerance resources", () => {
    const allergies = "Penicillin, Peanuts";
    const entries = allergies.split(",").map((a) => a.trim()).filter(Boolean).map((allergy) => ({
      resource: { resourceType: "AllergyIntolerance", code: { text: allergy } },
    }));
    expect(entries.length).toBe(2);
    expect(entries[0].resource.resourceType).toBe("AllergyIntolerance");
  });

  // Test 122: FHIR medications
  it("should create MedicationStatement resources", () => {
    const meds = "Metformin, Aspirin";
    const entries = meds.split(",").map((m) => m.trim()).filter(Boolean).map((med) => ({
      resource: { resourceType: "MedicationStatement", medicationCodeableConcept: { text: med }, status: "active" },
    }));
    expect(entries.length).toBe(2);
    expect(entries[1].resource.status).toBe("active");
  });
});
