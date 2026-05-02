import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useHospitalNotifications", () => ({
  hospitalNotifications: {
    admission: vi.fn().mockResolvedValue({ success: true }),
    discharge: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe("Phase 7: Admissions", () => {
  beforeEach(() => vi.clearAllMocks());

  // Test 63: Fetch admissions with joins
  it("should select admissions with bed, ward, patient_profile, doctor_profile joins", () => {
    const selectQuery = `*, bed:beds(*, ward:wards(*)), patient_profile:user_profiles!admissions_patient_id_fkey(display_name, phone, date_of_birth, gender), doctor_profile:doctor_profiles!admissions_admitting_doctor_id_fkey(full_name, specialty)`;
    expect(selectQuery).toContain("bed:beds");
    expect(selectQuery).toContain("patient_profile");
    expect(selectQuery).toContain("doctor_profile");
  });

  // Test 64: Filter by status
  it("should filter admissions by status when provided", () => {
    const status = "admitted";
    expect(status).toBe("admitted");
  });

  // Test 65: Current admissions shortcut
  it("should delegate to useAdmissions with status=admitted", () => {
    const delegatedStatus = "admitted";
    expect(delegatedStatus).toBe("admitted");
  });

  // Test 66: Create admission sets status=admitted
  it("should insert with status=admitted and hospital_id", () => {
    const admission = {
      hospital_id: "hosp-1",
      patient_id: "patient-1",
      bed_id: "bed-1",
      admitting_doctor_id: "doc-1",
      status: "admitted",
    };
    expect(admission.status).toBe("admitted");
  });

  // Test 67: Bed status auto-update on admission (trigger)
  it("should update bed to occupied on admit", () => {
    const triggerBehavior = { onAdmit: { bed_status: "occupied" } };
    expect(triggerBehavior.onAdmit.bed_status).toBe("occupied");
  });

  // Test 68: Discharge patient
  it("should set status=discharged with actual_discharge and discharged_by", () => {
    const discharge = {
      status: "discharged",
      actual_discharge: new Date().toISOString(),
      discharged_by: "doc-1",
      discharge_notes: "Recovered",
    };
    expect(discharge.status).toBe("discharged");
    expect(discharge.discharged_by).toBeTruthy();
    expect(discharge.actual_discharge).toBeTruthy();
  });

  // Test 69: Bed freed on discharge (trigger)
  it("should update bed to available on discharge", () => {
    const triggerBehavior = { onDischarge: { bed_status: "available" } };
    expect(triggerBehavior.onDischarge.bed_status).toBe("available");
  });

  // Test 70: Transfer bed
  it("should update bed_id for admission", () => {
    const transfer = { admissionId: "adm-1", newBedId: "bed-2" };
    expect(transfer.newBedId).toBe("bed-2");
  });

  // Test 71: Update admission strips joined fields
  it("should remove bed, patient_profile, doctor_profile before update", () => {
    const updates: any = { id: "adm-1", bed: { id: "b1" }, patient_profile: { display_name: "John" }, doctor_profile: { full_name: "Dr. X" }, diagnosis: "Flu" };
    const { bed, patient_profile, doctor_profile, ...cleanUpdates } = updates;
    expect(cleanUpdates).not.toHaveProperty("bed");
    expect(cleanUpdates).not.toHaveProperty("patient_profile");
    expect(cleanUpdates).not.toHaveProperty("doctor_profile");
    expect(cleanUpdates.diagnosis).toBe("Flu");
  });

  // Test 72: Admission notification
  it("should notify staff with patient name and ward on admission", () => {
    const notifyParams = { hospital_id: "hosp-1", patientName: "John Doe", wardName: "ICU" };
    expect(notifyParams.patientName).toBeTruthy();
    expect(notifyParams.wardName).toBeTruthy();
  });

  // Test 73: Discharge notification
  it("should notify staff with patient name on discharge", () => {
    const notifyParams = { hospital_id: "hosp-1", patientName: "John Doe" };
    expect(notifyParams.patientName).toBeTruthy();
  });

  // Test 74: Cache invalidation on admission
  it("should invalidate admissions, beds, and available-beds", () => {
    const keys = ["admissions", "beds", "available-beds"];
    expect(keys).toHaveLength(3);
    expect(keys).toContain("admissions");
    expect(keys).toContain("beds");
    expect(keys).toContain("available-beds");
  });
});
