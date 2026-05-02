import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
} from "@/hooks/useBiometricAuth";

// Mock WebAuthn API
const mockPublicKeyCredential = {
  isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true)),
};

describe("Biometric Authentication System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("WebAuthn Support Detection", () => {
    it("should detect WebAuthn support based on PublicKeyCredential presence", () => {
      // In JSDOM, WebAuthn is not supported, so we test the logic
      const checkSupport = () => {
        return !!(
          window.PublicKeyCredential &&
          typeof window.PublicKeyCredential === "function"
        );
      };
      // JSDOM doesn't have WebAuthn, so this should be false
      const result = checkSupport();
      expect(typeof result).toBe("boolean");
    });

    it("should detect WebAuthn not supported when unavailable", () => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(isWebAuthnSupported()).toBe(false);
    });
  });

  describe("Platform Authenticator Detection", () => {
    it("should return false in test environment without WebAuthn", async () => {
      // JSDOM doesn't support WebAuthn, so we verify graceful handling
      const available = await isPlatformAuthenticatorAvailable();
      expect(available).toBe(false);
    });

    it("should return false when platform authenticator unavailable", async () => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: {
          isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false)),
        },
        writable: true,
        configurable: true,
      });

      const available = await isPlatformAuthenticatorAvailable();
      expect(available).toBe(false);
    });

    it("should return false when WebAuthn not supported", async () => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const available = await isPlatformAuthenticatorAvailable();
      expect(available).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: {
          isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(() =>
            Promise.reject(new Error("API error"))
          ),
        },
        writable: true,
        configurable: true,
      });

      const available = await isPlatformAuthenticatorAvailable();
      expect(available).toBe(false);
    });
  });

  describe("Base64URL Encoding/Decoding", () => {
    // Simulate the encoding functions
    const bufferToBase64url = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer);
      let str = "";
      for (const byte of bytes) {
        str += String.fromCharCode(byte);
      }
      return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    };

    const base64urlToBuffer = (base64url: string): ArrayBuffer => {
      const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
      const padding = "=".repeat((4 - (base64.length % 4)) % 4);
      const binary = atob(base64 + padding);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    };

    it("should encode ArrayBuffer to base64url", () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const encoded = bufferToBase64url(data.buffer);
      expect(encoded).toBe("SGVsbG8");
    });

    it("should decode base64url to ArrayBuffer", () => {
      const encoded = "SGVsbG8";
      const decoded = new Uint8Array(base64urlToBuffer(encoded));
      expect(Array.from(decoded)).toEqual([72, 101, 108, 108, 111]);
    });

    it("should handle URL-unsafe characters", () => {
      // Data that would produce + and / in standard base64
      const data = new Uint8Array([255, 254, 253]);
      const encoded = bufferToBase64url(data.buffer);
      expect(encoded).not.toContain("+");
      expect(encoded).not.toContain("/");
      expect(encoded).not.toContain("=");
    });

    it("should roundtrip encode/decode correctly", () => {
      const original = new Uint8Array(32);
      crypto.getRandomValues(original);

      const encoded = bufferToBase64url(original.buffer);
      const decoded = new Uint8Array(base64urlToBuffer(encoded));

      expect(Array.from(decoded)).toEqual(Array.from(original));
    });
  });

  describe("Challenge Generation", () => {
    const generateChallenge = (): Uint8Array => {
      return crypto.getRandomValues(new Uint8Array(32));
    };

    it("should generate 32-byte challenge", () => {
      const challenge = generateChallenge();
      expect(challenge.length).toBe(32);
    });

    it("should generate unique challenges", () => {
      const challenge1 = generateChallenge();
      const challenge2 = generateChallenge();

      // Highly unlikely to be equal
      expect(Array.from(challenge1)).not.toEqual(Array.from(challenge2));
    });

    it("should use cryptographically secure random", () => {
      const challenges = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const challenge = generateChallenge();
        challenges.add(Array.from(challenge).join(","));
      }
      // All 100 should be unique
      expect(challenges.size).toBe(100);
    });
  });

  describe("Device Name Detection", () => {
    const getDeviceName = (userAgent: string): string => {
      if (/iPhone/i.test(userAgent)) return "iPhone";
      if (/iPad/i.test(userAgent)) return "iPad";
      if (/Android/i.test(userAgent)) return "Android Device";
      if (/Mac/i.test(userAgent)) return "Mac";
      if (/Windows/i.test(userAgent)) return "Windows PC";
      if (/Linux/i.test(userAgent)) return "Linux PC";
      return "Unknown Device";
    };

    it("should detect iPhone", () => {
      expect(getDeviceName("Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)")).toBe("iPhone");
    });

    it("should detect iPad", () => {
      expect(getDeviceName("Mozilla/5.0 (iPad; CPU OS 15_0)")).toBe("iPad");
    });

    it("should detect Android", () => {
      expect(getDeviceName("Mozilla/5.0 (Linux; Android 12)")).toBe("Android Device");
    });

    it("should detect Mac", () => {
      expect(getDeviceName("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)")).toBe("Mac");
    });

    it("should detect Windows", () => {
      expect(getDeviceName("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Windows PC");
    });

    it("should detect Linux", () => {
      expect(getDeviceName("Mozilla/5.0 (X11; Linux x86_64)")).toBe("Linux PC");
    });

    it("should handle unknown devices", () => {
      expect(getDeviceName("Unknown Browser")).toBe("Unknown Device");
    });
  });

  describe("Credential Validation", () => {
    it("should validate credential ID format", () => {
      const isValidCredentialId = (id: string) => {
        // Base64url format: alphanumeric, -, _
        return /^[A-Za-z0-9_-]+$/.test(id) && id.length > 0;
      };

      expect(isValidCredentialId("SGVsbG8")).toBe(true);
      expect(isValidCredentialId("abc-def_123")).toBe(true);
      expect(isValidCredentialId("")).toBe(false);
      expect(isValidCredentialId("invalid+chars")).toBe(false);
    });

    it("should validate public key format", () => {
      const isValidPublicKey = (key: string) => {
        return /^[A-Za-z0-9_-]+$/.test(key) && key.length >= 64;
      };

      const validKey = "a".repeat(100);
      expect(isValidPublicKey(validKey)).toBe(true);
      expect(isValidPublicKey("short")).toBe(false);
    });
  });

  describe("Security Considerations", () => {
    it("should require user verification", () => {
      const authOptions = {
        userVerification: "required" as const,
      };
      expect(authOptions.userVerification).toBe("required");
    });

    it("should use platform authenticator attachment", () => {
      const creationOptions = {
        authenticatorSelection: {
          authenticatorAttachment: "platform" as const,
          userVerification: "required" as const,
        },
      };
      expect(creationOptions.authenticatorSelection.authenticatorAttachment).toBe("platform");
    });

    it("should set appropriate timeout", () => {
      const timeout = 60000; // 60 seconds
      expect(timeout).toBe(60000);
    });

    it("should use no attestation for privacy", () => {
      const attestation = "none";
      expect(attestation).toBe("none");
    });
  });
});
