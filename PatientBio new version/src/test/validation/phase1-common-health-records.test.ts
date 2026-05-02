import { describe, it, expect } from "vitest";
import {
  UUIDSchema,
  TimestampSchema,
  PaginationParamsSchema,
  PaginatedResponseSchema,
  DiseaseCategorySchema,
  RecordCategorySchema,
  HealthRecordSchema,
  CreateHealthRecordSchema,
} from "@/lib/validation";
import { z } from "zod";

const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const VALID_TIMESTAMP = "2026-02-16T10:00:00.000Z";
const VALID_URL = "https://example.com/file.pdf";

describe("Phase 1: Common & Health Record Schema Validation", () => {
  // ── UUID ──
  it("1. UUIDSchema accepts valid UUID", () => {
    expect(UUIDSchema.safeParse(VALID_UUID).success).toBe(true);
  });

  it("2. UUIDSchema rejects non-UUID strings", () => {
    expect(UUIDSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(UUIDSchema.safeParse("").success).toBe(false);
    expect(UUIDSchema.safeParse(123).success).toBe(false);
    expect(UUIDSchema.safeParse(null).success).toBe(false);
  });

  // ── Timestamp ──
  it("3. TimestampSchema accepts ISO datetime string", () => {
    expect(TimestampSchema.safeParse(VALID_TIMESTAMP).success).toBe(true);
  });

  it("4. TimestampSchema accepts Date object", () => {
    expect(TimestampSchema.safeParse(new Date()).success).toBe(true);
  });

  it("5. TimestampSchema rejects invalid date strings", () => {
    expect(TimestampSchema.safeParse("not-a-date").success).toBe(false);
    expect(TimestampSchema.safeParse("2026-13-45").success).toBe(false);
    expect(TimestampSchema.safeParse(12345).success).toBe(false);
  });

  // ── Pagination ──
  it("6. PaginationParamsSchema accepts valid params with defaults", () => {
    const result = PaginationParamsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
      expect(result.data.direction).toBe("desc");
    }
  });

  it("7. PaginationParamsSchema rejects limit=0 and limit=101", () => {
    expect(PaginationParamsSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(PaginationParamsSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it("8. PaginationParamsSchema accepts boundary limits 1 and 100", () => {
    expect(PaginationParamsSchema.safeParse({ limit: 1 }).success).toBe(true);
    expect(PaginationParamsSchema.safeParse({ limit: 100 }).success).toBe(true);
  });

  it("9. PaginationParamsSchema rejects invalid direction", () => {
    expect(PaginationParamsSchema.safeParse({ direction: "up" }).success).toBe(false);
  });

  // ── Disease & Record Category ──
  it("10. DiseaseCategorySchema accepts all valid categories", () => {
    for (const cat of ["general", "cancer", "covid19", "diabetes", "heart_disease", "mental_health", "respiratory", "other"]) {
      expect(DiseaseCategorySchema.safeParse(cat).success).toBe(true);
    }
  });

  it("11. DiseaseCategorySchema rejects invalid category", () => {
    expect(DiseaseCategorySchema.safeParse("invalid").success).toBe(false);
    expect(DiseaseCategorySchema.safeParse("").success).toBe(false);
  });

  it("12. RecordCategorySchema accepts all valid categories", () => {
    for (const cat of ["lab_result", "prescription", "imaging", "clinical_note", "immunization", "procedure", "other"]) {
      expect(RecordCategorySchema.safeParse(cat).success).toBe(true);
    }
  });

  // ── Health Record ──
  it("13. HealthRecordSchema accepts valid complete record", () => {
    const result = HealthRecordSchema.safeParse({
      id: VALID_UUID, user_id: VALID_UUID, title: "Blood Test",
      description: null, file_url: VALID_URL, file_type: "pdf",
      file_size: 1024, category: "lab_result", disease_category: "general",
      provider_name: "Hospital A", record_date: "2026-01-01", notes: null,
      is_encrypted: false, uploaded_at: VALID_TIMESTAMP,
    });
    expect(result.success).toBe(true);
  });

  it("14. HealthRecordSchema rejects empty title and title over 255 chars", () => {
    const base = { id: VALID_UUID, user_id: VALID_UUID, description: null, file_url: VALID_URL, file_type: null, file_size: null, category: null, disease_category: null, provider_name: null, record_date: null, notes: null, is_encrypted: false, uploaded_at: VALID_TIMESTAMP };
    expect(HealthRecordSchema.safeParse({ ...base, title: "" }).success).toBe(false);
    expect(HealthRecordSchema.safeParse({ ...base, title: "x".repeat(256) }).success).toBe(false);
    expect(HealthRecordSchema.safeParse({ ...base, title: "x".repeat(255) }).success).toBe(true);
  });

  it("15. HealthRecordSchema rejects invalid file_url", () => {
    const base = { id: VALID_UUID, user_id: VALID_UUID, title: "Test", description: null, file_type: null, file_size: null, category: null, disease_category: null, provider_name: null, record_date: null, notes: null, is_encrypted: false, uploaded_at: VALID_TIMESTAMP };
    expect(HealthRecordSchema.safeParse({ ...base, file_url: "not-a-url" }).success).toBe(false);
  });
});
