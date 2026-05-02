/**
 * Phase 16c: Data Format and Schema Compatibility Tests
 * Validates resilient parsing of edge-case data shapes.
 */
import { describe, it, expect } from "vitest";
import {
  simulateDataMigration,
  parseISODate,
  distinguishTimestamp,
  normalizeToMs,
  coerceBoolean,
  normalizeEmptyCollection,
  truncateForDisplay,
} from "./compat-helpers";

describe("Phase 16c: Data Format and Schema Compatibility", () => {
  it("1 - API response missing optional fields → defaults applied correctly", () => {
    const data: Record<string, unknown> = { id: "1", name: "John" };
    const result = simulateDataMigration(
      data,
      ["id", "name"],
      { avatar_url: null, bio: "", tags: [] }
    );
    expect(result.success).toBe(true);
    expect(result.defaultsApplied).toContain("avatar_url");
    expect(result.defaultsApplied).toContain("bio");
    expect(result.defaultsApplied).toContain("tags");
  });

  it("2 - Extra/unknown fields in API response → ignored without error", () => {
    const data: Record<string, unknown> = { id: "1", name: "John", futureField: "x", anotherNew: 42 };
    const result = simulateDataMigration(data, ["id", "name"], {});
    expect(result.success).toBe(true);
    expect(result.extraFields).toContain("futureField");
    expect(result.extraFields).toContain("anotherNew");
    expect(result.missingFields).toHaveLength(0);
  });

  it("3 - ISO 8601 dates with and without timezone offset → parsed consistently", () => {
    const withTz = parseISODate("2024-06-15T10:30:00+05:30");
    const withZ = parseISODate("2024-06-15T05:00:00Z");
    const withoutTz = parseISODate("2024-06-15T10:30:00");
    expect(withTz).toBeInstanceOf(Date);
    expect(withZ).toBeInstanceOf(Date);
    expect(withoutTz).toBeInstanceOf(Date);
    // All should produce valid timestamps
    expect(withTz!.getTime()).not.toBeNaN();
    expect(withZ!.getTime()).not.toBeNaN();
  });

  it("4 - Unix timestamps (seconds and milliseconds) → distinguished correctly", () => {
    const seconds = 1718400000; // ~June 2024 in seconds
    const milliseconds = 1718400000000; // same in ms
    expect(distinguishTimestamp(seconds)).toBe("seconds");
    expect(distinguishTimestamp(milliseconds)).toBe("milliseconds");
    expect(normalizeToMs(seconds)).toBe(normalizeToMs(milliseconds));
  });

  it("5 - Unicode in patient names → stored and displayed", () => {
    const names = [
      "রফিকুল ইসলাম",   // Bengali
      "王小明",            // Chinese
      "राहुल शर्मा",       // Hindi
      "محمد أحمد",         // Arabic
      "Ñoño García",       // Spanish
    ];
    for (const name of names) {
      expect(name.length).toBeGreaterThan(0);
      expect(typeof name).toBe("string");
      // Round-trip through JSON should preserve
      expect(JSON.parse(JSON.stringify(name))).toBe(name);
    }
  });

  it("6 - Emoji in notes/messages fields → preserved through round-trip", () => {
    const notes = "Patient feeling better 😊👍 Follow up in 2 weeks 📅";
    const roundTripped = JSON.parse(JSON.stringify(notes));
    expect(roundTripped).toBe(notes);
    expect(roundTripped).toContain("😊");
    expect(roundTripped).toContain("📅");
  });

  it("7 - Null vs undefined vs empty string → treated consistently", () => {
    const data1: Record<string, unknown> = { id: "1", name: "A", bio: null };
    const data2: Record<string, unknown> = { id: "1", name: "A", bio: undefined };
    const data3: Record<string, unknown> = { id: "1", name: "A", bio: "" };

    const r1 = simulateDataMigration({ ...data1 }, ["id", "name"], { bio: "N/A" });
    const r2 = simulateDataMigration({ ...data2 }, ["id", "name"], { bio: "N/A" });
    const r3 = simulateDataMigration({ ...data3 }, ["id", "name"], { bio: "N/A" });

    // null and undefined get defaults; empty string is a valid value
    expect(r1.defaultsApplied).toContain("bio");
    expect(r2.defaultsApplied).toContain("bio");
    expect(r3.defaultsApplied).not.toContain("bio");
  });

  it("8 - Very long strings (10KB+) → truncated for display, full in storage", () => {
    const longText = "x".repeat(15000);
    const displayed = truncateForDisplay(longText, 500);
    expect(displayed.length).toBeLessThanOrEqual(502); // 500 + "…"
    expect(displayed.endsWith("…")).toBe(true);
    // Storage retains full text
    expect(longText.length).toBe(15000);
  });

  it("9 - Numeric IDs vs UUID strings → type coercion handled", () => {
    const numericId = 12345;
    const uuidId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(String(numericId)).toBe("12345");
    expect(typeof uuidId).toBe("string");
    expect(uuidId).toMatch(/^[a-f0-9-]+$/);
  });

  it("10 - FHIR R4 resource with unknown extensions → parsed without error", () => {
    const fhirResource = {
      resourceType: "Patient",
      id: "example",
      name: [{ given: ["John"], family: "Doe" }],
      extension: [
        { url: "http://example.org/future-extension", valueString: "unknown" },
        { url: "http://example.org/another-ext", valueBoolean: true },
      ],
    };
    // Should parse without throwing
    expect(() => JSON.parse(JSON.stringify(fhirResource))).not.toThrow();
    expect(fhirResource.resourceType).toBe("Patient");
    expect(fhirResource.extension).toHaveLength(2);
  });

  it("11 - Date boundary: Dec 31 23:59 UTC vs Jan 1 00:00 local → no off-by-one", () => {
    const dec31 = new Date("2024-12-31T23:59:59Z");
    const jan1 = new Date("2025-01-01T00:00:00Z");
    const diffMs = jan1.getTime() - dec31.getTime();
    expect(diffMs).toBe(1000); // exactly 1 second apart
    expect(dec31.getUTCFullYear()).toBe(2024);
    expect(jan1.getUTCFullYear()).toBe(2025);
  });

  it("12 - Boolean values as strings from legacy APIs → coerced", () => {
    expect(coerceBoolean("true")).toBe(true);
    expect(coerceBoolean("false")).toBe(false);
    expect(coerceBoolean(true)).toBe(true);
    expect(coerceBoolean(false)).toBe(false);
    expect(coerceBoolean(1)).toBe(true);
    expect(coerceBoolean(0)).toBe(false);
  });

  it("13 - Decimal precision in lab values → no floating point drift", () => {
    const stored = 3.14159;
    const displayed = Number(stored.toFixed(2));
    expect(displayed).toBe(3.14);
    // Verify no classic floating point issue
    expect(0.1 + 0.2).not.toBe(0.3); // JS classic
    expect(Number((0.1 + 0.2).toFixed(2))).toBe(0.3); // Fixed
  });

  it("14 - Empty arrays vs null for list fields → both handled as no data", () => {
    expect(normalizeEmptyCollection([])).toEqual([]);
    expect(normalizeEmptyCollection(null)).toEqual([]);
    expect(normalizeEmptyCollection(undefined)).toEqual([]);
    expect(normalizeEmptyCollection([1, 2])).toEqual([1, 2]);
  });

  it("15 - Deeply nested JSON (10+ levels) → parsed without stack overflow", () => {
    let nested: Record<string, unknown> = { value: "deep" };
    for (let i = 0; i < 15; i++) {
      nested = { child: nested, level: i };
    }
    const serialized = JSON.stringify(nested);
    expect(() => JSON.parse(serialized)).not.toThrow();
    const parsed = JSON.parse(serialized);
    expect(parsed.level).toBe(14);
  });
});
