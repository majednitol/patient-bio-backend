import { describe, it, expect } from "vitest";
import { makeUser, simulateRLS } from "./security-helpers";

describe("Phase 1: RLS Logic Simulation", () => {
  const patientA = makeUser("user", { id: "patient-a" });
  const patientB = makeUser("user", { id: "patient-b" });
  const doctorWithAccess = makeUser("doctor", { id: "doctor-1" });
  const doctorNoAccess = makeUser("doctor", { id: "doctor-2" });
  const pathA = makeUser("pathologist", { id: "path-a" });
  const pathB = makeUser("pathologist", { id: "path-b" });
  const researcher = makeUser("researcher", { id: "researcher-1" });
  const hospitalAdminA = makeUser("hospital_admin", { id: "hadmin-a", hospitalId: "hosp-a" });
  const hospitalStaffB = makeUser("hospital_admin", { id: "hadmin-b", hospitalId: "hosp-b" });
  const admin = makeUser("admin", { id: "admin-1" });

  const ctx = {
    doctorAccessMap: { "doctor-1": ["patient-a"] },
    pathologistReports: { "report-1": "path-a", "report-2": "path-b" },
    approvedSharing: [{ patientId: "patient-a", requesterId: "researcher-1", requesterType: "researcher" }],
    hospitalStaff: [{ userId: "hadmin-a", hospitalId: "hosp-a" }],
  };

  it("1. Patient can SELECT own health_records", () => {
    const r = simulateRLS("health_records", "SELECT", "patient-a", { ...ctx, userId: patientA.id, role: patientA.role });
    expect(r.allowed).toBe(true);
  });

  it("2. Patient cannot SELECT another patient's records", () => {
    const r = simulateRLS("health_records", "SELECT", "patient-b", { ...ctx, userId: patientA.id, role: patientA.role });
    expect(r.allowed).toBe(false);
  });

  it("3. Doctor can SELECT patient records with active access", () => {
    const r = simulateRLS("health_records", "SELECT", "patient-a", { ...ctx, userId: doctorWithAccess.id, role: doctorWithAccess.role });
    expect(r.allowed).toBe(true);
  });

  it("4. Doctor without access denied patient records", () => {
    const r = simulateRLS("health_records", "SELECT", "patient-a", { ...ctx, userId: doctorNoAccess.id, role: doctorNoAccess.role });
    expect(r.allowed).toBe(false);
  });

  it("5. Pathologist can SELECT reports they created", () => {
    const r = simulateRLS("pathologist_reports", "SELECT", "report-1", { ...ctx, userId: pathA.id, role: pathA.role });
    expect(r.allowed).toBe(true);
  });

  it("6. Pathologist cannot SELECT another pathologist's reports", () => {
    const r = simulateRLS("pathologist_reports", "SELECT", "report-1", { ...ctx, userId: pathB.id, role: pathB.role });
    expect(r.allowed).toBe(false);
  });

  it("7. Researcher can only SELECT approved shared data", () => {
    const r = simulateRLS("health_records", "SELECT", "patient-a", { ...ctx, userId: researcher.id, role: researcher.role });
    expect(r.allowed).toBe(true);
    const r2 = simulateRLS("health_records", "SELECT", "patient-b", { ...ctx, userId: researcher.id, role: researcher.role });
    expect(r2.allowed).toBe(false);
  });

  it("8. Hospital admin can SELECT records for their hospital only", () => {
    const r = simulateRLS("health_records", "SELECT", "patient-a", { ...ctx, userId: hospitalAdminA.id, role: hospitalAdminA.role, hospitalId: "hosp-a" });
    expect(r.allowed).toBe(true);
  });

  it("9. Hospital staff from hospital A cannot access hospital B data", () => {
    const r = simulateRLS("health_records", "SELECT", "patient-a", { ...ctx, userId: hospitalStaffB.id, role: hospitalStaffB.role, hospitalId: "hosp-b" });
    expect(r.allowed).toBe(false);
  });

  it("10. Anonymous user denied all table access", () => {
    const r = simulateRLS("health_records", "SELECT", "patient-a", { ...ctx, userId: "", role: "user" });
    expect(r.allowed).toBe(false);
  });

  it("11. Patient can INSERT own health_records", () => {
    const r = simulateRLS("health_records", "INSERT", "patient-a", { ...ctx, userId: patientA.id, role: patientA.role });
    expect(r.allowed).toBe(true);
  });

  it("12. Patient cannot INSERT records for another patient", () => {
    const r = simulateRLS("health_records", "INSERT", "patient-b", { ...ctx, userId: patientA.id, role: patientA.role });
    expect(r.allowed).toBe(false);
  });

  it("13. Doctor can UPDATE only own profile", () => {
    const r = simulateRLS("doctor_profiles", "UPDATE", "doctor-1", { ...ctx, userId: doctorWithAccess.id, role: doctorWithAccess.role });
    expect(r.allowed).toBe(true);
    const r2 = simulateRLS("doctor_profiles", "UPDATE", "doctor-2", { ...ctx, userId: doctorWithAccess.id, role: doctorWithAccess.role });
    expect(r2.allowed).toBe(false);
  });

  it("14. Patient can DELETE own access_tokens", () => {
    const r = simulateRLS("access_tokens", "DELETE", "patient-a", { ...ctx, userId: patientA.id, role: patientA.role });
    expect(r.allowed).toBe(true);
    const r2 = simulateRLS("access_tokens", "DELETE", "patient-b", { ...ctx, userId: patientA.id, role: patientA.role });
    expect(r2.allowed).toBe(false);
  });

  it("15. Admin role can SELECT from all portals' data", () => {
    const r = simulateRLS("health_records", "SELECT", "patient-a", { ...ctx, userId: admin.id, role: admin.role });
    expect(r.allowed).toBe(true);
  });
});
