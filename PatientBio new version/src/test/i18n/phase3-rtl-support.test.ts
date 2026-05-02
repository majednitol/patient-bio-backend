import { describe, it, expect } from "vitest";
import {
  SUPPORTED_LANGUAGES,
  LOCALE_CODES,
  isRTL,
  getDirection,
  simulateDirectionChange,
} from "./i18n-helpers";

describe("Phase 3: RTL Support", () => {
  it("1. English is LTR", () => {
    expect(getDirection("en")).toBe("ltr");
    expect(isRTL("en")).toBe(false);
  });

  it("2. Spanish is LTR", () => {
    expect(getDirection("es")).toBe("ltr");
  });

  it("3. French is LTR", () => {
    expect(getDirection("fr")).toBe("ltr");
  });

  it("4. Hindi is LTR", () => {
    expect(getDirection("hi")).toBe("ltr");
  });

  it("5. Mandarin is LTR", () => {
    expect(getDirection("zh")).toBe("ltr");
  });

  it("6. Bengali is LTR", () => {
    expect(getDirection("bn")).toBe("ltr");
  });

  it("7. Arabic would be RTL (future-proofing)", () => {
    expect(isRTL("ar")).toBe(true);
    expect(getDirection("ar")).toBe("rtl");
  });

  it("8. Hebrew would be RTL (future-proofing)", () => {
    expect(isRTL("he")).toBe(true);
    expect(getDirection("he")).toBe("rtl");
  });

  it("9. All currently supported languages are LTR", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.dir).toBe("ltr");
      expect(isRTL(lang.code)).toBe(false);
    }
  });

  it("10. simulateDirectionChange returns correct dir and lang", () => {
    const result = simulateDirectionChange("en");
    expect(result).toEqual({ dir: "ltr", lang: "en" });
  });

  it("11. simulateDirectionChange for RTL language sets dir=rtl", () => {
    const result = simulateDirectionChange("ar");
    expect(result).toEqual({ dir: "rtl", lang: "ar" });
  });

  it("12. Direction change is idempotent for same language", () => {
    const r1 = simulateDirectionChange("bn");
    const r2 = simulateDirectionChange("bn");
    expect(r1).toEqual(r2);
  });

  it("13. Switching from LTR to LTR keeps ltr direction", () => {
    const r1 = simulateDirectionChange("en");
    const r2 = simulateDirectionChange("es");
    expect(r1.dir).toBe("ltr");
    expect(r2.dir).toBe("ltr");
  });

  it("14. Switching from hypothetical RTL to LTR changes direction", () => {
    const rtl = simulateDirectionChange("ar");
    const ltr = simulateDirectionChange("en");
    expect(rtl.dir).toBe("rtl");
    expect(ltr.dir).toBe("ltr");
  });

  it("15. SUPPORTED_LANGUAGES dir property matches isRTL check", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const expected = isRTL(lang.code) ? "rtl" : "ltr";
      expect(lang.dir).toBe(expected);
    }
  });
});
