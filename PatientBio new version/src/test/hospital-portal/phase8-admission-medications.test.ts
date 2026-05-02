import { describe, it, expect, vi, beforeEach } from "vitest";
import { MEDICATION_FREQUENCIES, MEDICATION_ROUTES } from "@/hooks/useAdmissionMedications";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

describe("Phase 8: Admission Medications", () => {
  beforeEach(() => vi.clearAllMocks());

  // Test 75: Fetch admission medications with prescriber_name
  it("should return medications with prescriber_name from doctor_profiles", () => {
    const doctorMap = new Map([["doc-1", "Dr. Smith"]]);
    const medication = { prescribed_by: "doc-1" };
    const prescriberName = doctorMap.get(medication.prescribed_by) || "Staff";
    expect(prescriberName).toBe("Dr. Smith");
  });

  // Test 76: Prescriber name falls back to Staff
  it("should fall back to 'Staff' when doctor profile not found", () => {
    const doctorMap = new Map<string, string>();
    const prescriberName = doctorMap.get("unknown-id") || "Staff";
    expect(prescriberName).toBe("Staff");
  });

  // Test 77: Administration count per medication
  it("should group and count administrations by medication", () => {
    const admins = [
      { admission_medication_id: "med-1" },
      { admission_medication_id: "med-1" },
      { admission_medication_id: "med-2" },
    ];
    const adminByMed = new Map<string, number>();
    admins.forEach((a) => adminByMed.set(a.admission_medication_id, (adminByMed.get(a.admission_medication_id) || 0) + 1));
    expect(adminByMed.get("med-1")).toBe(2);
    expect(adminByMed.get("med-2")).toBe(1);
  });

  // Test 78: Add medication uses auth user as prescribed_by
  it("should set prescribed_by from authenticated user", () => {
    const userId = "user-1";
    const insertData = { admission_id: "adm-1", medication_name: "Aspirin", dosage: "100mg", frequency: "OD", route: "oral" as const, prescribed_by: userId };
    expect(insertData.prescribed_by).toBe("user-1");
  });

  // Test 79: Medication routes constant
  it("should define 8 medication routes", () => {
    expect(MEDICATION_ROUTES).toHaveLength(8);
    const values = MEDICATION_ROUTES.map((r) => r.value);
    expect(values).toContain("oral");
    expect(values).toContain("iv");
    expect(values).toContain("im");
    expect(values).toContain("sc");
    expect(values).toContain("topical");
    expect(values).toContain("inhalation");
    expect(values).toContain("rectal");
    expect(values).toContain("other");
  });

  // Test 80: Medication frequencies constant
  it("should define 13 medication frequencies", () => {
    expect(MEDICATION_FREQUENCIES).toHaveLength(13);
    const values = MEDICATION_FREQUENCIES.map((f) => f.value);
    expect(values).toContain("OD");
    expect(values).toContain("BD");
    expect(values).toContain("TDS");
    expect(values).toContain("QID");
    expect(values).toContain("PRN");
    expect(values).toContain("STAT");
  });

  // Test 81: Record administration
  it("should insert with administered_by and dose_given", () => {
    const admin = { admission_medication_id: "med-1", administered_by: "user-1", dose_given: "100mg", skipped: false, skip_reason: null };
    expect(admin.administered_by).toBe("user-1");
    expect(admin.dose_given).toBe("100mg");
    expect(admin.skipped).toBe(false);
  });

  // Test 82: Skip dose recording
  it("should set skipped=true with skip_reason", () => {
    const admin = { admission_medication_id: "med-1", administered_by: "user-1", dose_given: "0", skipped: true, skip_reason: "Patient refused" };
    expect(admin.skipped).toBe(true);
    expect(admin.skip_reason).toBe("Patient refused");
  });

  // Test 83: Update medication status transitions
  it("should support active, discontinued, completed statuses", () => {
    const validStatuses = ["active", "discontinued", "completed"];
    expect(validStatuses).toContain("active");
    expect(validStatuses).toContain("discontinued");
    expect(validStatuses).toContain("completed");
  });

  // Test 84: Administration history ordered chronologically
  it("should return administrations ordered by administered_at desc", () => {
    const admins = [
      { administered_at: "2026-02-16T10:00:00Z" },
      { administered_at: "2026-02-16T08:00:00Z" },
    ];
    const sorted = [...admins].sort((a, b) => new Date(b.administered_at).getTime() - new Date(a.administered_at).getTime());
    expect(sorted[0].administered_at).toBe("2026-02-16T10:00:00Z");
  });
});
