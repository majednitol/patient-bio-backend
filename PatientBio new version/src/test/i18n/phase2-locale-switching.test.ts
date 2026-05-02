import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ALL_LOCALES,
  LOCALE_CODES,
  SUPPORTED_LANGUAGES,
  getNestedValue,
  type LocaleCode,
} from "./i18n-helpers";

/**
 * Simulates i18n locale switching logic without initializing react-i18next.
 * Tests the pure logic: language resolution, fallback, localStorage, and resource loading.
 */

// Simulated i18n state
interface I18nState {
  currentLang: LocaleCode;
  fallbackLng: LocaleCode;
  resources: Record<LocaleCode, Record<string, any>>;
}

function createI18nState(initialLang: LocaleCode = "en"): I18nState {
  return {
    currentLang: initialLang,
    fallbackLng: "en",
    resources: ALL_LOCALES,
  };
}

function changeLanguage(state: I18nState, lang: string): I18nState {
  const supported = LOCALE_CODES as readonly string[];
  if (supported.includes(lang)) {
    return { ...state, currentLang: lang as LocaleCode };
  }
  return { ...state, currentLang: state.fallbackLng };
}

function t(state: I18nState, key: string): string {
  const val = getNestedValue(state.resources[state.currentLang], key);
  if (typeof val === "string") return val;
  // Fallback to English
  const fallbackVal = getNestedValue(state.resources[state.fallbackLng], key);
  if (typeof fallbackVal === "string") return fallbackVal;
  return key; // Return key if not found
}

describe("Phase 2: Locale Switching", () => {
  let state: I18nState;

  beforeEach(() => {
    state = createI18nState("en");
    localStorage.clear();
  });

  it("1. Default language is English", () => {
    expect(state.currentLang).toBe("en");
    expect(t(state, "common.save")).toBe("Save");
  });

  it("2. Switching to Spanish returns Spanish translations", () => {
    state = changeLanguage(state, "es");
    expect(state.currentLang).toBe("es");
    expect(t(state, "common.save")).toBe("Guardar");
  });

  it("3. Switching to Bengali returns Bengali translations", () => {
    state = changeLanguage(state, "bn");
    expect(t(state, "common.save")).toBe("সংরক্ষণ করুন");
  });

  it("4. Switching to French returns French translations", () => {
    state = changeLanguage(state, "fr");
    expect(t(state, "common.save")).toBe("Enregistrer");
  });

  it("5. Switching to Hindi returns Hindi translations", () => {
    state = changeLanguage(state, "hi");
    expect(t(state, "common.save")).toBe("सहेजें");
  });

  it("6. Switching to Mandarin returns Mandarin translations", () => {
    state = changeLanguage(state, "zh");
    expect(t(state, "common.save")).toBe("保存");
  });

  it("7. Unsupported locale falls back to English", () => {
    state = changeLanguage(state, "de");
    expect(state.currentLang).toBe("en");
    expect(t(state, "common.save")).toBe("Save");
  });

  it("8. Language preference persists in localStorage", () => {
    localStorage.setItem("i18nextLng", "bn");
    const stored = localStorage.getItem("i18nextLng");
    expect(stored).toBe("bn");
    // Simulate restoring from localStorage
    if (stored && (LOCALE_CODES as readonly string[]).includes(stored)) {
      state = changeLanguage(state, stored);
    }
    expect(state.currentLang).toBe("bn");
  });

  it("9. Clearing localStorage resets to fallback", () => {
    state = changeLanguage(state, "es");
    localStorage.setItem("i18nextLng", "es");
    localStorage.removeItem("i18nextLng");
    const stored = localStorage.getItem("i18nextLng");
    expect(stored).toBeNull();
    // Without stored preference, defaults to fallback
    const restoredLang = stored ?? state.fallbackLng;
    state = changeLanguage(state, restoredLang);
    expect(state.currentLang).toBe("en");
  });

  it("10. Rapid language switching maintains consistency", () => {
    state = changeLanguage(state, "es");
    state = changeLanguage(state, "fr");
    state = changeLanguage(state, "bn");
    state = changeLanguage(state, "hi");
    state = changeLanguage(state, "zh");
    expect(state.currentLang).toBe("zh");
    expect(t(state, "common.cancel")).toBe("取消");
  });

  it("11. Missing key returns the key itself as fallback", () => {
    const result = t(state, "nonexistent.key.path");
    expect(result).toBe("nonexistent.key.path");
  });

  it("12. Switching back to English after another language works", () => {
    state = changeLanguage(state, "bn");
    expect(t(state, "dashboard.title")).toBe("ড্যাশবোর্ড");
    state = changeLanguage(state, "en");
    expect(t(state, "dashboard.title")).toBe("Dashboard");
  });

  it("13. All 6 languages produce unique translations for common.save", () => {
    const translations = new Set<string>();
    for (const code of LOCALE_CODES) {
      state = changeLanguage(state, code);
      translations.add(t(state, "common.save"));
    }
    expect(translations.size).toBe(6);
  });

  it("14. SUPPORTED_LANGUAGES config matches available resources", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(ALL_LOCALES).toHaveProperty(lang.code);
      expect(Object.keys(ALL_LOCALES[lang.code]).length).toBeGreaterThan(0);
    }
  });

  it("15. Empty string language code falls back gracefully", () => {
    state = changeLanguage(state, "");
    expect(state.currentLang).toBe("en");
  });
});
