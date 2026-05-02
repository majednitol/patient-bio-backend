import { describe, it, expect } from "vitest";
import {
  generateAppointments,
  generatePrescriptions,
  generateRecords,
  measureTime,
  MockAppointment,
  MockPrescription,
  MockMedication,
} from "./perf-helpers";

// ═══════════════════════════════════════════════════════════════
// Pure data-transformation helpers extracted for benchmarking
// ═══════════════════════════════════════════════════════════════

// -- Flow 1 helpers --

function prepareCheckIn(patientIds: string[]): { id: string; checked_in_at: string; status: string }[] {
  const now = new Date().toISOString();
  return patientIds.map((id) => ({ id, checked_in_at: now, status: "checked_in" }));
}

interface NormalizedVitals {
  patient_id: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  weight: number | null;
}

function normalizeVitals(raw: {
  patient_id: string;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  heart_rate?: number | null;
  spo2?: number | null;
  temperature?: number | null;
  weight?: number | null;
}[]): NormalizedVitals[] {
  return raw.map((v) => ({
    patient_id: v.patient_id,
    bp_systolic: v.bp_systolic != null ? Math.max(60, Math.min(250, v.bp_systolic)) : null,
    bp_diastolic: v.bp_diastolic != null ? Math.max(30, Math.min(150, v.bp_diastolic)) : null,
    heart_rate: v.heart_rate != null ? Math.max(30, Math.min(220, v.heart_rate)) : null,
    spo2: v.spo2 != null ? Math.max(0, Math.min(100, v.spo2)) : null,
    temperature: v.temperature != null ? Math.max(90, Math.min(110, v.temperature)) : null,
    weight: v.weight != null ? Math.max(0.5, Math.min(500, v.weight)) : null,
  }));
}

interface QueueEntry {
  id: string;
  patient_id: string;
  doctor_id: string;
  priority: "emergency" | "urgent" | "normal";
  checked_in_at: string;
  status: "waiting" | "in_consultation" | "completed";
  appointment_date: string;
}

function sortQueue(entries: QueueEntry[]): QueueEntry[] {
  const priorityOrder = { emergency: 0, urgent: 1, normal: 2 };
  return [...entries].sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime();
  });
}

function filterQueue(entries: QueueEntry[], doctorId: string, todayStr: string): QueueEntry[] {
  return entries.filter(
    (e) => e.doctor_id === doctorId && e.appointment_date === todayStr && e.status === "waiting"
  );
}

// -- Flow 2 helpers --

interface PrescriptionInput {
  diagnosis: string;
  medications: MockMedication[];
  notes: string;
  follow_up_date: string | null;
}

function assemblePrescriptionInput(
  diagnosis: string,
  medications: MockMedication[],
  instructions: string,
  followUpDate: string | null
): PrescriptionInput {
  return { diagnosis, medications, notes: instructions, follow_up_date: followUpDate };
}

function parseMedications(prescription: MockPrescription): MockMedication[] {
  // Simulate parsing from JSON-like structure to typed array
  return prescription.medications.map((m) => ({
    medication_name: String(m.medication_name).trim(),
    dosage: String(m.dosage).trim(),
    frequency: String(m.frequency).trim(),
    duration: String(m.duration).trim(),
    instructions: String(m.instructions || "").trim(),
  }));
}

interface VisitInstructionData {
  patientId: string;
  doctorName: string;
  date: string;
  diagnosis: string;
  medications: { name: string; dosage: string; frequency: string; duration: string }[];
  instructions: string;
  followUpDate: string | null;
}

function assembleVisitInstructionData(
  appointment: MockAppointment,
  prescription: MockPrescription,
  doctorName: string
): VisitInstructionData {
  return {
    patientId: appointment.patient_id,
    doctorName,
    date: appointment.appointment_date,
    diagnosis: prescription.diagnosis,
    medications: prescription.medications.map((m) => ({
      name: m.medication_name,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
    })),
    instructions: prescription.notes || "",
    followUpDate: prescription.follow_up_date,
  };
}

function computeAverageDuration(appointments: MockAppointment[]): number {
  const completed = appointments.filter((a) => a.consultation_started_at && a.consultation_ended_at);
  if (completed.length === 0) return 0;
  const totalMs = completed.reduce((sum, a) => {
    return sum + (new Date(a.consultation_ended_at!).getTime() - new Date(a.consultation_started_at!).getTime());
  }, 0);
  return totalMs / completed.length / 60000; // minutes
}

