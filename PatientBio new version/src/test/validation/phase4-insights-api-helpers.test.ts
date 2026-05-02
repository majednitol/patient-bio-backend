import { describe, it, expect } from "vitest";
import {
  HealthInsightSeveritySchema,
  HealthInsightSchema,
  MedicationInteractionSchema,
  MedicationCheckResponseSchema,
  ApiSuccessSchema,
  ApiErrorSchema,
  ApiResponseSchema,
  validateOrThrow,
  validateOrNull,
  validateWithDefault,
  UUIDSchema,
} from "@/lib/validation";
import { z } from "zod";

const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const VALID_TIMESTAMP = "2026-02-16T10:00:00.000Z";

describe("Phase 4: Insights, Medications, API Wrappers & Helpers", () => {
  // ── Health Insight ──
  it("1. HealthInsightSeveritySchema accepts all valid severities", () => {
    for (const s of ["info", "warning", "alert", "critical"]) {
      expect(HealthInsightSeveritySchema.safeParse(s).success).toBe(true);
    }
    expect(HealthInsightSeveritySchema.safeParse("danger").success).toBe(false);
  });

  it("2. HealthInsightSchema accepts valid insight", () => {
    const result = HealthInsightSchema.safeParse({
      id: VALID_UUID, user_id: VALID_UUID, insight_type: "trend",
      title: "BP Rising", content: "Your blood pressure has been rising",
      severity: "warning", metric_types: ["blood_pressure"],
      data_summary: { avg: 140 }, is_read: false,
      generated_at: VALID_TIMESTAMP, expires_at: null,
    });
    expect(result.success).toBe(true);
  });

  it("3. HealthInsightSchema defaults is_read to false", () => {
    const result = HealthInsightSchema.safeParse({
      id: VALID_UUID, user_id: VALID_UUID, insight_type: "alert",
      title: "T", content: "C", severity: null, metric_types: null,
      data_summary: null, generated_at: VALID_TIMESTAMP, expires_at: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.is_read).toBe(false);
  });

  // ── Medication Interaction ──
  it("4. MedicationInteractionSchema accepts valid interaction", () => {
    expect(MedicationInteractionSchema.safeParse({
      medication1: "Aspirin", medication2: "Warfarin",
      severity: "major", description: "Increased bleeding risk",
      recommendation: "Monitor INR closely",
    }).success).toBe(true);
  });

  it("5. MedicationInteractionSchema rejects invalid severity", () => {
    expect(MedicationInteractionSchema.safeParse({
      medication1: "A", medication2: "B", severity: "extreme",
      description: "d", recommendation: "r",
    }).success).toBe(false);
  });

  it("6. MedicationCheckResponseSchema accepts valid check", () => {
    const result = MedicationCheckResponseSchema.safeParse({
      medications: ["Aspirin", "Warfarin"],
      interactions: [{ medication1: "Aspirin", medication2: "Warfarin", severity: "major", description: "d", recommendation: "r" }],
      warnings: ["High risk"], checkedAt: VALID_TIMESTAMP,
    });
    expect(result.success).toBe(true);
  });

  it("7. MedicationCheckResponseSchema accepts empty interactions and warnings", () => {
    expect(MedicationCheckResponseSchema.safeParse({
      medications: ["Paracetamol"], interactions: [], warnings: [], checkedAt: VALID_TIMESTAMP,
    }).success).toBe(true);
  });

  // ── API Wrappers ──
  it("8. ApiSuccessSchema accepts valid success response", () => {
    const schema = ApiSuccessSchema(z.string());
    expect(schema.safeParse({ success: true, data: "hello" }).success).toBe(true);
  });

  it("9. ApiSuccessSchema rejects success=false", () => {
    const schema = ApiSuccessSchema(z.string());
    expect(schema.safeParse({ success: false, data: "hello" }).success).toBe(false);
  });

  it("10. ApiErrorSchema accepts valid error response", () => {
    expect(ApiErrorSchema.safeParse({ success: false, error: "Not found" }).success).toBe(true);
    expect(ApiErrorSchema.safeParse({ success: false, error: "Err", code: "404", details: { field: "id" } }).success).toBe(true);
  });

  it("11. ApiResponseSchema accepts both success and error variants", () => {
    const schema = ApiResponseSchema(z.number());
    expect(schema.safeParse({ success: true, data: 42 }).success).toBe(true);
    expect(schema.safeParse({ success: false, error: "fail" }).success).toBe(true);
  });

  // ── Validation Helpers ──
  it("12. validateOrThrow returns data on valid input", () => {
    const result = validateOrThrow(UUIDSchema, VALID_UUID);
    expect(result).toBe(VALID_UUID);
  });

  it("13. validateOrThrow throws on invalid input", () => {
    expect(() => validateOrThrow(UUIDSchema, "bad")).toThrow("Validation error");
  });

  it("14. validateOrNull returns null on invalid input", () => {
    expect(validateOrNull(UUIDSchema, "bad")).toBeNull();
    expect(validateOrNull(UUIDSchema, VALID_UUID)).toBe(VALID_UUID);
  });

  it("15. validateWithDefault returns default on invalid input", () => {
    expect(validateWithDefault(UUIDSchema, "bad", "fallback-uuid")).toBe("fallback-uuid");
    expect(validateWithDefault(UUIDSchema, VALID_UUID, "fallback")).toBe(VALID_UUID);
  });
});
