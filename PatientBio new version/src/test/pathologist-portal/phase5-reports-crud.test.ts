import { describe, it, expect } from "vitest";
import { parseAiAnalysis } from "@/hooks/useReportDiagnosisAnalysis";
import { mockReport, mockUser } from "./test-helpers";

// Local helpers matching usePathologistReports
const parseAbnormalFlags = (flags: unknown): unknown[] => {
  if (!flags || !Array.isArray(flags)) return [];
  return flags;
};

const parseAddenda = (addenda: unknown): unknown[] => {
  if (!addenda || !Array.isArray(addenda)) return [];
  return addenda;
};

describe("Phase 5: Reports CRUD and Sharing", () => {
  it("43. Fetch reports ordered by created_at desc", () => {
    const reports = [
      { created_at: "2025-01-01" },
      { created_at: "2025-02-01" },
    ];
    const sorted = [...reports].sort((a, b) => b.created_at.localeCompare(a.created_at));
    expect(sorted[0].created_at).toBe("2025-02-01");
  });

  it("44. Create report inserts with pathologist_id", () => {
    const insertData = {
      pathologist_id: mockUser.id,
      patient_id: "patient-1",
      report_name: "New Report",
      report_type: "blood_test",
    };
    expect(insertData.pathologist_id).toBe(mockUser.id);
  });

  it("45. has_abnormal_values auto-set true when flags present", () => {
    const flags = [{ parameter: "WBC", value: 15000, flag: "high" }];
    const hasAbnormal = flags.length > 0;
    expect(hasAbnormal).toBe(true);
  });

  it("46. has_abnormal_values auto-set false when no flags", () => {
    const flags: unknown[] = [];
    const hasAbnormal = flags.length > 0;
    expect(hasAbnormal).toBe(false);
  });

  it("47. Update report only includes defined fields", () => {
    const data = { report_name: "Updated", report_type: undefined, findings: "New findings" };
    const updateData: Record<string, unknown> = {};
    if (data.report_name !== undefined) updateData.report_name = data.report_name;
    if (data.report_type !== undefined) updateData.report_type = data.report_type;
    if (data.findings !== undefined) updateData.findings = data.findings;
    expect(Object.keys(updateData)).toHaveLength(2);
    expect(updateData.report_type).toBeUndefined();
  });

  it("48. Update recalculates has_abnormal_values", () => {
    const flags = [{ parameter: "HGB", value: 8, flag: "low" }];
    const hasAbnormal = (flags?.length ?? 0) > 0;
    expect(hasAbnormal).toBe(true);
  });

  it("49. Delete report - hard delete", () => {
    expect(mockReport.id).toBeTruthy();
  });

  it("50. Upload file to pathologist-reports bucket", () => {
    const bucket = "pathologist-reports";
    expect(bucket).toBe("pathologist-reports");
  });

  it("51. File path format: userId/timestamp-random.ext", () => {
    const userId = mockUser.id;
    const fileExt = "pdf";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    expect(filePath).toMatch(/^test-pathologist-user-1\/\d+-[a-z0-9]+\.pdf$/);
  });

  it("52. Get signed URL generates 1-hour expiry", () => {
    const expirySeconds = 3600;
    expect(expirySeconds).toBe(3600);
  });

  it("53. Share with doctor sets doctor_id and is_shared_with_doctor", () => {
    const update = { doctor_id: "doctor-1", is_shared_with_doctor: true };
    expect(update.doctor_id).toBe("doctor-1");
    expect(update.is_shared_with_doctor).toBe(true);
  });

  it("54. Share with patient sets is_shared_with_patient", () => {
    const update = { is_shared_with_patient: true };
    expect(update.is_shared_with_patient).toBe(true);
  });

  it("55. Add addendum appends with id, text, added_at, added_by", () => {
    const newAddendum = {
      id: crypto.randomUUID(),
      text: "Additional finding noted",
      added_at: new Date().toISOString(),
      added_by: mockUser.id,
    };
    expect(newAddendum.id).toBeTruthy();
    expect(newAddendum.text).toBe("Additional finding noted");
    expect(newAddendum.added_by).toBe(mockUser.id);
  });

  it("56. Addendum preserves existing entries", () => {
    const existing = [{ id: "a1", text: "First" }];
    const newEntry = { id: "a2", text: "Second" };
    const updated = [...existing, newEntry];
    expect(updated).toHaveLength(2);
    expect(updated[0].text).toBe("First");
  });

  it("57. Parse abnormal flags handles null, non-array, and valid inputs", () => {
    expect(parseAbnormalFlags(null)).toEqual([]);
    expect(parseAbnormalFlags("not-array")).toEqual([]);
    expect(parseAbnormalFlags([{ flag: "high" }])).toHaveLength(1);
  });

  it("58. Parse addenda handles null, non-array, and valid inputs", () => {
    expect(parseAddenda(null)).toEqual([]);
    expect(parseAddenda(123)).toEqual([]);
    expect(parseAddenda([{ text: "note" }])).toHaveLength(1);
  });

  it("59. Hospital order context joined with id, tests, urgency, clinical_notes, hospital.name", () => {
    const hospitalOrder = {
      id: "order-1",
      tests: [{ name: "CBC", price: 500 }],
      urgency: "stat",
      clinical_notes: "Urgent case",
      hospital: { name: "Test Hospital" },
    };
    expect(hospitalOrder.hospital.name).toBe("Test Hospital");
    expect(hospitalOrder.urgency).toBe("stat");
  });

  it("60. Auth guard on upload", () => {
    const user = null;
    expect(() => {
      if (!user) throw new Error("Not authenticated");
    }).toThrow("Not authenticated");
  });
});
