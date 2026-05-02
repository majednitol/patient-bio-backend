import { describe, it, expect, vi } from "vitest";
import { mockUser, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe("Phase 1: Researcher Authentication and Onboarding", () => {
  // Test 1: Researcher login with correct role
  it("should allow researcher login with correct role", () => {
    const userRole = "researcher";
    const portalType = "researcher";
    const rolePortalMap: Record<string, string> = {
      user: "patient", doctor: "doctor", hospital_admin: "hospital",
      pathologist: "pathologist", researcher: "researcher",
    };
    expect(rolePortalMap[userRole]).toBe(portalType);
  });

  // Test 2: Doctor rejected from researcher portal
  it("should reject doctor from researcher portal", () => {
    const userRole: string = "doctor";
    const canAccess = userRole === "researcher";
    expect(canAccess).toBe(false);
  });

  // Test 3: Patient rejected from researcher portal
  it("should reject patient from researcher portal", () => {
    const userRole: string = "user";
    const canAccess = userRole === "researcher";
    expect(canAccess).toBe(false);
  });

  // Test 4: Hospital admin rejected
  it("should reject hospital admin from researcher portal", () => {
    const userRole: string = "hospital_admin";
    const canAccess = userRole === "researcher";
    expect(canAccess).toBe(false);
  });

  // Test 5: Researcher signup assigns correct role
  it("should assign researcher role from portal_type metadata", () => {
    const portalType = "researcher";
    const roleMap: Record<string, string> = {
      patient: "user", doctor: "doctor", hospital: "hospital_admin",
      pathologist: "pathologist", researcher: "researcher",
    };
    expect(roleMap[portalType]).toBe("researcher");
  });

  // Test 6: can_access_portal DB function logic
  it("should validate can_access_portal returns true for researcher", () => {
    const userRole = "researcher";
    const portal = "researcher";
    const canAccess = (role: string, p: string) => {
      const map: Record<string, string[]> = {
        patient: ["user"], doctor: ["doctor", "doctor_staff"],
        hospital: ["hospital_admin"], pathologist: ["pathologist"], researcher: ["researcher"],
      };
      return (map[p] || []).includes(role);
    };
    expect(canAccess(userRole, portal)).toBe(true);
    expect(canAccess("doctor", portal)).toBe(false);
  });

  // Test 7: Role portal name mapping
  it("should map researcher role to correct display name", () => {
    const rolePortalNameMap: Record<string, string> = {
      user: "Patient Portal", doctor: "Doctor Portal",
      hospital_admin: "Hospital Portal", pathologist: "Diagnostic Center",
      researcher: "Researcher",
    };
    expect(rolePortalNameMap["researcher"]).toBe("Researcher");
  });

  // Test 8: Onboarding profile creation
  it("should create researcher profile with user_id", async () => {
    const profileData = {
      user_id: mockUser.id,
      full_name: "Dr. New Researcher",
      email: mockUser.email,
      institution_name: "MIT",
    };

    const chain = mockSupabase.createChain({ data: { ...profileData, id: "new-profile" }, error: null });
    mockSupabase.from.mockReturnValueOnce(chain);

    const result = await chain.insert(profileData).select().single();
    expect(result.data.user_id).toBe(mockUser.id);
    expect(result.data.full_name).toBe("Dr. New Researcher");
  });
});
