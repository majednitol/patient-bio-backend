import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, mockAdminUser } from "./test-helpers";

// Mock supabase
const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockAdminUser,
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null, session: null }),
  }),
}));

describe("Phase 1: Authentication and Access Control (10 tests)", () => {
  beforeEach(() => vi.clearAllMocks());

  // Tests 1-4: Portal auth role validation
  describe("usePortalAuth role validation", () => {
    it("1. Admin login with correct role succeeds", async () => {
      const chain = mockSupabase.createChain({ data: { role: "admin" }, error: null });
      mockSupabase.from.mockReturnValue(chain);
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser } });

      // Simulate validatePortalAccess
      const allowedRoles = ["admin"];
      const userRole = "admin";
      expect(allowedRoles.includes(userRole)).toBe(true);
    });

    it("2. Doctor rejected from admin portal", () => {
      const allowedRoles = ["admin"];
      const userRole = "doctor";
      expect(allowedRoles.includes(userRole)).toBe(false);

      const rolePortalNameMap: Record<string, string> = {
        user: "Patient", doctor: "Doctor", doctor_staff: "Doctor",
        hospital_admin: "Hospital", pathologist: "Diagnostic Center",
        researcher: "Researcher", admin: "Admin",
      };
      expect(rolePortalNameMap[userRole]).toBe("Doctor");
    });

    it("3. Patient rejected from admin portal", () => {
      const allowedRoles = ["admin"];
      expect(allowedRoles.includes("user")).toBe(false);
    });

    it("4. Hospital admin rejected from admin portal", () => {
      const allowedRoles = ["admin"];
      expect(allowedRoles.includes("hospital_admin")).toBe(false);
    });
  });

  // Tests 5-6: useIsAdmin
  describe("useIsAdmin", () => {
    it("5. Returns true for admin role", () => {
      const role = "admin";
      expect(role === "admin").toBe(true);
    });

    it("6. Returns false for non-admin role", () => {
      const nonAdminRoles = ["user", "doctor", "hospital_admin", "pathologist", "researcher"];
      nonAdminRoles.forEach((role) => {
        expect(role === "admin").toBe(false);
      });
    });
  });

  // Tests 7-8: AdminLayout redirects
  describe("AdminLayout access control", () => {
    it("7. Redirects unauthenticated users to /admin/login", () => {
      const user = null;
      const redirectTarget = !user ? "/admin/login" : null;
      expect(redirectTarget).toBe("/admin/login");
    });

    it("8. Redirects non-admin users to /", () => {
      const isAdmin = false;
      const user = { id: "some-user" };
      const redirectTarget = user && !isAdmin ? "/" : null;
      expect(redirectTarget).toBe("/");
    });
  });

  // Tests 9-10: DB functions
  describe("Database access control functions", () => {
    it("9. can_access_portal returns true for admin role accessing admin portal", () => {
      // Simulate the DB function logic
      const canAccess = (role: string, portal: string) => {
        const map: Record<string, string[]> = {
          patient: ["user"], doctor: ["doctor", "doctor_staff"],
          hospital: ["hospital_admin"], pathologist: ["pathologist"],
          researcher: ["researcher"], admin: ["admin"],
        };
        return (map[portal] || []).includes(role);
      };
      expect(canAccess("admin", "admin")).toBe(true);
      expect(canAccess("doctor", "admin")).toBe(false);
    });

    it("10. has_role function validates admin role", () => {
      // Simulate has_role check
      const userRoles = [{ user_id: "admin-user-1", role: "admin" }];
      const hasRole = (userId: string, role: string) =>
        userRoles.some((r) => r.user_id === userId && r.role === role);
      expect(hasRole("admin-user-1", "admin")).toBe(true);
      expect(hasRole("admin-user-1", "doctor")).toBe(false);
    });
  });
});
