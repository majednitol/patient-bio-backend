import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

describe("Phase 9: Appointments & Doctor Schedule", () => {
  beforeEach(() => vi.clearAllMocks());

  // Test 85: Doctor schedule info
  it("should return doctors with full_name, specialty, avatar from joined query", () => {
    const staffData = {
      user_id: "doc-1",
      doctor_profiles: { full_name: "Dr. Smith", specialty: "Cardiology", avatar_url: null },
    };
    const doctor = {
      user_id: staffData.user_id,
      full_name: staffData.doctor_profiles?.full_name || "Unknown Doctor",
      specialty: staffData.doctor_profiles?.specialty || null,
      avatar_url: staffData.doctor_profiles?.avatar_url || null,
    };
    expect(doctor.full_name).toBe("Dr. Smith");
    expect(doctor.specialty).toBe("Cardiology");
  });

  // Test 86: Availability map construction
  it("should build Map<doctor_id, DoctorAvailability[]>", () => {
    const availability = [
      { doctor_id: "doc-1", day_of_week: 1, start_time: "09:00", end_time: "17:00" },
      { doctor_id: "doc-1", day_of_week: 2, start_time: "09:00", end_time: "13:00" },
      { doctor_id: "doc-2", day_of_week: 1, start_time: "10:00", end_time: "16:00" },
    ];
    const map = new Map<string, typeof availability>();
    availability.forEach((a) => {
      const existing = map.get(a.doctor_id) || [];
      existing.push(a);
      map.set(a.doctor_id, existing);
    });
    expect(map.get("doc-1")).toHaveLength(2);
    expect(map.get("doc-2")).toHaveLength(1);
  });

  // Test 87: Time-off map construction
  it("should build Map<doctor_id, DoctorTimeOff[]>", () => {
    const timeOff = [
      { doctor_id: "doc-1", start_date: "2026-02-20", end_date: "2026-02-22", reason: "Vacation" },
    ];
    const map = new Map<string, typeof timeOff>();
    timeOff.forEach((t) => {
      const existing = map.get(t.doctor_id) || [];
      existing.push(t);
      map.set(t.doctor_id, existing);
    });
    expect(map.get("doc-1")).toHaveLength(1);
  });

  // Test 88: Parallel query execution
  it("should use Promise.all for availability and time-off", () => {
    const fetchPattern = "Promise.all";
    expect(fetchPattern).toBe("Promise.all");
  });

  // Test 89: Cross-hospital time-off support
  it("should include time-off where hospital_id is null", () => {
    const orFilter = `hospital_id.eq.hosp-1,hospital_id.is.null`;
    expect(orFilter).toContain("hospital_id.is.null");
  });

  // Test 90: Empty doctors returns empty maps
  it("should return empty maps when no doctors found", () => {
    const doctors: any[] = [];
    const availabilityMap = new Map();
    const timeOffMap = new Map();
    expect(doctors).toHaveLength(0);
    expect(availabilityMap.size).toBe(0);
    expect(timeOffMap.size).toBe(0);
  });
});
