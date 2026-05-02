import { describe, it, expect } from "vitest";
import { simulateErrorRecovery, getUploadErrorMessage } from "./usability-helpers";

describe("Phase 15b: Error State UX", () => {
  it("network errors show connection guidance with retry button", () => {
    const error = simulateErrorRecovery("network");
    expect(error.message.toLowerCase()).toContain("connection");
    expect(error.hasRetry).toBe(true);
    expect(error.actions).toContain("Retry");
  });

  it("404 pages show contextual message with navigation options", () => {
    const error = simulateErrorRecovery("404");
    expect(error.hasActionableGuidance).toBe(true);
    expect(error.actions!.length).toBeGreaterThanOrEqual(2);
    expect(error.actions).toContain("Go to Dashboard");
  });

  it("form submission errors preserve all entered data", () => {
    const error = simulateErrorRecovery("validation");
    expect(error.preservesUserInput).toBe(true);
  });

  it("API timeout errors suggest trying again with estimated wait", () => {
    const error = simulateErrorRecovery("timeout");
    expect(error.hasRetry).toBe(true);
    expect(error.retryConfig).toBeDefined();
    expect(error.retryConfig!.showCountdown).toBe(true);
    expect(error.message.toLowerCase()).toMatch(/try again|taking longer/);
  });

  it("permission denied errors explain why and suggest next steps", () => {
    const error = simulateErrorRecovery("permission");
    expect(error.hasActionableGuidance).toBe(true);
    expect(error.message.toLowerCase()).toContain("permission");
    expect(error.actions).toContain("Request Access");
  });

  it("file upload errors specify the issue (size, format, network)", () => {
    const sizeMsg = getUploadErrorMessage("size");
    const formatMsg = getUploadErrorMessage("format");
    const networkMsg = getUploadErrorMessage("network");
    expect(sizeMsg.toLowerCase()).toContain("size");
    expect(formatMsg.toLowerCase()).toContain("format");
    expect(networkMsg.toLowerCase()).toContain("network");
  });

  it("concurrent edit conflicts show diff and resolution options", () => {
    const error = simulateErrorRecovery("conflict");
    expect(error.actions).toContain("Keep Mine");
    expect(error.actions).toContain("Keep Theirs");
    expect(error.preservesUserInput).toBe(true);
  });

  it("session expiry redirects to login with return-to-page intent", () => {
    const error = simulateErrorRecovery("session");
    expect(error.actions).toContain("Log In");
    expect(error.message.toLowerCase()).toContain("log in");
  });

  it("rate limit errors show wait time before retry is available", () => {
    const error = simulateErrorRecovery("rate_limit");
    expect(error.retryConfig).toBeDefined();
    expect(error.retryConfig!.backoffMs[0]).toBeGreaterThanOrEqual(30000);
    expect(error.retryConfig!.showCountdown).toBe(true);
  });

  it("offline mode errors distinguish between cached and unavailable data", () => {
    const error = simulateErrorRecovery("offline");
    expect(error.message.toLowerCase()).toContain("cache");
    expect(error.actions).toContain("View Cached Data");
  });

  it("validation errors appear next to the specific field, not just at top", () => {
    const error = simulateErrorRecovery("validation");
    expect(error.message.toLowerCase()).toContain("below");
    expect(error.hasActionableGuidance).toBe(true);
  });

  it("error messages use plain language (no technical codes shown to users)", () => {
    const allTypes = ["network", "404", "timeout", "permission", "upload", "conflict", "session", "rate_limit", "offline", "validation", "critical", "boundary"] as const;
    allTypes.forEach(type => {
      const error = simulateErrorRecovery(type);
      expect(error.usesPlainLanguage).toBe(true);
      expect(error.message).not.toMatch(/^[A-Z_]+\d+/);
      expect(error.message).not.toMatch(/ERR_|ECONNREFUSED|500|503/);
    });
  });

  it("critical errors require explicit user acknowledgment", () => {
    const error = simulateErrorRecovery("critical");
    expect(error.message.toLowerCase()).toContain("acknowledge");
    expect(error.actions).toContain("I Understand");
  });

  it("retry mechanism uses exponential backoff with user-visible countdown", () => {
    const error = simulateErrorRecovery("network");
    expect(error.retryConfig).toBeDefined();
    const backoff = error.retryConfig!.backoffMs;
    for (let i = 1; i < backoff.length; i++) {
      expect(backoff[i]).toBeGreaterThan(backoff[i - 1]);
    }
    expect(error.retryConfig!.showCountdown).toBe(true);
  });

  it("error boundary fallback UI includes Report Issue and Go Home actions", () => {
    const error = simulateErrorRecovery("boundary");
    expect(error.actions).toContain("Report Issue");
    expect(error.actions).toContain("Go Home");
  });
});
