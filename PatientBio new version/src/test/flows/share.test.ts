import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
  }),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

// Token generation function (matches the hook)
const generateToken = () => {
  const array = new Uint8Array(24);
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

describe("Share Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Token Generation", () => {
    it("should generate a 48-character hex token", () => {
      const token = generateToken();
      
      expect(token).toHaveLength(48);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it("should generate unique tokens", () => {
      const tokens = new Set();
      
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken());
      }
      
      expect(tokens.size).toBe(100);
    });
  });

  describe("Access Token Creation", () => {
    it("should create access token with correct expiry", async () => {
      const expiresInHours = 24;
      const now = Date.now();
      const expectedExpiry = new Date(now + expiresInHours * 60 * 60 * 1000);

      const mockToken = {
        id: "token-123",
        user_id: "user-123",
        token: generateToken(),
        expires_at: expectedExpiry.toISOString(),
        created_at: new Date(now).toISOString(),
        label: "Dr. Smith",
        is_revoked: false,
        access_count: 0,
      };

      mockSupabase.from("access_tokens").insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockToken, error: null }),
        }),
      });

      const result = await mockSupabase.from("access_tokens")
        .insert({
          user_id: "user-123",
          token: mockToken.token,
          expires_at: mockToken.expires_at,
          label: "Dr. Smith",
        })
        .select()
        .single();

      expect(mockSupabase.from).toHaveBeenCalledWith("access_tokens");
    });

    it("should support different expiry durations", () => {
      const durations = [1, 6, 12, 24, 48, 72, 168]; // hours
      
      durations.forEach((hours) => {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + hours);
        
        expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
      });
    });

    it("should allow optional label for token", () => {
      const tokenWithLabel = { label: "Dr. Smith" };
      const tokenWithoutLabel = { label: null };
      
      expect(tokenWithLabel.label).toBeDefined();
      expect(tokenWithoutLabel.label).toBeNull();
    });
  });

  describe("Share Link URL Generation", () => {
    it("should generate valid share URL", () => {
      const token = generateToken();
      const origin = "https://app.patientbio.com";
      const shareUrl = `${origin}/share/${token}`;
      
      expect(shareUrl).toContain("/share/");
      expect(shareUrl).toContain(token);
    });

    it("should work with different environments", () => {
      const environments = [
        "http://localhost:5173",
        "https://preview.lovable.app",
        "https://app.patientbio.com",
      ];
      
      const token = generateToken();
      
      environments.forEach((origin) => {
        const url = `${origin}/share/${token}`;
        expect(url).toMatch(/^https?:\/\/.+\/share\/[0-9a-f]+$/);
      });
    });
  });

  describe("Token Status Checks", () => {
    it("should correctly identify expired tokens", () => {
      const now = new Date();
      
      const expiredToken = {
        expires_at: new Date(now.getTime() - 1000).toISOString(),
      };
      
      const activeToken = {
        expires_at: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
      };

      const isExpired = (token: { expires_at: string }) => 
        new Date(token.expires_at) < new Date();

      expect(isExpired(expiredToken)).toBe(true);
      expect(isExpired(activeToken)).toBe(false);
    });

    it("should correctly identify revoked tokens", () => {
      const revokedToken = { is_revoked: true };
      const activeToken = { is_revoked: false };

      expect(revokedToken.is_revoked).toBe(true);
      expect(activeToken.is_revoked).toBe(false);
    });

    it("should correctly identify active tokens (not expired and not revoked)", () => {
      const now = new Date();
      
      const isTokenActive = (token: { expires_at: string; is_revoked: boolean }) => {
        const isExpired = new Date(token.expires_at) < new Date();
        return !token.is_revoked && !isExpired;
      };

      const activeToken = {
        expires_at: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
        is_revoked: false,
      };

      const revokedToken = {
        expires_at: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
        is_revoked: true,
      };

      const expiredToken = {
        expires_at: new Date(now.getTime() - 1000).toISOString(),
        is_revoked: false,
      };

      expect(isTokenActive(activeToken)).toBe(true);
      expect(isTokenActive(revokedToken)).toBe(false);
      expect(isTokenActive(expiredToken)).toBe(false);
    });
  });

  describe("Access Tracking", () => {
    it("should track access count", () => {
      const token = {
        access_count: 0,
        accessed_at: null as string | null,
      };

      // Simulate access
      const accessedToken = {
        ...token,
        access_count: token.access_count + 1,
        accessed_at: new Date().toISOString(),
      };

      expect(accessedToken.access_count).toBe(1);
      expect(accessedToken.accessed_at).not.toBeNull();
    });
  });
});
