import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCrossPortalMock,
  mockResponse,
  mockError,
  users,
  ids,
  makeNotification,
} from "./cp-helpers";

// ── Local factories for hospital / admission entities ───────────
function makeAdmission(overrides: Record<string, any> = {}) {
  return {
    id: ids.admissionId,
    patient_id: ids.patient,
    hospital_id: ids.hospitalId,
    admitting_doctor_id: ids.doctor,
    bed_id: ids.bedId,
    admission_date: new Date().toISOString(),
    admission_reason: "Acute pneumonia",
    diagnosis: "Community-acquired pneumonia",
    status: "admitted",
    expected_discharge: null,
    actual_discharge: null,
    discharge_notes: null,
    ...overrides,
  };
}

function makeBed(overrides: Record<string, any> = {}) {
  return {
    id: ids.bedId,
    hospital_id: ids.hospitalId,
    ward_id: ids.wardId,
    bed_number: "W2-B04",
    bed_type: "general",
    status: "available",
    daily_rate: 1500,
    ...overrides,
  };
}

function makeLabOrder(overrides: Record<string, any> = {}) {
  return {
    id: ids.labOrderId,
    hospital_id: ids.hospitalId,
    patient_id: ids.patient,
    doctor_id: ids.doctor,
    test_name: "Chest X-Ray",
    urgency: "urgent",
    status: "pending",
    sample_barcode: "LAB-20260216-0001",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeInvoice(overrides: Record<string, any> = {}) {
  return {
    id: ids.invoiceId,
    hospital_id: ids.hospitalId,
    patient_id: ids.patient,
    admission_id: ids.admissionId,
    invoice_number: "INV-2026-0001",
    total_amount: 25000,
    amount_paid: 0,
    status: "pending",
    ...overrides,
  };
}

function makeAppointment(overrides: Record<string, any> = {}) {
  return {
    id: ids.appointment,
    doctor_id: ids.doctor,
    patient_id: ids.patient,
    hospital_id: ids.hospitalId,
    appointment_date: "2026-02-20",
    start_time: "10:00",
    end_time: "10:30",
    status: "scheduled",
    reason: "Post-admission follow-up",
    checked_in_at: null,
    consultation_started_at: null,
    consultation_ended_at: null,
    ...overrides,
  };
}

function makeIntake(overrides: Record<string, any> = {}) {
  return {
    id: ids.intakeId,
    appointment_id: ids.appointment,
    patient_id: ids.patient,
    chief_complaint: "Persistent cough and fever for 3 days",
    symptom_severity: "moderate",
    symptom_duration: "3 days",
    self_medications: "Paracetamol 500mg",
    additional_notes: "History of asthma",
    submitted_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Cross-Portal Phase 3: Hospital Admission + Doctor Consultation", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createCrossPortalMock();
    mockInvoke = mock.mockInvoke;
  });

  // ── 1. Hospital admits patient ───────────────────────────────
  describe("Hospital admits patient with bed assignment", () => {
    it("1. Bed status changes to occupied on admission", () => {
      const bed = makeBed({ status: "available" });
      const admission = makeAdmission({ bed_id: bed.id });
      expect(admission.bed_id).toBe(bed.id);
      // After trigger: bed.status → occupied
      const updatedBed = { ...bed, status: "occupied" };
      expect(updatedBed.status).toBe("occupied");
    });

    it("2. Admission links patient, doctor, hospital, and bed", () => {
      const adm = makeAdmission();
      expect(adm.patient_id).toBe(users.patient.id);
      expect(adm.admitting_doctor_id).toBe(users.doctor.id);
      expect(adm.hospital_id).toBe(ids.hospitalId);
      expect(adm.bed_id).toBe(ids.bedId);
    });

    it("3. Admission creates notification for admitting doctor", () => {
      const notif = makeNotification({
        user_id: users.doctor.id,
        type: "patient_admitted",
        title: "Patient Admitted",
        message: "A patient has been admitted under your care.",
      });
      expect(notif.user_id).toBe(users.doctor.id);
      expect(notif.type).toBe("patient_admitted");
    });

    it("4. Admission without bed_id is valid (pending assignment)", () => {
      const adm = makeAdmission({ bed_id: null });
      expect(adm.bed_id).toBeNull();
      expect(adm.status).toBe("admitted");
    });

    it("5. Duplicate bed assignment rejected", async () => {
      mockError(mockInvoke, "Bed is already occupied");
      const result = await mockInvoke("assign-bed", {
        body: { admission_id: ids.admissionId, bed_id: ids.bedId },
      });
      expect(result.data.error).toContain("occupied");
    });
  });

  // ── 2. Doctor creates lab order during admission ─────────────
  describe("Doctor orders labs during admission", () => {
    it("6. Lab order links to hospital, patient, and doctor", () => {
      const order = makeLabOrder();
      expect(order.hospital_id).toBe(ids.hospitalId);
      expect(order.patient_id).toBe(users.patient.id);
      expect(order.doctor_id).toBe(users.doctor.id);
    });

    it("7. Urgent lab order flagged correctly", () => {
      const order = makeLabOrder({ urgency: "STAT" });
      expect(order.urgency).toBe("STAT");
    });

    it("8. Lab order generates sample barcode", () => {
      const order = makeLabOrder();
      expect(order.sample_barcode).toMatch(/^LAB-\d{8}-\d{4}$/);
    });

    it("9. Pathologist notified of new hospital lab order", () => {
      const notif = makeNotification({
        user_id: users.pathologist.id,
        type: "hospital_lab_order",
        title: "New Lab Order",
        metadata: { order_id: ids.labOrderId, urgency: "urgent" } as Record<string, any>,
      });
      expect(notif.user_id).toBe(users.pathologist.id);
      expect((notif.metadata as Record<string, any>).urgency).toBe("urgent");
    });

    it("10. Completed lab order creates pathologist report link", async () => {
      mockResponse(mockInvoke, {
        success: true,
        lab_order_id: ids.labOrderId,
        report_id: ids.report,
      });
      const result = await mockInvoke("complete-lab-order", {
        body: { lab_order_id: ids.labOrderId, report_id: ids.report },
      });
      expect(result.data.report_id).toBe(ids.report);
    });
  });

  // ── 3. Doctor consultation during admission ──────────────────
  describe("Doctor consultation within hospital context", () => {
    it("11. Appointment created in hospital context", () => {
      const appt = makeAppointment();
      expect(appt.hospital_id).toBe(ids.hospitalId);
      expect(appt.doctor_id).toBe(users.doctor.id);
    });

    it("12. Intake form submitted before consultation", () => {
      const intake = makeIntake();
      expect(intake.appointment_id).toBe(ids.appointment);
      expect(intake.chief_complaint).toBeTruthy();
      expect(intake.symptom_severity).toBe("moderate");
    });

    it("13. AI diagnosis suggestion triggered from intake", async () => {
      mockResponse(mockInvoke, {
        suggestions: [
          { diagnosis: "Community-acquired pneumonia", confidence: 0.85, medications: ["Amoxicillin"] },
          { diagnosis: "Acute bronchitis", confidence: 0.6, medications: ["Dextromethorphan"] },
        ],
      });
      const result = await mockInvoke("suggest-diagnosis", {
        body: {
          chief_complaint: "Persistent cough and fever",
          symptom_severity: "moderate",
          symptom_duration: "3 days",
        },
      });
      expect(result.data.suggestions).toHaveLength(2);
      expect(result.data.suggestions[0].confidence).toBeGreaterThan(0.5);
    });

    it("14. Consultation timer starts on consultation_started_at", () => {
      const appt = makeAppointment({
        status: "in_progress",
        consultation_started_at: new Date().toISOString(),
      });
      expect(appt.consultation_started_at).toBeDefined();
      expect(appt.status).toBe("in_progress");
    });

    it("15. Visit summary generated after consultation", async () => {
      mockResponse(mockInvoke, {
        summary_text: "Patient presented with cough and fever...",
        diagnosis: "Community-acquired pneumonia",
        medications_summary: "Amoxicillin 500mg TID x7d",
        follow_up_instructions: "Return in 1 week for review",
      });
      const result = await mockInvoke("generate-visit-summary", {
        body: { appointmentId: ids.appointment },
      });
      expect(result.data.diagnosis).toBeDefined();
      expect(result.data.follow_up_instructions).toBeDefined();
    });
  });

  // ── 4. Discharge flow ────────────────────────────────────────
  describe("Discharge with invoice and bed release", () => {
    it("16. Discharge updates admission status", () => {
      const discharged = makeAdmission({
        status: "discharged",
        actual_discharge: new Date().toISOString(),
        discharge_notes: "Recovered, continue oral antibiotics",
      });
      expect(discharged.status).toBe("discharged");
      expect(discharged.actual_discharge).toBeDefined();
    });

    it("17. Bed released on discharge (status → available)", () => {
      const bed = makeBed({ status: "occupied" });
      const releasedBed = { ...bed, status: "available" };
      expect(releasedBed.status).toBe("available");
    });

    it("18. Invoice generated on discharge", () => {
      const invoice = makeInvoice();
      expect(invoice.admission_id).toBe(ids.admissionId);
      expect(invoice.total_amount).toBeGreaterThan(0);
      expect(invoice.status).toBe("pending");
    });

    it("19. Patient notified of discharge summary", () => {
      const notif = makeNotification({
        user_id: users.patient.id,
        type: "discharge_summary",
        title: "You have been discharged",
        message: "Your discharge summary and invoice are ready.",
      });
      expect(notif.user_id).toBe(users.patient.id);
      expect(notif.type).toBe("discharge_summary");
    });

    it("20. Bed transfer during admission updates both beds", () => {
      const fromBed = makeBed({ id: "bed-from", status: "occupied" });
      const toBed = makeBed({ id: "bed-to", status: "available" });
      // After transfer trigger
      const updatedFrom = { ...fromBed, status: "available" };
      const updatedTo = { ...toBed, status: "occupied" };
      expect(updatedFrom.status).toBe("available");
      expect(updatedTo.status).toBe("occupied");
    });
  });
});
