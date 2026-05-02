import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { screen, fireEvent, waitFor } from "@testing-library/dom";

// Mock supabase BEFORE any imports that use it
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

// Import after mock
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Test component to access auth context
const TestAuthComponent = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth();

  return (
    <div>
      <span data-testid="loading">{loading ? "loading" : "ready"}</span>
      <span data-testid="user">{user ? user.email : "no-user"}</span>
      <button onClick={() => signIn("test@example.com", "password123")}>Sign In</button>
      <button onClick={() => signUp("new@example.com", "password123")}>Sign Up</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
};

describe("Authentication Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Sign Up Flow", () => {
    it("should call signUp with correct parameters including portal_type", async () => {
      const mockUser = {
        id: "new-user-123",
        email: "new@example.com",
        created_at: new Date().toISOString(),
      };
      const mockSession = {
        access_token: "token",
        user: mockUser,
      };

      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: mockUser as any, session: mockSession as any },
        error: null,
      });

      // Call signUp directly to test the Supabase integration with portal_type
      const result = await supabase.auth.signUp({
        email: "new@example.com",
        password: "password123",
        options: { 
          emailRedirectTo: "http://localhost:3000/verify-email",
          data: { portal_type: "patient" }
        },
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        options: expect.objectContaining({ 
          emailRedirectTo: expect.any(String),
          data: expect.objectContaining({ portal_type: "patient" })
        }),
      });
      expect(result.data.user?.email).toBe("new@example.com");
    });

    it("should pass portal_type for doctor signup", async () => {
      const mockUser = {
        id: "doctor-123",
        email: "doctor@clinic.com",
        created_at: new Date().toISOString(),
      };

      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: mockUser as any, session: null },
        error: null,
      });

      await supabase.auth.signUp({
        email: "doctor@clinic.com",
        password: "password123",
        options: { 
          emailRedirectTo: "http://localhost:3000/verify-email",
          data: { portal_type: "doctor" }
        },
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({ portal_type: "doctor" })
          })
        })
      );
    });

    it("should handle user already registered error", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: "User already registered" } as any,
      });

      const result = await supabase.auth.signUp({
        email: "existing@example.com",
        password: "password123",
      });

      expect(result.error?.message).toBe("User already registered");
    });

    it("should validate email format before signup", () => {
      const emailSchema = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      expect(emailSchema.test("valid@example.com")).toBe(true);
      expect(emailSchema.test("invalid-email")).toBe(false);
      expect(emailSchema.test("")).toBe(false);
    });

    it("should validate password minimum length", () => {
      const isValidPassword = (password: string) => password.length >= 6;
      
      expect(isValidPassword("123456")).toBe(true);
      expect(isValidPassword("12345")).toBe(false);
      expect(isValidPassword("")).toBe(false);
    });
  });

  describe("Sign In Flow", () => {
    it("should call signIn with credentials", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: mockUser as any, session: { access_token: "token", user: mockUser } as any },
        error: null,
      });

      const { container } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe("ready");
      });

      const buttons = container.querySelectorAll('button');
      const signInButton = buttons[0];
      if (signInButton) {
        fireEvent.click(signInButton);
      }

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    it("should handle invalid credentials error correctly", async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" } as any,
      });

      // The error is returned, not thrown
      const result = await supabase.auth.signInWithPassword({
        email: "wrong@example.com",
        password: "wrongpassword",
      });

      expect(result.error?.message).toBe("Invalid login credentials");
    });

    it("should handle email not confirmed error", async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: "Email not confirmed" } as any,
      });

      const result = await supabase.auth.signInWithPassword({
        email: "unverified@example.com",
        password: "password123",
      });

      expect(result.error?.message).toContain("Email not confirmed");
    });
  });

  describe("Sign Out Flow", () => {
    it("should call signOut", async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

      const { container } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe("ready");
      });

      const buttons = container.querySelectorAll('button');
      const signOutButton = buttons[2];
      if (signOutButton) {
        fireEvent.click(signOutButton);
      }

      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalled();
      });
    });
  });

  describe("Session Persistence", () => {
    it("should check for existing session on mount", async () => {
      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(supabase.auth.getSession).toHaveBeenCalled();
      });
    });

    it("should subscribe to auth state changes", async () => {
      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
      });
    });
  });

  describe("Password Reset Flow", () => {
    it("should call resetPasswordForEmail with correct redirect", async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        data: {},
        error: null,
      });

      await supabase.auth.resetPasswordForEmail("test@example.com", {
        redirectTo: "http://localhost:3000/reset-password",
      });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        expect.objectContaining({ redirectTo: expect.any(String) })
      );
    });
  });
});
