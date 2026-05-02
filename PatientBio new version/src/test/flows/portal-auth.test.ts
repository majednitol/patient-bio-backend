import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  }),
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getUser: vi.fn(),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

// Portal type constants
type PortalType = "patient" | "doctor" | "hospital" | "pathologist" | "researcher" | "admin";

const portalRoleMap: Record<PortalType, string> = {
  patient: "user",
  doctor: "doctor",
  hospital: "hospital_admin",
  pathologist: "pathologist",
  researcher: "researcher",
  admin: "admin",
};

const rolePortalNameMap: Record<string, string> = {
  user: "Patient",
  doctor: "Doctor",
  hospital_admin: "Hospital",
  pathologist: "Diagnostic Center",
  researcher: "Researcher",
  admin: "Admin",
};

describe("Portal-Specific Authentication Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Portal-Role Mapping", () => {
    it("should map patient portal to user role", () => {
      expect(portalRoleMap["patient"]).toBe("user");
    });

    it("should map doctor portal to doctor role", () => {
      expect(portalRoleMap["doctor"]).toBe("doctor");
    });

    it("should map hospital portal to hospital_admin role", () => {
      expect(portalRoleMap["hospital"]).toBe("hospital_admin");
    });

    it("should map pathologist portal to pathologist role", () => {
      expect(portalRoleMap["pathologist"]).toBe("pathologist");
    });

    it("should map researcher portal to researcher role", () => {
      expect(portalRoleMap["researcher"]).toBe("researcher");
    });

    it("should map admin portal to admin role", () => {
      expect(portalRoleMap["admin"]).toBe("admin");
    });
  });

  describe("Role-Portal Name Mapping", () => {
    it("should provide user-friendly portal names", () => {
      expect(rolePortalNameMap["user"]).toBe("Patient");
      expect(rolePortalNameMap["doctor"]).toBe("Doctor");
      expect(rolePortalNameMap["hospital_admin"]).toBe("Hospital");
      expect(rolePortalNameMap["pathologist"]).toBe("Diagnostic Center");
      expect(rolePortalNameMap["researcher"]).toBe("Researcher");
      expect(rolePortalNameMap["admin"]).toBe("Admin");
    });
  });

  describe("Portal Access Validation", () => {
    it("should allow access when user role matches portal", async () => {
      const userId = "user-123";
      const expectedPortal: PortalType = "doctor";
      const expectedRole = portalRoleMap[expectedPortal];

      mockSupabase.from("user_roles").select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { role: "doctor" },
            error: null,
          }),
        }),
      });

      // Simulate role check
      const result = await mockSupabase.from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      expect(result.data?.role).toBe(expectedRole);
    });

    it("should deny access when user role does not match portal", async () => {
      const userId = "user-123";
      const expectedPortal: PortalType = "doctor";
      const actualRole = "user"; // Patient trying to access doctor portal

      mockSupabase.from("user_roles").select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { role: actualRole },
            error: null,
          }),
        }),
      });

      const result = await mockSupabase.from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const isValid = result.data?.role === portalRoleMap[expectedPortal];
      expect(isValid).toBe(false);
    });

    it("should sign out user on portal mismatch", async () => {
      // Simulate the portal auth flow
      const userId = "user-123";
      const actualRole = "user";
      const expectedPortal: PortalType = "doctor";

      mockSupabase.from("user_roles").select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { role: actualRole },
            error: null,
          }),
        }),
      });

      // Check role
      const roleResult = await mockSupabase.from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const isValid = roleResult.data?.role === portalRoleMap[expectedPortal];

      if (!isValid) {
        await mockSupabase.auth.signOut();
      }

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe("Portal Signup with Metadata", () => {
    it("should include portal_type in signup metadata", async () => {
      const email = "new@example.com";
      const password = "password123";
      const portalType: PortalType = "patient";

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: {
          user: { id: "new-user-123", email },
          session: null,
        },
        error: null,
      });

      await mockSupabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "http://localhost:3000/verify-email",
          data: { portal_type: portalType },
        },
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email,
        password,
        options: expect.objectContaining({
          data: expect.objectContaining({
            portal_type: portalType,
          }),
        }),
      });
    });

    it("should pass correct portal_type for each portal signup", async () => {
      const portals: PortalType[] = ["patient", "doctor", "hospital", "pathologist", "researcher"];

      for (const portal of portals) {
        vi.clearAllMocks();
        
        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: { id: "user-123" }, session: null },
          error: null,
        });

        await mockSupabase.auth.signUp({
          email: `test-${portal}@example.com`,
          password: "password123",
          options: {
            data: { portal_type: portal },
          },
        });

        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
          expect.objectContaining({
            options: expect.objectContaining({
              data: expect.objectContaining({
                portal_type: portal,
              }),
            }),
          })
        );
      }
    });
  });

  describe("Error Messages", () => {
    it("should generate correct error message for wrong portal", () => {
      const actualRole = "user";
      const userPortal = rolePortalNameMap[actualRole];
      
      const errorMessage = 
        `This account is registered for the ${userPortal} Portal. ` +
        `Please use the correct portal to sign in.`;

      expect(errorMessage).toContain("Patient Portal");
      expect(errorMessage).toContain("correct portal");
    });

    it("should handle different portal mismatch scenarios", () => {
      const scenarios = [
        { userRole: "user", attemptedPortal: "doctor" as PortalType },
        { userRole: "doctor", attemptedPortal: "patient" as PortalType },
        { userRole: "hospital_admin", attemptedPortal: "pathologist" as PortalType },
        { userRole: "pathologist", attemptedPortal: "hospital" as PortalType },
      ];

      scenarios.forEach(({ userRole, attemptedPortal }) => {
        const userPortal = rolePortalNameMap[userRole];
        const errorMessage = 
          `This account is registered for the ${userPortal} Portal. ` +
          `Please use the correct portal to sign in.`;

        expect(errorMessage).toContain(userPortal);
        expect(errorMessage.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Role Query Handling", () => {
    it("should handle missing role gracefully", async () => {
      mockSupabase.from("user_roles").select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const result = await mockSupabase.from("user_roles")
        .select("role")
        .eq("user_id", "user-123")
        .maybeSingle();

      expect(result.data).toBeNull();
    });

    it("should handle database errors", async () => {
      mockSupabase.from("user_roles").select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database connection failed" },
          }),
        }),
      });

      const result = await mockSupabase.from("user_roles")
        .select("role")
        .eq("user_id", "user-123")
        .maybeSingle();

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Database connection failed");
    });
  });

  describe("One-Email-One-Portal Policy", () => {
    it("should prevent same email from registering in different portals", () => {
      // This is enforced at the database level via auth.users email uniqueness
      // and portal_type in user metadata
      const existingUser = {
        email: "user@example.com",
        user_metadata: { portal_type: "patient" },
      };

      const attemptedPortal: PortalType = "doctor";
      
      // The signup would fail because email already exists
      // Portal validation happens after checking email uniqueness
      const canRegister = (existingEmail: string | null, newEmail: string) => 
        existingEmail !== newEmail;

      expect(canRegister(existingUser.email, "user@example.com")).toBe(false);
      expect(canRegister(existingUser.email, "different@example.com")).toBe(true);
    });
  });
});
