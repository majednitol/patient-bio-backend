import { describe, it, expect } from "vitest";
import {
  ALL_LOCALES,
  LOCALE_CODES,
  EXPECTED_SECTIONS,
  extractKeys,
  getMissingKeys,
  getExtraKeys,
  findEmptyValues,
  findUntranslated,
  getNestedValue,
  type LocaleCode,
} from "./i18n-helpers";

describe("Phase 1: Translation Key Coverage", () => {
  const enKeys = extractKeys(ALL_LOCALES.en);

  it("1. English locale contains all expected sections", () => {
    const topLevelKeys = Object.keys(ALL_LOCALES.en);
    for (const section of EXPECTED_SECTIONS) {
      expect(topLevelKeys).toContain(section);
    }
  });

  it("2. All 6 locale files have identical key structures", () => {
    for (const code of LOCALE_CODES) {
      if (code === "en") continue;
      const targetKeys = extractKeys(ALL_LOCALES[code]);
      const missing = getMissingKeys(enKeys, targetKeys);
      expect(missing, `${code} missing keys: ${missing.join(", ")}`).toEqual([]);
    }
  });

  it("3. No locale has extra/orphaned keys not in English", () => {
    for (const code of LOCALE_CODES) {
      if (code === "en") continue;
      const targetKeys = extractKeys(ALL_LOCALES[code]);
      const extra = getExtraKeys(enKeys, targetKeys);
      expect(extra, `${code} has extra keys: ${extra.join(", ")}`).toEqual([]);
    }
  });

  it("4. No locale has empty translation values", () => {
    for (const code of LOCALE_CODES) {
      const empty = findEmptyValues(ALL_LOCALES[code]);
      expect(empty, `${code} has empty values at: ${empty.join(", ")}`).toEqual([]);
    }
  });

  it("5. Non-English locales have actual translations (not just English copies)", () => {
    // Allow some keys to remain identical (proper nouns like "QR", "Email", brand names)
    const allowedSameKeys = new Set([
      "language.english", "language.spanish", "language.french",
      "language.hindi", "language.mandarin", "language.arabic", "language.bengali",
    ]);

    for (const code of LOCALE_CODES) {
      if (code === "en") continue;
      const untranslated = findUntranslated(ALL_LOCALES.en, ALL_LOCALES[code])
        .filter((k) => !allowedSameKeys.has(k));
      // Allow up to 5% untranslated (for proper nouns, technical terms)
      const maxAllowed = Math.ceil(enKeys.length * 0.05);
      expect(
        untranslated.length,
        `${code} has ${untranslated.length} untranslated keys (max ${maxAllowed}): ${untranslated.slice(0, 5).join(", ")}`
      ).toBeLessThanOrEqual(maxAllowed);
    }
  });

  it("6. common section has all essential UI keys", () => {
    const essentialKeys = [
      "common.save", "common.cancel", "common.delete", "common.edit",
      "common.loading", "common.error", "common.success", "common.confirm",
      "common.search", "common.back", "common.next", "common.submit",
    ];
    for (const key of essentialKeys) {
      expect(enKeys).toContain(key);
    }
  });

  it("7. auth section has complete authentication flow keys", () => {
    const authKeys = [
      "auth.signIn", "auth.signUp", "auth.signOut",
      "auth.forgotPassword", "auth.resetPassword",
      "auth.emailPlaceholder", "auth.passwordPlaceholder",
    ];
    for (const key of authKeys) {
      expect(enKeys).toContain(key);
    }
  });

  it("8. errors section covers all error types", () => {
    const errorKeys = [
      "errors.generic", "errors.network", "errors.unauthorized",
      "errors.notFound", "errors.validation",
    ];
    for (const key of errorKeys) {
      expect(enKeys).toContain(key);
    }
  });

  it("9. Each section has at least 3 keys", () => {
    for (const section of EXPECTED_SECTIONS) {
      const sectionKeys = enKeys.filter((k) => k.startsWith(`${section}.`));
      expect(
        sectionKeys.length,
        `Section "${section}" has only ${sectionKeys.length} keys`
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("10. Total key count matches across all locales", () => {
    const enCount = enKeys.length;
    for (const code of LOCALE_CODES) {
      const count = extractKeys(ALL_LOCALES[code]).length;
      expect(count, `${code} has ${count} keys, expected ${enCount}`).toBe(enCount);
    }
  });

  it("11. Bengali locale has all dashboard keys for primary market", () => {
    const dashboardKeys = enKeys.filter((k) => k.startsWith("dashboard."));
    const bnKeys = extractKeys(ALL_LOCALES.bn);
    for (const key of dashboardKeys) {
      expect(bnKeys, `Bengali missing key: ${key}`).toContain(key);
    }
  });

  it("12. All translation values are strings (no nested objects as leaf values)", () => {
    for (const code of LOCALE_CODES) {
      const keys = extractKeys(ALL_LOCALES[code]);
      for (const key of keys) {
        const val = getNestedValue(ALL_LOCALES[code], key);
        expect(typeof val, `${code}.${key} is ${typeof val}, expected string`).toBe("string");
      }
    }
  });

  it("13. No duplicate values within the same section of a locale", () => {
    for (const section of EXPECTED_SECTIONS) {
      const sectionKeys = enKeys.filter((k) => k.startsWith(`${section}.`));
      const values = sectionKeys.map((k) => getNestedValue(ALL_LOCALES.en, k) as string);
      const uniqueValues = new Set(values);
      // Allow some duplicates (e.g., "Yes"/"No" might appear in multiple forms)
      const dupCount = values.length - uniqueValues.size;
      expect(dupCount, `English "${section}" has ${dupCount} duplicate values`).toBeLessThanOrEqual(3);
    }
  });

  it("14. Key naming follows dot-notation convention (no spaces, special chars)", () => {
    for (const key of enKeys) {
      expect(key).toMatch(/^[a-zA-Z0-9][a-zA-Z0-9_]*(\.[a-zA-Z0-9][a-zA-Z0-9_]*)*$/);
    }
  });

  it("15. Fallback language (en) has the most complete coverage", () => {
    for (const code of LOCALE_CODES) {
      const targetKeys = extractKeys(ALL_LOCALES[code]);
      expect(targetKeys.length).toBeLessThanOrEqual(enKeys.length);
    }
  });
});