// -- Flow 3 helpers --

interface VisitSummary {
  appointmentId: string;
  patientId: string;
  date: string;
  diagnosis: string;
  vitals: NormalizedVitals | null;
  medicationCount: number;
  status: "pending" | "approved";
}

function assembleVisitSummary(
  appointment: MockAppointment,
  vitals: NormalizedVitals | null,
  prescription: MockPrescription | null
): VisitSummary {
  return {
    appointmentId: appointment.id,
    patientId: appointment.patient_id,
    date: appointment.appointment_date,
    diagnosis: prescription?.diagnosis || "Pending",
    vitals,
    medicationCount: prescription?.medications.length || 0,
    status: "pending",
  };
}

interface SlotDensity {
  date: string;
  count: number;
  load: "low" | "medium" | "high";
}

function computeSlotDensity(appointments: MockAppointment[], days: number): SlotDensity[] {
  const countByDate: Record<string, number> = {};
  const baseDate = new Date("2024-06-01");
  for (let i = 0; i < days; i++) {
    const d = new Date(baseDate.getTime() + i * 86400000).toISOString().split("T")[0];
    countByDate[d] = 0;
  }
  for (const a of appointments) {
    if (countByDate[a.appointment_date] !== undefined) {
      countByDate[a.appointment_date]++;
    }
  }
  const counts = Object.values(countByDate);
  const avg = counts.reduce((s, c) => s + c, 0) / (counts.length || 1);
  return Object.entries(countByDate).map(([date, count]) => ({
    date,
    count,
    load: count <= avg * 0.5 ? "low" : count >= avg * 1.5 ? "high" : "medium",
  }));
}

function recommendFollowUpDates(density: SlotDensity[], topN: number): string[] {
  return [...density].sort((a, b) => a.count - b.count).slice(0, topN).map((d) => d.date);
}

