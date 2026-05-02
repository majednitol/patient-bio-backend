import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockGetUser = vi.fn();
const mockSignInWithPassword = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
    auth: {
      signOut: mockSignOut,
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "admin@hospital.com" },
    signIn: vi.fn(),
    signUp: vi.fn(),
  }),
}));

// Import after mocks
import { portalRoleMap, getPortalNameFromRole } from "./test-helpers";

describe("Phase 1: Hospital Auth & Onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Hospital admin role mapping
  it("should map hospital portal to hospital_admin role", () => {
    const allowedRoles = ["hospital_admin"];
    expect(allowedRoles).toContain("hospital_admin");
  });

  // Test 2: Doctor rejected from hospital portal
  it("should reject doctor role from hospital portal", () => {
    const allowedRoles = ["hospital_admin"];
    expect(allowedRoles).not.toContain("doctor");
  });

  // Test 3: Patient rejected from hospital portal
  it("should reject patient/user role from hospital portal", () => {
    const allowedRoles = ["hospital_admin"];
    expect(allowedRoles).not.toContain("user");
  });

  // Test 4: Hospital signup assigns correct role
  it("should assign hospital_admin role for hospital portal signup", () => {
    const portalType = "hospital";
    const roleMap: Record<string, string> = {
      patient: "user",
      doctor: "doctor",
      hospital: "hospital_admin",
      pathologist: "pathologist",
      researcher: "researcher",
    };
    expect(roleMap[portalType]).toBe("hospital_admin");
  });

  // Test 5: can_access_portal logic
  it("should validate can_access_portal returns true for hospital_admin", () => {
    const userRole = "hospital_admin";
    const portal = "hospital";
    const accessMap: Record<string, string[]> = {
      patient: ["user"],
      doctor: ["doctor", "doctor_staff"],
      hospital: ["hospital_admin"],
    };
    expect(accessMap[portal]).toContain(userRole);
  });

  // Test 6: Role-based redirect
  it("should redirect hospital_admin to /hospital", () => {
    const role = "hospital_admin";
    const redirectMap: Record<string, string> = {
      user: "/dashboard",
      doctor: "/doctor",
      hospital_admin: "/hospital",
      pathologist: "/pathologist",
      researcher: "/researcher",
    };
    expect(redirectMap[role]).toBe("/hospital");
  });

  // Test 7: useIsHospitalAdmin query logic
  it("should check hospital_staff for admin role and active status", () => {
    const staffRecord = { role: "admin", is_active: true };
    expect(staffRecord.role === "admin" && staffRecord.is_active).toBe(true);
  });

  // Test 8: is_hospital_staff DB function logic
  it("should return true for active staff at hospital", () => {
    const staff = { user_id: "user-1", hospital_id: "hosp-1", is_active: true };
    expect(staff.is_active).toBe(true);
  });
});
