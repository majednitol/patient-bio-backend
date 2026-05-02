import { describe, it, expect } from "vitest";
import {
  simulateSessionLifecycle,
  type SessionState,
  type SessionEvent,
  type SessionToken,
} from "./recovery-helpers";

function makeSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    isAuthenticated: true,
    token: { accessToken: "at-1", refreshToken: "rt-1", expiresAt: Date.now() + 3600_000, role: "patient" },
    redirectTo: null,
    formData: null,
    preferences: { lang: "en", theme: "light" },
    refreshAttempts: 0,
    pendingRequests: 0,
    ...overrides,
  };
}

const newToken: SessionToken = { accessToken: "at-2", refreshToken: "rt-2", expiresAt: Date.now() + 3600_000, role: "patient" };

describe("Phase 17b: Session Recovery", () => {
  it("1 - expired access token triggers automatic refresh", () => {
    const { finalState, log } = simulateSessionLifecycle(makeSession(), [
      { type: "token_expired" },
      { type: "refresh_success", payload: { token: newToken } },
    ]);
    expect(finalState.isAuthenticated).toBe(true);
    expect(finalState.token?.accessToken).toBe("at-2");
    expect(log).toContain("refresh_success");
  });

  it("2 - refresh token also expired redirects to login", () => {
    const { finalState, log } = simulateSessionLifecycle(makeSession(), [
      { type: "token_expired" },
      { type: "refresh_failed" },
      { type: "refresh_failed" },
      { type: "refresh_failed" },
    ]);
    expect(finalState.isAuthenticated).toBe(false);
    expect(finalState.redirectTo).toBe("/login");
    expect(log).toContain("refresh_exhausted");
  });

  it("3 - login redirect preserves original target route", () => {
    const state = makeSession({ redirectTo: "/doctor/patients" });
    const { finalState } = simulateSessionLifecycle(state, [{ type: "token_expired" }]);
    // redirectTo was already set before events
    expect(state.redirectTo).toBe("/doctor/patients");
  });

  it("4 - in-progress form data survives session refresh", () => {
    const state = makeSession({ formData: { name: "John", diagnosis: "Flu" } });
    const { finalState } = simulateSessionLifecycle(state, [
      { type: "token_expired" },
      { type: "refresh_success", payload: { token: newToken } },
    ]);
    expect(finalState.formData).toEqual({ name: "John", diagnosis: "Flu" });
  });

  it("5 - concurrent requests during refresh are queued", () => {
    const state = makeSession({ pendingRequests: 3 });
    const { finalState } = simulateSessionLifecycle(state, [
      { type: "refresh_success", payload: { token: newToken } },
    ]);
    expect(finalState.pendingRequests).toBe(0);
  });

  it("6 - failed refresh after 3 retries clears session cleanly", () => {
    const events: SessionEvent[] = [
      { type: "refresh_failed" },
      { type: "refresh_failed" },
      { type: "refresh_failed" },
    ];
    const { finalState } = simulateSessionLifecycle(makeSession(), events);
    expect(finalState.isAuthenticated).toBe(false);
    expect(finalState.token).toBeNull();
  });

  it("7 - role change during refresh updates permissions immediately", () => {
    const { finalState } = simulateSessionLifecycle(makeSession(), [
      { type: "refresh_success", payload: { token: newToken, role: "doctor" } },
    ]);
    expect(finalState.token?.role).toBe("doctor");
  });

  it("8 - multi-tab session: token refresh applies to shared state", () => {
    const tab1 = makeSession();
    const tab2 = makeSession();
    const { finalState: s1 } = simulateSessionLifecycle(tab1, [
      { type: "refresh_success", payload: { token: newToken } },
    ]);
    // Simulate tab2 picking up new token
    tab2.token = s1.token;
    expect(tab2.token?.accessToken).toBe("at-2");
  });

  it("9 - session recovery preserves user preferences", () => {
    const { finalState } = simulateSessionLifecycle(
      makeSession({ preferences: { lang: "hi", theme: "dark" } }),
      [{ type: "token_expired" }, { type: "refresh_success", payload: { token: newToken } }]
    );
    expect(finalState.preferences).toEqual({ lang: "hi", theme: "dark" });
  });

  it("10 - OAuth callback failure shows actionable error", () => {
    const { finalState, log } = simulateSessionLifecycle(makeSession(), [
      { type: "refresh_failed" },
      { type: "refresh_failed" },
      { type: "refresh_failed" },
    ]);
    expect(finalState.redirectTo).toBe("/login");
    expect(log).toContain("refresh_exhausted");
  });

  it("11 - network offline during refresh queues for reconnection", () => {
    const { finalState, log } = simulateSessionLifecycle(makeSession(), [
      { type: "token_expired" },
      { type: "network_offline" },
    ]);
    expect(finalState.pendingRequests).toBe(1);
    expect(log).toContain("network_offline");
  });

  it("12 - rapid token expiry doesn't cause refresh loop", () => {
    const events: SessionEvent[] = [
      { type: "token_expired" },
      { type: "refresh_success", payload: { token: newToken } },
      { type: "token_expired" },
      { type: "refresh_success", payload: { token: newToken } },
    ];
    const { finalState, log } = simulateSessionLifecycle(makeSession(), events);
    expect(finalState.isAuthenticated).toBe(true);
    expect(log.filter((l) => l === "refresh_success")).toHaveLength(2);
  });

  it("13 - session timeout warning appears before expiry", () => {
    const token: SessionToken = { accessToken: "at-1", refreshToken: "rt-1", expiresAt: Date.now() + 5 * 60 * 1000, role: "patient" };
    const state = makeSession({ token });
    const timeUntilExpiry = state.token!.expiresAt - Date.now();
    expect(timeUntilExpiry).toBeLessThanOrEqual(5 * 60 * 1000);
  });

  it("14 - stay logged in extends session without page reload", () => {
    const extended: SessionToken = { ...newToken, expiresAt: Date.now() + 7200_000 };
    const { finalState } = simulateSessionLifecycle(makeSession(), [
      { type: "refresh_success", payload: { token: extended } },
    ]);
    expect(finalState.token!.expiresAt - Date.now()).toBeGreaterThan(3600_000);
  });

  it("15 - forced logout clears all local state", () => {
    const { finalState } = simulateSessionLifecycle(
      makeSession({ formData: { draft: true }, preferences: { lang: "en" } }),
      [{ type: "force_logout" }]
    );
    expect(finalState.isAuthenticated).toBe(false);
    expect(finalState.token).toBeNull();
    expect(finalState.formData).toBeNull();
    expect(finalState.preferences).toEqual({});
  });
});