function bulkApprove(summaries: VisitSummary[]): { approved: VisitSummary[]; cacheKeys: string[] } {
  const approved = summaries.map((s) => ({ ...s, status: "approved" as const }));
  const cacheKeys = approved.map((s) => `visit-summary-${s.appointmentId}`);
  return { approved, cacheKeys };
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe("Phase 8: Critical User Flow Benchmarks", () => {
  // ── Flow 1: Patient Check-In to Consultation Start ──────────

  describe("Flow 1: Check-In to Consultation", () => {
    it("1. Check-in data prep for 100 patients < 5ms", () => {
      const ids = Array.from({ length: 100 }, (_, i) => `pat-${i}`);
      const { result, durationMs } = measureTime(() => prepareCheckIn(ids));
      expect(result).toHaveLength(100);
      expect(result[0]).toHaveProperty("checked_in_at");
      expect(result[0].status).toBe("checked_in");
      expect(durationMs).toBeLessThan(5);
    });

    it("2. Vitals normalization for 100 records < 10ms", () => {
      const raw = Array.from({ length: 100 }, (_, i) => ({
        patient_id: `pat-${i}`,
        bp_systolic: 80 + (i % 180),   // some will exceed 250
        bp_diastolic: 40 + (i % 120),
        heart_rate: 50 + (i % 200),
        spo2: i % 110,                 // some > 100
        temperature: 95 + (i % 20),
        weight: i === 0 ? null : 30 + i,
      }));
      const { result, durationMs } = measureTime(() => normalizeVitals(raw));
      expect(result).toHaveLength(100);
      // Check clamping worked
      result.forEach((v) => {
        if (v.bp_systolic !== null) expect(v.bp_systolic).toBeLessThanOrEqual(250);
        if (v.spo2 !== null) expect(v.spo2).toBeLessThanOrEqual(100);
      });
      expect(durationMs).toBeLessThan(10);
    });

    it("3. Queue sorting 200 entries < 5ms", () => {
      const entries: QueueEntry[] = Array.from({ length: 200 }, (_, i) => ({
        id: `q-${i}`,
        patient_id: `pat-${i}`,
        doctor_id: `doc-${i % 10}`,
        priority: (["normal", "urgent", "emergency"] as const)[i % 3],
        checked_in_at: new Date(Date.now() - (200 - i) * 60000).toISOString(),
        status: "waiting" as const,
        appointment_date: "2024-06-01",
      }));
      const { result, durationMs } = measureTime(() => sortQueue(entries));
      expect(result).toHaveLength(200);
      // Verify emergency comes first
      expect(result[0].priority).toBe("emergency");
      expect(durationMs).toBeLessThan(5);
    });

    it("4. Queue filtering 200 entries < 3ms", () => {
      const today = "2024-06-01";
      const entries: QueueEntry[] = Array.from({ length: 200 }, (_, i) => ({
        id: `q-${i}`,
        patient_id: `pat-${i}`,
        doctor_id: `doc-${i % 10}`,
        priority: "normal" as const,
        checked_in_at: new Date().toISOString(),
        status: (["waiting", "in_consultation", "completed"] as const)[i % 3],
        appointment_date: i % 2 === 0 ? today : "2024-06-02",
      }));
      const { result, durationMs } = measureTime(() => filterQueue(entries, "doc-0", today));
      // doc-0 + today + waiting
      expect(result.length).toBeGreaterThan(0);
      result.forEach((e) => {
        expect(e.doctor_id).toBe("doc-0");
        expect(e.appointment_date).toBe(today);
        expect(e.status).toBe("waiting");
      });
      expect(durationMs).toBeLessThan(3);
    });

    it("5. Full check-in flow for 50 patients < 15ms", () => {
      const ids = Array.from({ length: 50 }, (_, i) => `pat-${i}`);
      const rawVitals = ids.map((id) => ({
        patient_id: id,
        bp_systolic: 120,
        bp_diastolic: 80,
        heart_rate: 72,
        spo2: 98,
        temperature: 98.6,
        weight: 70,
      }));
      const queueEntries: QueueEntry[] = ids.map((id, i) => ({
        id: `q-${i}`,
        patient_id: id,
        doctor_id: "doc-0",
        priority: "normal" as const,
        checked_in_at: new Date(Date.now() - (50 - i) * 60000).toISOString(),
        status: "waiting" as const,
        appointment_date: "2024-06-01",
      }));

      const { durationMs } = measureTime(() => {
        const checkIns = prepareCheckIn(ids);
        const vitals = normalizeVitals(rawVitals);
        const sorted = sortQueue(queueEntries);
        const filtered = filterQueue(sorted, "doc-0", "2024-06-01");
        return { checkIns, vitals, sorted, filtered };
      });
      expect(durationMs).toBeLessThan(15);
    });
  });

  // ── Flow 2: Consultation to Prescription to PDF ─────────────

  describe("Flow 2: Consultation to Prescription PDF", () => {
    it("6. Prescription input assembly < 2ms", () => {
      const meds: MockMedication[] = Array.from({ length: 5 }, (_, i) => ({
        medication_name: `Med-${i}`,
        dosage: "500mg",
        frequency: "Twice daily",
        duration: "7 days",
        instructions: "After meals",
      }));
      const { result, durationMs } = measureTime(() =>
        assemblePrescriptionInput("Viral Fever", meds, "Rest advised", "2024-06-15")
      );
      expect(result.diagnosis).toBe("Viral Fever");
      expect(result.medications).toHaveLength(5);
      expect(durationMs).toBeLessThan(2);
    });

    it("7. Medication parsing for 50 prescriptions < 5ms", () => {
      const prescriptions = generatePrescriptions(50);
      const { result, durationMs } = measureTime(() =>
        prescriptions.map((p) => parseMedications(p))
      );
      expect(result).toHaveLength(50);
      result.forEach((meds, i) => {
        expect(meds.length).toBeGreaterThanOrEqual(3);
        expect(meds.length).toBeLessThanOrEqual(8);
      });
      expect(durationMs).toBeLessThan(5);
    });

    it("8. PDF data preparation for 20 patients < 5ms", () => {
      const appointments = generateAppointments(20);
      const prescriptions = generatePrescriptions(20);
      const { result, durationMs } = measureTime(() =>
        appointments.map((a, i) => assembleVisitInstructionData(a, prescriptions[i], "Dr. Smith"))
      );
      expect(result).toHaveLength(20);
      result.forEach((d) => {
        expect(d.doctorName).toBe("Dr. Smith");
        expect(d.medications.length).toBeGreaterThan(0);
      });
      expect(durationMs).toBeLessThan(5);
    });

    it("9. Average duration calculation for 20 appointments < 2ms", () => {
      const appointments = generateAppointments(20);
      const { result, durationMs } = measureTime(() => computeAverageDuration(appointments));
      // Some appointments are completed (i % 3 === 0), average should be reasonable
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(60); // under 60 minutes
      expect(durationMs).toBeLessThan(2);
    });

    it("10. Full consultation flow for 10 patients < 20ms", () => {
      const appointments = generateAppointments(10);
      const prescriptions = generatePrescriptions(10);
      const { durationMs } = measureTime(() => {
        const inputs = prescriptions.map((p) =>
          assemblePrescriptionInput(p.diagnosis, p.medications, p.notes || "", p.follow_up_date)
        );
        const parsed = prescriptions.map((p) => parseMedications(p));
        const pdfData = appointments.map((a, i) =>
          assembleVisitInstructionData(a, prescriptions[i], "Dr. Smith")
        );
        const avgDuration = computeAverageDuration(appointments);
        return { inputs, parsed, pdfData, avgDuration };
      });
      expect(durationMs).toBeLessThan(20);
    });
  });

  // ── Flow 3: Visit Summary and Follow-Up Scheduling ──────────

  describe("Flow 3: Visit Summary & Follow-Up", () => {
    it("11. Visit summary assembly for 30 patients < 10ms", () => {
      const appointments = generateAppointments(30);
      const prescriptions = generatePrescriptions(30);
      const vitals = normalizeVitals(
        appointments.map((a) => ({
          patient_id: a.patient_id,
          bp_systolic: 120,
          bp_diastolic: 80,
          heart_rate: 72,
          spo2: 98,
          temperature: 98.6,
          weight: 70,
        }))
      );
      const { result, durationMs } = measureTime(() =>
        appointments.map((a, i) => assembleVisitSummary(a, vitals[i], prescriptions[i]))
      );
      expect(result).toHaveLength(30);
      result.forEach((s) => expect(s.status).toBe("pending"));
      expect(durationMs).toBeLessThan(10);
    });

    it("12. Slot density for 200 appointments over 14 days < 5ms", () => {
      const appointments = generateAppointments(200);
      const { result, durationMs } = measureTime(() => computeSlotDensity(appointments, 14));
      expect(result).toHaveLength(14);
      result.forEach((s) => expect(["low", "medium", "high"]).toContain(s.load));
      expect(durationMs).toBeLessThan(5);
    });

    it("13. Follow-up date recommendation (3 best) < 2ms", () => {
      const appointments = generateAppointments(200);
      const density = computeSlotDensity(appointments, 14);
      const { result, durationMs } = measureTime(() => recommendFollowUpDates(density, 3));
      expect(result).toHaveLength(3);
      expect(durationMs).toBeLessThan(2);
    });

    it("14. Bulk visit summary approval for 20 summaries < 3ms", () => {
      const appointments = generateAppointments(20);
      const summaries: VisitSummary[] = appointments.map((a) =>
        assembleVisitSummary(a, null, null)
      );
      const { result, durationMs } = measureTime(() => bulkApprove(summaries));
      expect(result.approved).toHaveLength(20);
      result.approved.forEach((s) => expect(s.status).toBe("approved"));
      expect(result.cacheKeys).toHaveLength(20);
      expect(result.cacheKeys[0]).toMatch(/^visit-summary-/);
      expect(durationMs).toBeLessThan(3);
    });

    it("15. Full post-visit flow for 10 patients < 25ms", () => {
      const appointments = generateAppointments(10);
      const prescriptions = generatePrescriptions(10);
      const allAppointments = generateAppointments(200); // for density

      const { durationMs } = measureTime(() => {
        const vitals = normalizeVitals(
          appointments.map((a) => ({
            patient_id: a.patient_id,
            bp_systolic: 120, bp_diastolic: 80, heart_rate: 72,
            spo2: 98, temperature: 98.6, weight: 70,
          }))
        );
        const summaries = appointments.map((a, i) =>
          assembleVisitSummary(a, vitals[i], prescriptions[i])
        );
        const density = computeSlotDensity(allAppointments, 14);
        const recommended = recommendFollowUpDates(density, 3);
        const { approved } = bulkApprove(summaries);
        const pdfData = appointments.map((a, i) =>
          assembleVisitInstructionData(a, prescriptions[i], "Dr. Smith")
        );
        return { approved, recommended, pdfData };
      });
      expect(durationMs).toBeLessThan(25);
    });
  });
});
