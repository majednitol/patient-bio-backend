import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderWithRouter,
  resetMockAuth,
  mockSignIn,
  mockSignUp,
  mockResetPassword,
} from "./integration-helpers";
import AuthPage from "@/pages/AuthPage";

describe("Integration: Patient Auth Workflow", () => {
  beforeEach(() => {
    resetMockAuth();
  });

  it("renders login form by default with email and password fields", () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("Sign in to access your health dashboard")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("switches to signup form when clicking 'Sign up'", async () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    await userEvent.click(screen.getByText("Sign up"));
    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByText("Start managing your health records today")).toBeInTheDocument();
  });

  it("shows full name and confirm password fields in signup mode", async () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    await userEvent.click(screen.getByText("Sign up"));
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
  });

  it("submits login form with valid credentials", async () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    
    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    
    const signInButton = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(signInButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });

  it("shows error for invalid login credentials", async () => {
    mockSignIn.mockResolvedValueOnce({ error: { message: "Invalid login credentials" } });
    
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    await userEvent.type(screen.getByLabelText("Email"), "wrong@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
  });

  it("handles email not confirmed error", async () => {
    mockSignIn.mockResolvedValueOnce({ error: { message: "Email not confirmed" } });
    
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    await userEvent.type(screen.getByLabelText("Email"), "unverified@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
  });

  it("validates password length before submitting signup", async () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    await userEvent.click(screen.getByText("Sign up"));
    
    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "12345"); // too short
    await userEvent.type(screen.getByLabelText("Confirm Password"), "12345");
    
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("validates password confirmation match in signup", async () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    await userEvent.click(screen.getByText("Sign up"));
    
    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "different123");
    
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("switches to forgot password view", async () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    await userEvent.click(screen.getByText("Forgot password?"));
    
    expect(screen.getByText("Forgot your password?")).toBeInTheDocument();
    expect(screen.getByText("Enter your email and we'll send you a reset link")).toBeInTheDocument();
  });

  it("submits forgot password form", async () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    await userEvent.click(screen.getByText("Forgot password?"));
    
    await userEvent.type(screen.getByLabelText("Email"), "forgot@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith("forgot@example.com");
    });
  });

  it("shows confirmation after password reset email sent", async () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    await userEvent.click(screen.getByText("Forgot password?"));
    
    await userEvent.type(screen.getByLabelText("Email"), "forgot@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
    });
  });

  it("can navigate back from forgot password to login", async () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    await userEvent.click(screen.getByText("Forgot password?"));
    
    const backButtons = screen.getAllByText("Back to Sign In");
    await userEvent.click(backButtons[0]);
    
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("shows branding text on the left panel", () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    // Text is split by <br>, so match partial
    expect(screen.getByText(/Your Health Data/)).toBeInTheDocument();
    expect(screen.getByText(/Your Control/)).toBeInTheDocument();
  });

  it("renders Google sign-in button", () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
  });

  it("signup submits with valid data", async () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    await userEvent.click(screen.getByText("Sign up"));
    
    await userEvent.type(screen.getByLabelText("Full Name"), "Test User");
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "securepass123");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "securepass123");
    
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "securepass123");
    });
  });

  it("shows terms and privacy links", () => {
    renderWithRouter(<AuthPage />, { initialEntries: ["/auth"] });
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });
});
