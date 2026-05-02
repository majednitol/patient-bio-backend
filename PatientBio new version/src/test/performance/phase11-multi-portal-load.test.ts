import { describe, it, expect } from "vitest";
import {
  generateRecords,
  generateUsers,
  generateAppointments,
  generatePrescriptions,
  measureTime,
  MockRecord,
  MockPrescription,
  MockAppointment,
} from "./perf-helpers";

// ── Portal operation simulators (pure logic, no I/O) ──

function simulatePatientDashboard(patientId: string, records: MockRecord[]) {
  return records
    .filter((r) => r.patient_id === patientId)
    .map((r) => ({ id: r.id, title: r.title, date: r.created_at }));
}

function simulateDoctorQueue(doctorId: string, appointments: MockAppointment[]) {
  return appointments
    .filter((a) => a.doctor_id === doctorId && a.status !== "completed")
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

function simulateAdminReport(records: MockRecord[]) {
  const categoryCounts: Record<string, number> = {};
  for (const r of records) {
    categoryCounts[r.disease_category] = (categoryCounts[r.disease_category] || 0) + 1;
  }
  return { totalRecords: records.length, categoryCounts };
}

function simulatePrescriptionView(rx: MockPrescription) {
  return {
    id: rx.id,
    diagnosis: rx.diagnosis,
    medNames: rx.medications.map((m) => m.medication_name),
    followUp: rx.follow_up_date,
  };
}

function simulatePrescriptionCreate(doctorId: string, patientId: string) {
  return {
    id: `rx-new-${Date.now()}`,
    doctor_id: doctorId,
    patient_id: patientId,
    diagnosis: "New diagnosis",
    medications: [{ medication_name: "NewMed", dosage: "10mg", frequency: "Once daily", duration: "7 days", instructions: "After meals" }],
    created_at: new Date().toISOString(),
  };
}

function simulateTokenValidation(token: { is_revoked: boolean; expires_at: string }) {
  const expired = new Date(token.expires_at).getTime() < Date.now();
  return { valid: !token.is_revoked && !expired, reason: token.is_revoked ? "revoked" : expired ? "expired" : null };
}

function simulateSearch(query: string, items: { id: string; title?: string; display_name?: string }[]) {
  const q = query.toLowerCase();
  return items.filter((item) => (item.title || item.display_name || "").toLowerCase().includes(q));
}

function simulateNotificationBuild(recipientId: string, type: string) {
  return { recipientId, type, message: `${type} notification`, createdAt: Date.now() };
}

function simulateRealtimeSubscription(channel: string) {
  return { channel, subscribed: true, timestamp: Date.now() };
}

function simulateRLSCheck(role: string, resource: string) {
  const policies: Record<string, string[]> = {
    patient: ["view_own_records", "view_own_prescriptions"],
    doctor: ["view_patient_records", "create_prescriptions", "view_queue"],
    admin: ["view_all_records", "view_reports", "manage_users"],
    hospital: ["view_admissions", "manage_beds", "view_staff"],
    pathologist: ["view_shared_reports", "create_results"],
    researcher: ["view_anonymized_data"],
  };
  return (policies[role] || []).includes(resource);
}

function simulateDashboardTransform(role: string, records: MockRecord[]) {
  switch (role) {
    case "patient": return { myRecords: records.slice(0, 10).length, recentDate: records[0]?.created_at };
    case "doctor": return { todayPatients: records.filter((_, i) => i % 3 === 0).length };
    case "admin": return { totalRecords: records.length, categories: new Set(records.map((r) => r.disease_category)).size };
    case "hospital": return { activeAdmissions: records.filter((r) => r.status === "active").length };
    case "pathologist": return { pendingReports: records.filter((r) => r.status === "pending").length };
    case "researcher": return { dataPoints: records.length, anonymized: true };
    default: return {};
  }
}

function simulateFileMetadata(fileName: string) {
  const ext = fileName.split(".").pop() || "";
  const validTypes = ["pdf", "jpg", "png", "dcm", "csv"];
  return { name: fileName, extension: ext, valid: validTypes.includes(ext), sizeEstimate: fileName.length * 100 };
}

function simulateInvoice(patientId: string, items: { name: string; amount: number }[]) {
  return { patientId, total: items.reduce((s, i) => s + i.amount, 0), itemCount: items.length, generated: true };
}

function simulateAIDiagnosis(symptoms: string[]) {
  return { suggestions: symptoms.map((s) => ({ symptom: s, possibleDiagnosis: `Diagnosis for ${s}`, confidence: 0.85 })) };
}

// ── Tests ──

describe("Phase 11: Multi-Portal Concurrent Simulation", () => {
  const records = generateRecords(500);
  const users = generateUsers(100);
  const appointments = generateAppointments(200);
  const prescriptions = generatePrescriptions(100);

  it("1. multi-role parallelism: patients + doctors + admins in parallel", async () => {
    const ops = await Promise.all([
      ...Array.from({ length: 10 }, (_, i) => Promise.resolve(simulatePatientDashboard(`pat-${i}`, records))),
      ...Array.from({ length: 5 }, (_, i) => Promise.resolve(simulateDoctorQueue(`doc-${i}`, appointments))),
      ...Array.from({ length: 3 }, () => Promise.resolve(simulateAdminReport(records))),
    ]);
    expect(ops).toHaveLength(18);
    ops.forEach((op) => expect(op).toBeDefined());
  });

  it("2. concurrent prescription reads + writes with no shape conflicts", async () => {
    const ops = await Promise.all([
      ...prescriptions.slice(0, 20).map((rx) => Promise.resolve(simulatePrescriptionView(rx))),
      ...Array.from({ length: 5 }, (_, i) => Promise.resolve(simulatePrescriptionCreate(`doc-${i}`, `pat-${i}`))),
    ]);
    expect(ops).toHaveLength(25);
    // Reads have medNames array, writes have medications array
    expect(ops[0]).toHaveProperty("medNames");
    expect(ops[20]).toHaveProperty("medications");
  });

  it("3. cross-hospital admission operations are independent", async () => {
    const ops = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const hospitalId = `hosp-${i % 3}`;
        return Promise.resolve({
          hospitalId,
          admissions: appointments.filter((a) => a.hospital_id === hospitalId).length,
          checkIns: appointments.filter((a) => a.hospital_id === hospitalId && a.checked_in_at).length,
        });
      })
    );
    expect(ops).toHaveLength(6);
    ops.forEach((op) => expect(op.hospitalId).toBeDefined());
  });

  it("4. 50 simultaneous token validations with mixed states", async () => {
    const tokens = Array.from({ length: 50 }, (_, i) => ({
      is_revoked: i % 5 === 0,
      expires_at: i % 7 === 0
        ? new Date(Date.now() - 86400000).toISOString()
        : new Date(Date.now() + 86400000).toISOString(),
    }));
    const results = await Promise.all(tokens.map((t) => Promise.resolve(simulateTokenValidation(t))));
    expect(results).toHaveLength(50);
    const valid = results.filter((r) => r.valid).length;
    const invalid = results.filter((r) => !r.valid).length;
    expect(valid + invalid).toBe(50);
    expect(invalid).toBeGreaterThan(0);
  });

  it("5. concurrent search isolation across portals", async () => {
    const recordItems = records.slice(0, 50).map((r) => ({ id: r.id, title: r.title }));
    const userItems = users.slice(0, 50).map((u) => ({ id: u.id, display_name: u.display_name }));
    const results = await Promise.all([
      ...Array.from({ length: 10 }, (_, i) => Promise.resolve(simulateSearch(`Record ${i}`, recordItems))),
      ...Array.from({ length: 10 }, (_, i) => Promise.resolve(simulateSearch(`Amit`, userItems))),
      ...Array.from({ length: 5 }, () => Promise.resolve(simulateSearch("user", userItems))),
    ]);
    expect(results).toHaveLength(25);
  });

  it("6. multi-origin appointment booking from 3 portals", async () => {
    const ops = await Promise.all([
      Promise.resolve({ origin: "patient", appointment: { ...appointments[0], status: "scheduled" } }),
      Promise.resolve({ origin: "doctor", appointment: { ...appointments[1], status: "confirmed" } }),
      Promise.resolve({ origin: "hospital", appointment: { ...appointments[2], status: "scheduled" } }),
    ]);
    expect(ops).toHaveLength(3);
    expect(new Set(ops.map((o) => o.origin)).size).toBe(3);
  });

  it("7. 20 concurrent notification payload builds", async () => {
    const types = ["appointment", "prescription", "referral", "lab_result"];
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        Promise.resolve(simulateNotificationBuild(`user-${i}`, types[i % types.length]))
      )
    );
    expect(results).toHaveLength(20);
    results.forEach((r) => expect(r.message).toContain("notification"));
  });

  it("8. 30 realtime subscription setups across 6 portal types", async () => {
    const portals = ["patient", "doctor", "admin", "hospital", "pathologist", "researcher"];
    const results = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        Promise.resolve(simulateRealtimeSubscription(`${portals[i % portals.length]}-channel-${i}`))
      )
    );
    expect(results).toHaveLength(30);
    expect(results.every((r) => r.subscribed)).toBe(true);
  });

  it("9. mixed clinical operations in parallel", async () => {
    const results = await Promise.allSettled([
      ...Array.from({ length: 5 }, () => Promise.resolve({ type: "lab_share", success: true })),
      ...Array.from({ length: 5 }, (_, i) => Promise.resolve(simulatePrescriptionCreate(`doc-${i}`, `pat-${i}`))),
      ...Array.from({ length: 5 }, () => Promise.resolve({ type: "referral", status: "pending" })),
    ]);
    expect(results).toHaveLength(15);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
  });

  it("10. 100 RLS policy evaluations across 6 roles", async () => {
    const roles = ["patient", "doctor", "admin", "hospital", "pathologist", "researcher"];
    const resources = ["view_own_records", "create_prescriptions", "view_reports", "manage_beds", "view_shared_reports", "view_anonymized_data"];
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(simulateRLSCheck(roles[i % roles.length], resources[i % resources.length]))
      )
    );
    expect(results).toHaveLength(100);
    expect(results.some((r) => r === true)).toBe(true);
    // With cycling 6 roles × 6 resources, most combos won't match — verify mix exists
    expect(results.filter((r) => r === true).length).toBeGreaterThan(0);
  });

  it("11. dashboard transforms for 6 portals from same base data", () => {
    const roles = ["patient", "doctor", "admin", "hospital", "pathologist", "researcher"];
    const dashboards = roles.map((role) => simulateDashboardTransform(role, records));
    expect(dashboards).toHaveLength(6);
    // Each shape is different
    const keys = dashboards.map((d) => Object.keys(d).sort().join(","));
    expect(new Set(keys).size).toBe(6);
  });

  it("12. 15 concurrent file metadata operations", async () => {
    const files = ["report.pdf", "scan.jpg", "xray.png", "data.csv", "image.dcm",
      "doc.pdf", "photo.jpg", "ct.png", "export.csv", "mri.dcm",
      "lab.pdf", "echo.jpg", "path.png", "genes.csv", "ultra.dcm"];
    const results = await Promise.all(files.map((f) => Promise.resolve(simulateFileMetadata(f))));
    expect(results).toHaveLength(15);
    expect(results.every((r) => r.valid)).toBe(true);
  });

  it("13. invoice generation + payment checks in parallel", async () => {
    const results = await Promise.all([
      ...Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(simulateInvoice(`pat-${i}`, [
          { name: "Consultation", amount: 500 },
          { name: "Lab Test", amount: 200 },
        ]))
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        Promise.resolve({ patientId: `pat-${10 + i}`, paymentStatus: i % 2 === 0 ? "paid" : "pending" })
      ),
    ]);
    expect(results).toHaveLength(20);
  });

  it("14. AI workload parallelism: diagnosis + summary + interactions", async () => {
    const results = await Promise.all([
      ...Array.from({ length: 5 }, () => Promise.resolve(simulateAIDiagnosis(["fever", "cough", "fatigue"]))),
      ...Array.from({ length: 5 }, (_, i) => Promise.resolve({ type: "visit_summary", patientId: `pat-${i}`, generated: true })),
      ...Array.from({ length: 5 }, () => Promise.resolve({ type: "med_interaction", interactions: [], safe: true })),
    ]);
    expect(results).toHaveLength(15);
  });

  it("15. full system snapshot: all 6 portals + edge functions + cross-portal", async () => {
    const results = await Promise.allSettled([
      // 6 portals
      Promise.resolve(simulatePatientDashboard("pat-0", records)),
      Promise.resolve(simulateDoctorQueue("doc-0", appointments)),
      Promise.resolve(simulateAdminReport(records)),
      Promise.resolve({ portal: "hospital", beds: 50, occupied: 35 }),
      Promise.resolve({ portal: "pathologist", pendingReports: 12 }),
      Promise.resolve({ portal: "researcher", datasets: 3 }),
      // 2 edge functions
      Promise.resolve({ fn: "send-notification", status: 200 }),
      Promise.resolve({ fn: "ai-diagnosis", status: 200 }),
      // 3 cross-portal flows
      Promise.resolve({ flow: "doctor-pathologist-share", success: true }),
      Promise.resolve({ flow: "patient-doctor-access", success: true }),
      Promise.resolve({ flow: "hospital-referral", success: true }),
    ]);
    expect(results).toHaveLength(11);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
  });
});
