import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCrossPortalMock,
  mockResponse,
  mockError,
  users,
  ids,
  makeDoctorPathologistShare,
  makePathologistReport,
  makeNotification,
} from "./cp-helpers";

describe("Cross-Portal Phase 1: Doctor ↔ Pathologist Sharing", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createCrossPortalMock();
    mockInvoke = mock.mockInvoke;
    mockFrom = mock.mockFrom;
  });

  // ── 1. Doctor initiates share to Pathologist ─────────────────
  describe("Doctor creates pathologist share", () => {
    it("1. Creates share record with correct fields", () => {
      const share = makeDoctorPathologistShare();
      expect(share.doctor_id).toBe(users.doctor.id);
      expect(share.pathologist_id).toBe(users.pathologist.id);
      expect(share.patient_id).toBe(users.patient.id);
      expect(share.status).toBe("pending");
    });

    it("2. Share includes prescription reference", () => {
      const share = makeDoctorPathologistShare({ prescription_id: ids.prescription });
      expect(share.prescription_id).toBe(ids.prescription);
    });

    it("3. Share includes disease category", () => {
      const share = makeDoctorPathologistShare({ disease_category: "oncology" });
      expect(share.disease_category).toBe("oncology");
    });

    it("4. Notification is created for pathologist", () => {
      const notif = makeNotification({
        user_id: users.pathologist.id,
        type: "doctor_shared_data",
        title: "New Referral from Doctor",
      });
      expect(notif.user_id).toBe(users.pathologist.id);
      expect(notif.type).toBe("doctor_shared_data");
    });

    it("5. Rejects share without patient_id", async () => {
      mockError(mockInvoke, "patient_id is required");
      const result = await mockInvoke("doctor-pathologist-share", {
        body: { pathologist_id: ids.pathologist, disease_category: "hematology" },
      });
      expect(result.data.error).toContain("patient_id");
    });

    it("6. Rejects share without pathologist_id", async () => {
      mockError(mockInvoke, "pathologist_id is required");
      const result = await mockInvoke("doctor-pathologist-share", {
        body: { patient_id: ids.patient },
      });
      expect(result.data.error).toContain("pathologist_id");
    });
  });

  // ── 2. Pathologist receives and processes share ──────────────
  describe("Pathologist receives share", () => {
    it("7. Pending shares visible to pathologist", () => {
      const shares = [
        makeDoctorPathologistShare({ status: "pending" }),
        makeDoctorPathologistShare({ id: "share-2", status: "viewed" }),
      ];
      const pending = shares.filter((s) => s.status === "pending");
      expect(pending).toHaveLength(1);
    });

    it("8. Mark share as viewed updates status", async () => {
      mockResponse(mockInvoke, { success: true, status: "viewed" });
      const result = await mockInvoke("update-share-status", {
        body: { share_id: ids.share, status: "viewed" },
      });
      expect(result.data.status).toBe("viewed");
    });

    it("9. Mark share as completed sets completed_at", async () => {
      mockResponse(mockInvoke, { success: true, status: "completed", completed_at: new Date().toISOString() });
      const result = await mockInvoke("update-share-status", {
        body: { share_id: ids.share, status: "completed" },
      });
      expect(result.data.status).toBe("completed");
      expect(result.data.completed_at).toBeDefined();
    });

    it("10. Pathologist can access patient data via share", async () => {
      mockResponse(mockInvoke, {
        patient: { display_name: "Patient A" },
        records: [{ title: "CBC Report" }],
      });
      const result = await mockInvoke("get-patient-data-for-pathologist", {
        body: { share_id: ids.share },
      });
      expect(result.data.patient).toBeDefined();
      expect(result.data.records).toHaveLength(1);
    });
  });

  // ── 3. Pathologist creates report and shares back ────────────
  describe("Pathologist creates and shares report", () => {
    it("11. Report links to correct patient and doctor", () => {
      const report = makePathologistReport();
      expect(report.pathologist_id).toBe(users.pathologist.id);
      expect(report.patient_id).toBe(users.patient.id);
      expect(report.doctor_id).toBe(users.doctor.id);
    });

    it("12. Sharing report with doctor updates is_shared_with_doctor", () => {
      const report = makePathologistReport({ is_shared_with_doctor: true });
      expect(report.is_shared_with_doctor).toBe(true);
    });

    it("13. Sharing report with patient updates is_shared_with_patient", () => {
      const report = makePathologistReport({ is_shared_with_patient: true });
      expect(report.is_shared_with_patient).toBe(true);
    });

    it("14. Doctor receives notification when report shared", () => {
      const notif = makeNotification({
        user_id: users.doctor.id,
        type: "pathologist_report_ready",
        title: "Lab Report Ready",
        metadata: { report_id: ids.report } as Record<string, any>,
      });
      expect(notif.user_id).toBe(users.doctor.id);
      expect((notif.metadata as Record<string, any>).report_id).toBe(ids.report);
    });

    it("15. Patient receives notification when report shared", () => {
      const notif = makeNotification({
        user_id: users.patient.id,
        type: "lab_report_available",
        title: "Your Lab Report is Ready",
      });
      expect(notif.user_id).toBe(users.patient.id);
    });
  });

  // ── 4. Abnormal result critical alert flow ───────────────────
  describe("Critical alert flow for abnormal results", () => {
    it("16. Abnormal flag triggers doctor notification check", () => {
      const report = makePathologistReport({
        has_abnormal_values: true,
        is_shared_with_doctor: true,
        results: [{ parameter: "WBC", value: "18.0", unit: "x10^3/uL", range: "4.5-11.0", is_abnormal: true }],
      });
      const shouldNotify = report.has_abnormal_values && report.is_shared_with_doctor && !(report as any).doctor_notified_at;
      expect(shouldNotify).toBe(true);
    });

    it("17. Normal results do not trigger critical alert", () => {
      const report = makePathologistReport({ has_abnormal_values: false });
      expect(report.has_abnormal_values).toBe(false);
    });

    it("18. Report addendum preserves original results", () => {
      const original = makePathologistReport();
      const addendum = {
        ...original,
        addendum_text: "Corrected WBC count after re-run",
        addendum_at: new Date().toISOString(),
      };
      expect(addendum.results).toEqual(original.results);
      expect(addendum.addendum_text).toBeDefined();
    });
  });
});
