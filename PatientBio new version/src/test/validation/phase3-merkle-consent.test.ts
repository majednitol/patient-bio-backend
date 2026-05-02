import { describe, it, expect } from "vitest";
import {
  MerkleProofNodeSchema,
  MerkleProofSchema,
  VerifyChainResponseSchema,
  ConsentTypeSchema,
  ConsentScopeSchema,
  ConsentRecordSchema,
} from "@/lib/validation";

const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const VALID_TIMESTAMP = "2026-02-16T10:00:00.000Z";

describe("Phase 3: Merkle Proof & Consent Schema Validation", () => {
  // ── MerkleProofNode ──
  it("1. MerkleProofNodeSchema accepts valid node", () => {
    expect(MerkleProofNodeSchema.safeParse({ hash: "abc123", position: "left" }).success).toBe(true);
    expect(MerkleProofNodeSchema.safeParse({ hash: "def456", position: "right" }).success).toBe(true);
  });

  it("2. MerkleProofNodeSchema rejects invalid position", () => {
    expect(MerkleProofNodeSchema.safeParse({ hash: "abc", position: "center" }).success).toBe(false);
  });

  // ── MerkleProof ──
  it("3. MerkleProofSchema accepts valid proof with nodes", () => {
    const result = MerkleProofSchema.safeParse({
      recordId: VALID_UUID, recordHash: "hash123",
      proof: [{ hash: "a", position: "left" }, { hash: "b", position: "right" }],
      root: "rootHash", blockNumber: 42, verified: true,
    });
    expect(result.success).toBe(true);
  });

  it("4. MerkleProofSchema accepts empty proof array", () => {
    const result = MerkleProofSchema.safeParse({
      recordId: VALID_UUID, recordHash: "h", proof: [], root: "r", blockNumber: 0, verified: false,
    });
    expect(result.success).toBe(true);
  });

  it("5. MerkleProofSchema rejects invalid recordId", () => {
    expect(MerkleProofSchema.safeParse({
      recordId: "bad", recordHash: "h", proof: [], root: "r", blockNumber: 0, verified: false,
    }).success).toBe(false);
  });

  // ── VerifyChainResponse ──
  it("6. VerifyChainResponseSchema accepts valid response with no broken links", () => {
    const result = VerifyChainResponseSchema.safeParse({
      isValid: true, totalTransactions: 100, verifiedTransactions: 100,
      brokenLinks: [], integrityPercentage: 100,
    });
    expect(result.success).toBe(true);
  });

  it("7. VerifyChainResponseSchema accepts response with broken links", () => {
    const result = VerifyChainResponseSchema.safeParse({
      isValid: false, totalTransactions: 10, verifiedTransactions: 8,
      brokenLinks: [{ transactionId: VALID_UUID, expectedHash: "a", actualHash: "b", timestamp: VALID_TIMESTAMP }],
      integrityPercentage: 80,
    });
    expect(result.success).toBe(true);
  });

  it("8. VerifyChainResponseSchema rejects integrityPercentage > 100", () => {
    expect(VerifyChainResponseSchema.safeParse({
      isValid: true, totalTransactions: 1, verifiedTransactions: 1,
      brokenLinks: [], integrityPercentage: 101,
    }).success).toBe(false);
  });

  it("9. VerifyChainResponseSchema rejects integrityPercentage < 0", () => {
    expect(VerifyChainResponseSchema.safeParse({
      isValid: false, totalTransactions: 1, verifiedTransactions: 0,
      brokenLinks: [], integrityPercentage: -1,
    }).success).toBe(false);
  });

  // ── ConsentType ──
  it("10. ConsentTypeSchema accepts all valid types", () => {
    for (const t of ["data_sharing", "research_participation", "marketing", "emergency_access", "provider_access"]) {
      expect(ConsentTypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it("11. ConsentTypeSchema rejects unknown types", () => {
    expect(ConsentTypeSchema.safeParse("analytics").success).toBe(false);
  });

  // ── ConsentScope ──
  it("12. ConsentScopeSchema accepts empty object", () => {
    expect(ConsentScopeSchema.safeParse({}).success).toBe(true);
  });

  it("13. ConsentScopeSchema rejects invalid provider UUIDs", () => {
    expect(ConsentScopeSchema.safeParse({ providers: ["not-uuid"] }).success).toBe(false);
    expect(ConsentScopeSchema.safeParse({ providers: [VALID_UUID] }).success).toBe(true);
  });

  // ── ConsentRecord ──
  it("14. ConsentRecordSchema accepts valid record", () => {
    const result = ConsentRecordSchema.safeParse({
      id: VALID_UUID, patient_id: VALID_UUID, consent_type: "data_sharing",
      purpose: "Share with doctor", scope: null, granted_at: VALID_TIMESTAMP,
      expires_at: null, revoked_at: null, is_active: true, digital_signature: null,
    });
    expect(result.success).toBe(true);
  });

  it("15. ConsentRecordSchema rejects missing required purpose field", () => {
    expect(ConsentRecordSchema.safeParse({
      id: VALID_UUID, patient_id: VALID_UUID, consent_type: "data_sharing",
      scope: null, granted_at: null, expires_at: null, revoked_at: null,
      is_active: true, digital_signature: null,
    }).success).toBe(false);
  });
});
