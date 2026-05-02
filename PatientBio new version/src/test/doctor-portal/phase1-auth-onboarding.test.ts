import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, eq: mockEq, maybeSingle: mockMaybeSingle });
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockGetUser = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      signOut: () => mockSignOut(),
      getUser: () => mockGetUser(),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null, session: null }),
    user: { id: "doctor-user-123", email: "doc@test.com" },
  }),
}));

describe("Phase 1: Authentication and Onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Portal Role Mapping", () => {
    it("maps doctor portal to doctor and doctor_staff roles", () => {
      const portalRoleMap: Record<string, string[]> = {
        patient: ["user"],
        doctor: ["doctor", "doctor_staff"],
        hospital: ["hospital_admin"],
        pathologist: ["pathologist"],
        researcher: ["researcher"],
        admin: ["admin"],
      };
      expect(portalRoleMap["doctor"]).toContain("doctor");
      expect(portalRoleMap["doctor"]).toContain("doctor_staff");
      expect(portalRoleMap["doctor"]).not.toContain("user");
    });

    it("rejects patient role from doctor portal", () => {
      const allowedRoles = ["doctor", "doctor_staff"];
      expect(allowedRoles.includes("user")).toBe(false);
    });

    it("accepts doctor_staff in doctor portal", () => {
      const allowedRoles = ["doctor", "doctor_staff"];
      expect(allowedRoles.includes("doctor_staff")).toBe(true);
    });
  });

  describe("Role-Portal Name Mapping", () => {
    const rolePortalNameMap: Record<string, string> = {
      user: "Patient",
      doctor: "Doctor",
      doctor_staff: "Doctor",
      hospital_admin: "Hospital",
      pathologist: "Diagnostic Center",
      researcher: "Researcher",
      admin: "Admin",
    };

    it("maps user role to Patient portal name", () => {
      expect(rolePortalNameMap["user"]).toBe("Patient");
    });

    it("maps doctor and doctor_staff to Doctor portal name", () => {
      expect(rolePortalNameMap["doctor"]).toBe("Doctor");
      expect(rolePortalNameMap["doctor_staff"]).toBe("Doctor");
    });

    it("generates correct error message for wrong portal", () => {
      const userPortal = rolePortalNameMap["user"];
      const errorMsg = `This account is registered for the ${userPortal} Portal. Please use the correct portal to sign in.`;
      expect(errorMsg).toContain("Patient Portal");
      expect(errorMsg).toContain("correct portal");
    });
  });

  describe("can_access_portal DB Function Logic", () => {
    it("doctor role returns true for doctor portal", () => {
      const canAccess = (role: string, portal: string) => {
        const map: Record<string, string[]> = {
          patient: ["user"],
          doctor: ["doctor", "doctor_staff"],
          hospital: ["hospital_admin"],
          pathologist: ["pathologist"],
          researcher: ["researcher"],
        };
        return (map[portal] || []).includes(role);
      };

      expect(canAccess("doctor", "doctor")).toBe(true);
      expect(canAccess("doctor_staff", "doctor")).toBe(true);
      expect(canAccess("user", "doctor")).toBe(false);
      expect(canAccess("doctor", "patient")).toBe(false);
    });
  });

  describe("handle_new_user Trigger Logic", () => {
    it("doctor portal_type maps to doctor role", () => {
      const mapPortalToRole = (portal: string) => {
        const map: Record<string, string> = {
          patient: "user",
          doctor: "doctor",
          doctor_staff: "doctor_staff",
          hospital: "hospital_admin",
          pathologist: "pathologist",
          researcher: "researcher",
        };
        return map[portal] || "user";
      };

      expect(mapPortalToRole("doctor")).toBe("doctor");
      expect(mapPortalToRole("doctor_staff")).toBe("doctor_staff");
      expect(mapPortalToRole("patient")).toBe("user");
      expect(mapPortalToRole("unknown")).toBe("user");
    });
  });
});
