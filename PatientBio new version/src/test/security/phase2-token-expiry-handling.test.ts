import { describe, it, expect } from "vitest";
import {
  makeJWT,
  isJWTValid,
  isTokenExpired,
  makeAccessToken,
  isAccessTokenActive,
  validateEmergencyToken,
  verifyTokenIntegrity,
  bulkRevoke,
} from "./security-helpers";

describe("Phase 2: Token Expiry Handling", () => {
  it("1. Valid JWT with future exp accepted", () => {
    const jwt = makeJWT({}, 3600);
    expect(isJWTValid(jwt).valid).toBe(true);
  });

  it("2. JWT with past exp rejected", () => {
    const jwt = makeJWT({ exp: Math.floor(Date.now() / 1000) - 100 });
    expect(isJWTValid(jwt).valid).toBe(false);
    expect(isJWTValid(jwt).reason).toBe("Token expired");
  });

  it("3. JWT with exp exactly now is rejected", () => {
    const jwt = makeJWT({ exp: Math.floor(Date.now() / 1000) });
    expect(isJWTValid(jwt).valid).toBe(false);
  });

  it("4. JWT missing exp field rejected", () => {
    const jwt = makeJWT({ sub: "user-1" });
    delete (jwt as any).exp;
    expect(isJWTValid(jwt).valid).toBe(false);
    expect(isJWTValid(jwt).reason).toBe("Missing exp claim");
  });

  it("5. JWT missing sub field rejected", () => {
    const jwt = makeJWT({}, 3600);
    delete (jwt as any).sub;
    expect(isJWTValid(jwt).valid).toBe(false);
    expect(isJWTValid(jwt).reason).toBe("Missing sub claim");
  });

  it("6. Access token within 24h window is active", () => {
    const token = makeAccessToken();
    expect(isAccessTokenActive(token).active).toBe(true);
  });

  it("7. Access token past expires_at is expired", () => {
    const token = makeAccessToken({
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    expect(isAccessTokenActive(token).active).toBe(false);
    expect(isAccessTokenActive(token).reason).toBe("Token expired");
  });

  it("8. Revoked access token rejected even if not expired", () => {
    const token = makeAccessToken({ is_revoked: true });
    expect(isAccessTokenActive(token).active).toBe(false);
    expect(isAccessTokenActive(token).reason).toBe("Token revoked");
  });

  it("9. Emergency token within 4h window accepted", () => {
    const token = makeAccessToken({ is_emergency: true, created_at: new Date().toISOString() });
    expect(validateEmergencyToken(token).valid).toBe(true);
  });

  it("10. Emergency token past 4h rejected", () => {
    const token = makeAccessToken({
      is_emergency: true,
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    });
    expect(validateEmergencyToken(token).valid).toBe(false);
    expect(validateEmergencyToken(token).reason).toBe("Emergency window expired");
  });

  it("11. Emergency token with PIN -- correct PIN accepted", () => {
    const token = makeAccessToken({ is_emergency: true, pin: "1234", created_at: new Date().toISOString() });
    expect(validateEmergencyToken(token, "1234").valid).toBe(true);
  });

  it("12. Emergency token with PIN -- wrong PIN rejected", () => {
    const token = makeAccessToken({ is_emergency: true, pin: "1234", created_at: new Date().toISOString() });
    expect(validateEmergencyToken(token, "0000").valid).toBe(false);
    expect(validateEmergencyToken(token, "0000").reason).toBe("PIN mismatch");
  });

  it("13. Refresh after expiry requires re-authentication", () => {
    const jwt = makeJWT({ exp: Math.floor(Date.now() / 1000) - 1 });
    expect(isTokenExpired(jwt)).toBe(true);
    // Simulates that a new auth flow is needed
    expect(isJWTValid(jwt).valid).toBe(false);
  });

  it("14. Token with tampered claims (role changed) rejected", () => {
    const jwt = makeJWT({ role: "admin" }, 3600);
    const result = verifyTokenIntegrity(jwt, "authenticated");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Role tampered");
  });

  it("15. Bulk revocation marks all tokens as inactive", () => {
    const tokens = [makeAccessToken(), makeAccessToken(), makeAccessToken()];
    const revoked = bulkRevoke(tokens);
    revoked.forEach((t) => {
      expect(t.is_revoked).toBe(true);
      expect(isAccessTokenActive(t).active).toBe(false);
    });
  });
});
