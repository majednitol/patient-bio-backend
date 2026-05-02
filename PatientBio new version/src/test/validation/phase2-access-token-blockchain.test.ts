import { describe, it, expect } from "vitest";
import {
  AccessTokenSchema,
  CreateAccessTokenSchema,
  TransactionTypeSchema,
  BlockchainTransactionSchema,
  RecordTransactionRequestSchema,
} from "@/lib/validation";

const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const VALID_TIMESTAMP = "2026-02-16T10:00:00.000Z";
const VALID_HASH = "a".repeat(64);

describe("Phase 2: Access Token & Blockchain Schema Validation", () => {
  // ── Access Token ──
  it("1. AccessTokenSchema accepts valid token", () => {
    const result = AccessTokenSchema.safeParse({
      id: VALID_UUID, user_id: VALID_UUID, token: "a".repeat(32),
      label: "My Token", expires_at: VALID_TIMESTAMP, is_revoked: false,
      access_count: 0, accessed_at: null, created_at: VALID_TIMESTAMP,
    });
    expect(result.success).toBe(true);
  });

  it("2. AccessTokenSchema rejects token shorter than 32 chars", () => {
    const result = AccessTokenSchema.safeParse({
      id: VALID_UUID, user_id: VALID_UUID, token: "short",
      label: null, expires_at: VALID_TIMESTAMP, is_revoked: false,
      access_count: 0, accessed_at: null, created_at: VALID_TIMESTAMP,
    });
    expect(result.success).toBe(false);
  });

  it("3. AccessTokenSchema accepts exactly 32-char token (boundary)", () => {
    const result = AccessTokenSchema.safeParse({
      id: VALID_UUID, user_id: VALID_UUID, token: "x".repeat(32),
      label: null, expires_at: VALID_TIMESTAMP, is_revoked: false,
      access_count: 0, accessed_at: null, created_at: VALID_TIMESTAMP,
    });
    expect(result.success).toBe(true);
  });

  // ── CreateAccessToken ──
  it("4. CreateAccessTokenSchema accepts valid creation params", () => {
    expect(CreateAccessTokenSchema.safeParse({ expiresInHours: 24 }).success).toBe(true);
    expect(CreateAccessTokenSchema.safeParse({ label: "Test", expiresInHours: 1 }).success).toBe(true);
  });

  it("5. CreateAccessTokenSchema rejects expiresInHours=0 and >8760", () => {
    expect(CreateAccessTokenSchema.safeParse({ expiresInHours: 0 }).success).toBe(false);
    expect(CreateAccessTokenSchema.safeParse({ expiresInHours: 8761 }).success).toBe(false);
  });

  it("6. CreateAccessTokenSchema boundary: 1h and 8760h accepted", () => {
    expect(CreateAccessTokenSchema.safeParse({ expiresInHours: 1 }).success).toBe(true);
    expect(CreateAccessTokenSchema.safeParse({ expiresInHours: 8760 }).success).toBe(true);
  });

  it("7. CreateAccessTokenSchema rejects label over 100 chars", () => {
    expect(CreateAccessTokenSchema.safeParse({ label: "x".repeat(101), expiresInHours: 24 }).success).toBe(false);
    expect(CreateAccessTokenSchema.safeParse({ label: "x".repeat(100), expiresInHours: 24 }).success).toBe(true);
  });

  // ── Transaction Type ──
  it("8. TransactionTypeSchema accepts all valid types", () => {
    const types = ["HEALTH_RECORD_CREATED", "HEALTH_RECORD_ACCESSED", "HEALTH_RECORD_UPDATED",
      "HEALTH_RECORD_DELETED", "ACCESS_GRANTED", "ACCESS_REVOKED", "CONSENT_GIVEN",
      "CONSENT_WITHDRAWN", "DATA_EXPORTED", "CROSS_BORDER_TRANSFER", "EMERGENCY_ACCESS", "PROVIDER_VERIFIED"];
    for (const t of types) {
      expect(TransactionTypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it("9. TransactionTypeSchema rejects unknown type", () => {
    expect(TransactionTypeSchema.safeParse("UNKNOWN_TYPE").success).toBe(false);
    expect(TransactionTypeSchema.safeParse("").success).toBe(false);
  });

  // ── Blockchain Transaction ──
  it("10. BlockchainTransactionSchema accepts valid transaction", () => {
    const result = BlockchainTransactionSchema.safeParse({
      id: VALID_UUID, transaction_type: "HEALTH_RECORD_CREATED",
      actor_id: VALID_UUID, target_resource_type: "health_record",
      target_resource_id: VALID_UUID, data_hash: VALID_HASH,
      previous_hash: null, merkle_root: null, block_number: 1,
      timestamp: VALID_TIMESTAMP, signature: null, is_verified: false,
    });
    expect(result.success).toBe(true);
  });

  it("11. BlockchainTransactionSchema rejects data_hash not exactly 64 chars", () => {
    const base = { id: VALID_UUID, transaction_type: "HEALTH_RECORD_CREATED", actor_id: VALID_UUID, target_resource_type: null, target_resource_id: null, previous_hash: null, merkle_root: null, block_number: null, timestamp: VALID_TIMESTAMP, signature: null, is_verified: false };
    expect(BlockchainTransactionSchema.safeParse({ ...base, data_hash: "a".repeat(63) }).success).toBe(false);
    expect(BlockchainTransactionSchema.safeParse({ ...base, data_hash: "a".repeat(65) }).success).toBe(false);
    expect(BlockchainTransactionSchema.safeParse({ ...base, data_hash: "a".repeat(64) }).success).toBe(true);
  });

  // ── RecordTransactionRequest ──
  it("12. RecordTransactionRequestSchema accepts minimal request", () => {
    expect(RecordTransactionRequestSchema.safeParse({ transaction_type: "ACCESS_GRANTED" }).success).toBe(true);
  });

  it("13. RecordTransactionRequestSchema accepts full request with metadata", () => {
    const result = RecordTransactionRequestSchema.safeParse({
      transaction_type: "DATA_EXPORTED",
      target_resource_type: "health_record",
      target_resource_id: VALID_UUID,
      metadata: { format: "pdf", size: 1024 },
    });
    expect(result.success).toBe(true);
  });

  it("14. RecordTransactionRequestSchema rejects invalid target_resource_id", () => {
    expect(RecordTransactionRequestSchema.safeParse({
      transaction_type: "ACCESS_GRANTED", target_resource_id: "not-uuid",
    }).success).toBe(false);
  });

  it("15. BlockchainTransactionSchema defaults is_verified to false", () => {
    const result = BlockchainTransactionSchema.safeParse({
      id: VALID_UUID, transaction_type: "CONSENT_GIVEN", actor_id: VALID_UUID,
      target_resource_type: null, target_resource_id: null, data_hash: VALID_HASH,
      previous_hash: null, merkle_root: null, block_number: null,
      timestamp: VALID_TIMESTAMP, signature: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.is_verified).toBe(false);
  });
});
