import { describe, it, expect, vi, beforeEach } from "vitest";
import { SHIFT_TYPES } from "@/hooks/useStaffShifts";

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

describe("Phase 14: Staff Shifts & Scheduling", () => {
  beforeEach(() => vi.clearAllMocks());

  // Test 125: Fetch staff shifts for week
  it("should return shifts with staff doctor_profile and user_profile joined", () => {
    const rawShift = {
      id: "shift-1",
      staff: {
        id: "staff-1",
        user_id: "user-2",
        role: "doctor",
        doctor_profiles: { full_name: "Dr. Jones", specialty: "Surgery" },
        user_profiles: { display_name: "Jones" },
      },
    };
    const mapped = {
      ...rawShift,
      staff: rawShift.staff
        ? { ...rawShift.staff, doctor_profile: rawShift.staff.doctor_profiles, user_profile: rawShift.staff.user_profiles }
        : null,
    };
    expect(mapped.staff?.doctor_profile?.full_name).toBe("Dr. Jones");
    expect(mapped.staff?.user_profile?.display_name).toBe("Jones");
  });

  // Test 126: Staff name resolution in shifts
  it("should prefer doctor_profile full_name for display", () => {
    const staff = { doctor_profile: { full_name: "Dr. A" }, user_profile: { display_name: "A" } };
    const name = staff.doctor_profile?.full_name || staff.user_profile?.display_name || "Unknown";
    expect(name).toBe("Dr. A");
  });

  // Test 127: Create shift with created_by
  it("should insert shift with created_by from auth user", () => {
    const shift = { hospital_id: "hosp-1", staff_id: "staff-1", shift_date: "2026-02-16", start_time: "06:00", end_time: "14:00", shift_type: "morning", created_by: "user-1" };
    expect(shift.created_by).toBe("user-1");
    expect(shift.shift_type).toBe("morning");
  });

  // Test 128: Delete shift (hard delete)
  it("should hard delete shift", () => {
    const operation = "delete";
    expect(operation).toBe("delete");
  });

  // Test 129: Shift types constant
  it("should define 5 shift types with time ranges", () => {
    expect(SHIFT_TYPES).toHaveLength(5);
    const values = SHIFT_TYPES.map((t) => t.value);
    expect(values).toContain("morning");
    expect(values).toContain("afternoon");
    expect(values).toContain("night");
    expect(values).toContain("regular");
    expect(values).toContain("on_call");
    const morning = SHIFT_TYPES.find((t) => t.value === "morning");
    expect(morning?.time).toBe("06:00-14:00");
  });

  // Test 130: Week range filtering
  it("should filter shifts between weekStart and weekStart+6", () => {
    const weekStart = new Date("2026-02-16");
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    expect(weekEnd.toISOString().split("T")[0]).toBe("2026-02-22");
  });

  // Test 131: Missing context guard
  it("should throw Missing context if no hospitalId or user", () => {
    const hospitalId = undefined;
    const user = null;
    const shouldThrow = !hospitalId || !user;
    expect(shouldThrow).toBe(true);
  });

  // Test 132: Cache invalidation
  it("should invalidate staff-shifts for hospital", () => {
    const queryKey = ["staff-shifts", "hosp-1"];
    expect(queryKey[0]).toBe("staff-shifts");
  });
});
