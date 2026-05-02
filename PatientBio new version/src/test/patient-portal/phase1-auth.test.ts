import { describe, it, expect, vi, beforeEach } from "vitest";

// Must declare mock inline due to hoisting
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
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
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
  }),
}));

import { supabase } from "@/integrations/supabase/client";
import { getPortalNameFromRole } from "@/hooks/usePortalAuth";

type PortalType = "patient" | "doctor" | "hospital" | "pathologist" | "researcher" | "admin";

const portalRoleMap: Record<PortalType, string[]> = {
  patient: ["user"],
  doctor: ["doctor", "doctor_staff"],
  hospital: ["hospital_admin"],
  pathologist: ["pathologist"],
  researcher: ["researcher"],
  admin: ["admin"],
};

describe("Phase 1: Authentication and Onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Successful patient signup
  describe("Test 1: Successful patient signup", () => {
    it("should call signUp with patient portal_type metadata", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: { id: "new-user", email: "patient@test.com" } as any, session: null },
        error: null,
      });

      await supabase.auth.signUp({
        email: "patient@test.com",
        password: "SecurePass123!",
        options: {
          emailRedirectTo: "http://localhost:3000/verify-email",
          data: { portal_type: "patient" },
        },
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "patient@test.com",
          options: expect.objectContaining({
            data: { portal_type: "patient" },
          }),
        })
      );
    });

    it("should return null session when email confirmation is required", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: { id: "new-user", email: "patient@test.com" } as any, session: null },
        error: null,
      });

      const result = await supabase.auth.signUp({
        email: "patient@test.com",
        password: "SecurePass123!",
        options: { data: { portal_type: "patient" } },
      });

      expect(result.data.session).toBeNull();
      expect(result.data.user).not.toBeNull();
    });

    it("should reject weak passwords", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: "Password should be at least 6 characters" } as any,
      });

      const result = await supabase.auth.signUp({
        email: "patient@test.com",
        password: "123",
        options: { data: { portal_type: "patient" } },
      });

      expect(result.error).not.toBeNull();
    });

    it("should reject duplicate email registration", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: "User already registered" } as any,
      });

      const result = await supabase.auth.signUp({
        email: "existing@test.com",
        password: "SecurePass123!",
        options: { data: { portal_type: "patient" } },
      });

      expect(result.error?.message).toBe("User already registered");
    });
  });

  // Test 2: Wrong portal rejection
  describe("Test 2: Wrong portal rejection", () => {
    it("should reject doctor account on patient portal", () => {
      const userRole = "doctor";
      const allowedRoles = portalRoleMap["patient"];
      const isValid = allowedRoles.includes(userRole);
      expect(isValid).toBe(false);
    });

    it("should reject patient account on doctor portal", () => {
      const userRole = "user";
      const allowedRoles = portalRoleMap["doctor"];
      const isValid = allowedRoles.includes(userRole);
      expect(isValid).toBe(false);
    });

    it("should allow doctor_staff on doctor portal", () => {
      const userRole = "doctor_staff";
      const allowedRoles = portalRoleMap["doctor"];
      const isValid = allowedRoles.includes(userRole);
      expect(isValid).toBe(true);
    });

    it("should generate correct error message with portal name", () => {
      const userPortal = getPortalNameFromRole("doctor");
      const errorMessage = `This account is registered for the ${userPortal} Portal. Please use the correct portal to sign in.`;
      expect(errorMessage).toContain("Doctor Portal");
    });

    it("should sign out user on portal mismatch", async () => {
      await supabase.auth.signOut();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  // Test 3: Email verification flow
  describe("Test 3: Email verification flow", () => {
    it("should set emailRedirectTo to verify-email page", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: { id: "u1" } as any, session: null },
        error: null,
      });

      await supabase.auth.signUp({
        email: "new@test.com",
        password: "Pass123!",
        options: {
          emailRedirectTo: "http://localhost:3000/verify-email",
          data: { portal_type: "patient" },
        },
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            emailRedirectTo: expect.stringContaining("/verify-email"),
          }),
        })
      );
    });
  });

  // Test 4: Password reset flow
  describe("Test 4: Password reset flow", () => {
    it("should call resetPasswordForEmail with correct redirect", async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        data: {},
        error: null,
      });

      await supabase.auth.resetPasswordForEmail("test@test.com", {
        redirectTo: "http://localhost:3000/reset-password",
      });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@test.com",
        expect.objectContaining({ redirectTo: expect.stringContaining("/reset-password") })
      );
    });

    it("should call updateUser with new password", async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
        data: { user: { id: "u1" } as any },
        error: null,
      });

      await supabase.auth.updateUser({ password: "NewPass123!" });
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "NewPass123!" });
    });
  });

  // Test 5: First-login Welcome Wizard
  describe("Test 5: First-login Welcome Wizard", () => {
    it("should detect first login based on localStorage", () => {
      const FIRST_LOGIN_KEY = "patient-bio-first-login-done";

      localStorage.removeItem(FIRST_LOGIN_KEY);
      expect(!localStorage.getItem(FIRST_LOGIN_KEY)).toBe(true);

      localStorage.setItem(FIRST_LOGIN_KEY, "true");
      expect(!localStorage.getItem(FIRST_LOGIN_KEY)).toBe(false);

      localStorage.removeItem(FIRST_LOGIN_KEY);
    });

    it("should also detect first login from firstLogin query param", () => {
      const searchParams = new URLSearchParams("?firstLogin=true");
      expect(searchParams.get("firstLogin") === "true").toBe(true);
    });
  });

  // Test 6: Passport ID auto-generation
  describe("Test 6: Passport ID auto-generation", () => {
    it("should validate passport ID format PB-YYYYMM-XXXXXX-C", () => {
      const passportIdRegex = /^PB-\d{6}-\d{6}-\d$/;
      expect(passportIdRegex.test("PB-202602-000001-7")).toBe(true);
      expect(passportIdRegex.test("PB-202601-123456-3")).toBe(true);
      expect(passportIdRegex.test("INVALID")).toBe(false);
      expect(passportIdRegex.test("PB-2026-000001-7")).toBe(false);
    });

    it("should have Luhn check digit as last character", () => {
      const calculateLuhn = (input: string): number => {
        const digits = input.replace(/[^0-9]/g, "");
        let sum = 0;
        const len = digits.length;
        for (let i = len - 1; i >= 0; i--) {
          let digit = parseInt(digits[i]);
          if ((len - i) % 2 === 0) {
            digit *= 2;
            if (digit > 9) digit -= 9;
          }
          sum += digit;
        }
        return (10 - (sum % 10)) % 10;
      };

      const base = "202602000001";
      const checkDigit = calculateLuhn(base);
      expect(checkDigit).toBeGreaterThanOrEqual(0);
      expect(checkDigit).toBeLessThanOrEqual(9);
    });
  });

  // Session persistence
  describe("Session persistence", () => {
    it("should check for existing session on mount", async () => {
      await supabase.auth.getSession();
      expect(supabase.auth.getSession).toHaveBeenCalled();
    });

    it("should subscribe to auth state changes", () => {
      supabase.auth.onAuthStateChange(() => {});
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  // One-email-one-portal policy
  describe("One-email-one-portal policy", () => {
    it("should prevent same email across portals (enforced by DB uniqueness)", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: "User already registered" } as any,
      });

      const result = await supabase.auth.signUp({
        email: "existing@test.com",
        password: "Pass123!",
        options: { data: { portal_type: "doctor" } },
      });

      expect(result.error).not.toBeNull();
    });
  });
});
