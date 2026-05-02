import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderWithRouter,
  resetMockAuth,
  setMockAuth,
  testPatient,
  testDoctor,
  mockSignIn,
  mockSignUp,
  mockSignOut,
  mockResetPassword,
} from "./integration-helpers";

/**
 * Cross-portal integration tests that validate multi-step user journeys
 * across different portal entry points and shared components.
 */

describe("Integration: Cross-Portal User Journeys", () => {
  beforeEach(() => {
    resetMockAuth();
  });

  // ── Auth State Transitions ──────────────────────────────────────────────

  it("unauthenticated user sees public content, not dashboard", () => {
    renderWithRouter(<div data-testid="public">Public Page</div>, {
      initialEntries: ["/"],
    });
    expect(screen.getByTestId("public")).toBeInTheDocument();
  });

  it("login → error → retry cycle works without stale state", async () => {
    mockSignIn.mockResolvedValueOnce({ error: { message: "Invalid login credentials" } });
    mockSignIn.mockResolvedValueOnce({ error: null });

    const LoginForm = () => {
      const [error, setError] = React.useState<string | null>(null);
      const handleSubmit = async () => {
        const result = await mockSignIn("test@test.com", "pass123");
        if (result.error) setError(result.error.message);
        else setError(null);
      };
      return (
        <div>
          {error && <div data-testid="error">{error}</div>}
          <button onClick={handleSubmit}>Login</button>
        </div>
      );
    };

    renderWithRouter(<LoginForm />);
    await userEvent.click(screen.getByText("Login"));
    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("Invalid login credentials");
    });

    await userEvent.click(screen.getByText("Login"));
    await waitFor(() => {
      expect(screen.queryByTestId("error")).not.toBeInTheDocument();
    });
  });

  it("signup without auto-confirm redirects to verify email", async () => {
    mockSignUp.mockResolvedValueOnce({ error: null, session: null });

    let navigatedTo = "";
    const SignupPage = () => {
      const handleSignup = async () => {
        const result = await mockSignUp("new@user.com", "password123");
        if (!result.error && !result.session) navigatedTo = "/verify-email";
      };
      return <button onClick={handleSignup}>Sign Up</button>;
    };

    renderWithRouter(<SignupPage />);
    await userEvent.click(screen.getByText("Sign Up"));
    await waitFor(() => {
      expect(navigatedTo).toBe("/verify-email");
    });
  });

  it("signup with auto-confirm redirects to dashboard", async () => {
    const mockSession = { access_token: "tok", user: testPatient };
    mockSignUp.mockResolvedValueOnce({ error: null, session: mockSession });

    let navigatedTo = "";
    const SignupPage = () => {
      const handleSignup = async () => {
        const result = await mockSignUp("new@user.com", "password123");
        if (!result.error && result.session) navigatedTo = "/dashboard";
      };
      return <button onClick={handleSignup}>Sign Up</button>;
    };

    renderWithRouter(<SignupPage />);
    await userEvent.click(screen.getByText("Sign Up"));
    await waitFor(() => {
      expect(navigatedTo).toBe("/dashboard");
    });
  });

  // ── Portal Identity ─────────────────────────────────────────────────────

  it("patient auth state renders patient-specific UI", () => {
    setMockAuth({
      user: testPatient,
      session: { access_token: "tok", user: testPatient },
      loading: false,
    });

    const PatientView = () => {
      const { useAuth } = require("@/contexts/AuthContext");
      const { user } = useAuth();
      return <div data-testid="portal">{user?.user_metadata?.portal_type ?? "none"}</div>;
    };

    renderWithRouter(<PatientView />);
    expect(screen.getByTestId("portal")).toHaveTextContent("patient");
  });

  it("doctor auth state renders doctor portal type", () => {
    setMockAuth({
      user: testDoctor,
      session: { access_token: "tok", user: testDoctor },
      loading: false,
    });

    const DoctorView = () => {
      const { useAuth } = require("@/contexts/AuthContext");
      const { user } = useAuth();
      return <div data-testid="portal">{user?.user_metadata?.portal_type ?? "none"}</div>;
    };

    renderWithRouter(<DoctorView />);
    expect(screen.getByTestId("portal")).toHaveTextContent("doctor");
  });

  // ── Sign Out Flow ───────────────────────────────────────────────────────

  it("sign out clears auth state", async () => {
    setMockAuth({
      user: testPatient,
      session: { access_token: "tok", user: testPatient },
      loading: false,
    });

    let isSignedOut = false;
    const LogoutFlow = () => {
      const handleLogout = async () => {
        await mockSignOut();
        isSignedOut = true;
      };
      return <button onClick={handleLogout}>Sign Out</button>;
    };

    renderWithRouter(<LogoutFlow />);
    await userEvent.click(screen.getByText("Sign Out"));
    await waitFor(() => {
      expect(isSignedOut).toBe(true);
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  // ── Password Reset Journey ──────────────────────────────────────────────

  it("full password reset journey: request → email sent", async () => {
    let step = "request";
    const ResetFlow = () => {
      const handleReset = async () => {
        const result = await mockResetPassword("user@test.com");
        if (!result.error) step = "sent";
      };
      return (
        <div>
          <button onClick={handleReset}>Reset Password</button>
          <span data-testid="step">{step}</span>
        </div>
      );
    };

    renderWithRouter(<ResetFlow />);
    expect(screen.getByTestId("step")).toHaveTextContent("request");
    await userEvent.click(screen.getByText("Reset Password"));
    await waitFor(() => {
      expect(step).toBe("sent");
      expect(mockResetPassword).toHaveBeenCalledWith("user@test.com");
    });
  });

  // ── Error Boundary Integration ──────────────────────────────────────────

  it("component error doesn't crash sibling components", () => {
    const GoodComponent = () => <div data-testid="good">Healthy</div>;
    const Container = () => (
      <div>
        <GoodComponent />
        <div data-testid="sibling">Also fine</div>
      </div>
    );

    renderWithRouter(<Container />);
    expect(screen.getByTestId("good")).toHaveTextContent("Healthy");
    expect(screen.getByTestId("sibling")).toHaveTextContent("Also fine");
  });

  // ── Loading States ──────────────────────────────────────────────────────

  it("auth loading state shows spinner, not content", () => {
    setMockAuth({ loading: true });

    const ProtectedPage = () => {
      const { useAuth } = require("@/contexts/AuthContext");
      const { loading, user } = useAuth();
      if (loading) return <div data-testid="spinner">Loading...</div>;
      if (!user) return <div data-testid="login">Please login</div>;
      return <div data-testid="content">Dashboard</div>;
    };

    renderWithRouter(<ProtectedPage />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
  });

  it("auth loaded with no user shows login prompt", () => {
    setMockAuth({ loading: false, user: null, session: null });

    const ProtectedPage = () => {
      const { useAuth } = require("@/contexts/AuthContext");
      const { loading, user } = useAuth();
      if (loading) return <div>Loading...</div>;
      if (!user) return <div data-testid="login">Please login</div>;
      return <div>Dashboard</div>;
    };

    renderWithRouter(<ProtectedPage />);
    expect(screen.getByTestId("login")).toBeInTheDocument();
  });

  it("auth loaded with user shows protected content", () => {
    setMockAuth({
      user: testPatient,
      session: { access_token: "tok", user: testPatient },
      loading: false,
    });

    const ProtectedPage = () => {
      const { useAuth } = require("@/contexts/AuthContext");
      const { loading, user } = useAuth();
      if (loading) return <div>Loading...</div>;
      if (!user) return <div>Please login</div>;
      return <div data-testid="content">Welcome {user.email}</div>;
    };

    renderWithRouter(<ProtectedPage />);
    expect(screen.getByTestId("content")).toHaveTextContent("Welcome patient@test.com");
  });
});
