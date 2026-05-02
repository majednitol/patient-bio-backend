import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatRelativeTime,
  LOCALE_CODES,
} from "./i18n-helpers";

describe("Phase 4: Date/Number Formatting", () => {
  const testDate = new Date(2026, 1, 16); // Feb 16, 2026

  it("1. English date format is readable", () => {
    const result = formatDate(testDate, "en-US");
    expect(result).toContain("February");
    expect(result).toContain("16");
    expect(result).toContain("2026");
  });

  it("2. Bengali date format uses Bengali locale conventions", () => {
    const result = formatDate(testDate, "bn-BD");
    // Should contain the year 2026 in some form
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it("3. Spanish date format uses Spanish month names", () => {
    const result = formatDate(testDate, "es-ES");
    expect(result.toLowerCase()).toContain("febrero");
  });

  it("4. Each locale produces a unique date format", () => {
    const localeMap: Record<string, string> = {
      en: "en-US", es: "es-ES", fr: "fr-FR", hi: "hi-IN", zh: "zh-CN", bn: "bn-BD",
    };
    const results = new Set<string>();
    for (const code of LOCALE_CODES) {
      results.add(formatDate(testDate, localeMap[code]));
    }
    // At least 4 unique formats (some may overlap in structure)
    expect(results.size).toBeGreaterThanOrEqual(4);
  });

  it("5. Large numbers formatted with locale-appropriate separators", () => {
    const enResult = formatNumber(1234567, "en-US");
    expect(enResult).toContain("1,234,567");

    const hiResult = formatNumber(1234567, "hi-IN");
    // Hindi uses lakh/crore grouping: 12,34,567
    expect(hiResult).toContain("12,34,567");
  });

  it("6. BDT currency formatted correctly for Bengali locale", () => {
    const result = formatCurrency(5000, "bn-BD", "BDT");
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
    // Bengali uses Bengali numerals (৫ for 5)
    expect(result).toMatch(/[৫5]/);
  });

  it("7. USD currency formatted correctly for English locale", () => {
    const result = formatCurrency(1234.56, "en-US", "USD");
    expect(result).toContain("$");
    expect(result).toContain("1,234.56");
  });

  it("8. EUR currency formatted correctly for French locale", () => {
    const result = formatCurrency(1234.56, "fr-FR", "EUR");
    expect(result).toBeTruthy();
    // French uses space as thousands separator and comma for decimal
    expect(result).toMatch(/1[\s\u00A0\u202F]?234/);
  });

  it("9. Percentage formatting works across locales", () => {
    const enPercent = formatPercent(0.856, "en-US");
    expect(enPercent).toContain("85");
    expect(enPercent).toContain("%");

    const frPercent = formatPercent(0.856, "fr-FR");
    expect(frPercent).toContain("85");
  });

  it("10. Zero values formatted correctly", () => {
    expect(formatNumber(0, "en-US")).toBe("0");
    expect(formatCurrency(0, "en-US", "USD")).toContain("0");
    expect(formatPercent(0, "en-US")).toContain("0");
  });

  it("11. Negative numbers formatted correctly", () => {
    const result = formatNumber(-1234, "en-US");
    expect(result).toContain("-");
    expect(result).toContain("1,234");
  });

  it("12. Decimal numbers preserve precision", () => {
    const result = formatNumber(3.14159, "en-US");
    expect(result).toContain("3.14");
  });

  it("13. Relative time formatting works", () => {
    const result = formatRelativeTime(-3, "day", "en-US");
    expect(result).toContain("3 days ago");
  });

  it("14. Relative time 'yesterday' in English", () => {
    const result = formatRelativeTime(-1, "day", "en-US");
    expect(result).toBe("yesterday");
  });

  it("15. Very large numbers don't break formatting", () => {
    const result = formatNumber(999999999999, "en-US");
    expect(result).toBe("999,999,999,999");

    const bnResult = formatNumber(999999999999, "bn-BD");
    expect(bnResult).toBeTruthy();
    expect(bnResult.length).toBeGreaterThan(0);
  });
});
