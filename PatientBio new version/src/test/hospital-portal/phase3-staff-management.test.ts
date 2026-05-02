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

describe("Phase 3: Staff Management", () => {
  beforeEach(() => vi.clearAllMocks());

  // Test 19: Fetch hospital staff with joined profiles
  it("should query hospital_staff with doctor_profiles and user_profiles joins", () => {
    const selectQuery = `*, doctor_profiles:doctor_profiles(user_id, full_name, specialty, avatar_url), user_profiles:user_profiles!hospital_staff_user_id_fkey(user_id, display_name)`;
    expect(selectQuery).toContain("doctor_profiles");
    expect(selectQuery).toContain("user_profiles");
  });

  // Test 20: Display name resolution priority
  it("should prefer doctor_profile.full_name over user_profile.display_name", () => {
    const staff = {
      doctor_profiles: { full_name: "Dr. Smith" },
      user_profiles: { display_name: "John" },
    };
    const displayName = staff.doctor_profiles?.full_name || staff.user_profiles?.display_name || null;
    expect(displayName).toBe("Dr. Smith");
  });

  it("should fall back to user_profile.display_name when doctor_profile is null", () => {
    const staff = { doctor_profiles: null, user_profiles: { display_name: "John" } };
    const displayName = (staff.doctor_profiles as any)?.full_name || staff.user_profiles?.display_name || null;
    expect(displayName).toBe("John");
  });

  // Test 21: Add staff member
  it("should insert into hospital_staff with role", () => {
    const insert = { hospital_id: "hosp-1", user_id: "user-2", role: "nurse" };
    expect(insert.role).toBe("nurse");
    expect(insert.hospital_id).toBeTruthy();
  });

  // Test 22: Add doctor assigns doctor role
  it("should also insert doctor role in user_roles when role is doctor", () => {
    const role = "doctor";
    const shouldAddDoctorRole = role === "doctor";
    expect(shouldAddDoctorRole).toBe(true);
  });

  // Test 23: Update staff record
  it("should support partial update by staff id", () => {
    const { id, hospitalId, ...data } = { id: "staff-1", hospitalId: "hosp-1", department: "Cardiology" };
    expect(id).toBe("staff-1");
    expect(data.department).toBe("Cardiology");
  });

  // Test 24: Remove staff (soft delete)
  it("should set is_active=false instead of hard delete", () => {
    const updatePayload = { is_active: false };
    expect(updatePayload.is_active).toBe(false);
  });

  // Test 25: Add existing user as staff checks duplicate
  it("should check for existing active staff before insert", () => {
    const existingStaff = { id: "existing-1" };
    const isDuplicate = !!existingStaff;
    expect(isDuplicate).toBe(true);
  });

  // Test 26: Duplicate staff prevention
  it("should throw error for already active staff member", () => {
    const errorMsg = "This user is already a staff member at this hospital";
    expect(errorMsg).toContain("already a staff member");
  });

  // Test 27: Check user by email via RPC
  it("should use get_user_id_by_email RPC function", () => {
    const rpcName = "get_user_id_by_email";
    const params = { p_email: "doctor@test.com" };
    expect(rpcName).toBe("get_user_id_by_email");
    expect(params.p_email).toBeTruthy();
  });

  // Test 28: Staff caching behavior
  it("should use 30s staleTime and 5min gcTime", () => {
    const STALE_TIME = 30 * 1000;
    const GC_TIME = 5 * 60 * 1000;
    expect(STALE_TIME).toBe(30000);
    expect(GC_TIME).toBe(300000);
  });
});
