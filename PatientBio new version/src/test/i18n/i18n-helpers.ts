/**
 * i18n Test Helpers
 * Pure utilities for validating translation coverage, locale formatting, and RTL support.
 */

import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import hi from "@/locales/hi.json";
import zh from "@/locales/zh.json";
import bn from "@/locales/bn.json";

// ── Types ──

export type LocaleCode = "en" | "es" | "fr" | "hi" | "zh" | "bn";

export interface LanguageConfig {
  code: LocaleCode;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
}

// ── Constants ──

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", dir: "ltr" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr" },
  { code: "zh", name: "Mandarin", nativeName: "中文", dir: "ltr" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", dir: "ltr" },
];

export const ALL_LOCALES: Record<LocaleCode, Record<string, any>> = {
  en, es, fr, hi, zh, bn,
};

export const LOCALE_CODES: LocaleCode[] = ["en", "es", "fr", "hi", "zh", "bn"];

// ── Key Extraction ──

/** Recursively extract all dot-separated keys from a nested object */
export function extractKeys(obj: Record<string, any>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...extractKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

/** Get keys present in source but missing from target */
export function getMissingKeys(sourceKeys: string[], targetKeys: string[]): string[] {
  const targetSet = new Set(targetKeys);
  return sourceKeys.filter((k) => !targetSet.has(k));
}

/** Get keys in target that don't exist in source (extra/orphaned) */
export function getExtraKeys(sourceKeys: string[], targetKeys: string[]): string[] {
  const sourceSet = new Set(sourceKeys);
  return targetKeys.filter((k) => !sourceSet.has(k));
}

// ── Value Validation ──

/** Check if a translation value is empty or just whitespace */
export function isEmptyTranslation(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  return false;
}

/** Get value at a dot-separated path from nested object */
export function getNestedValue(obj: Record<string, any>, path: string): unknown {
  return path.split(".").reduce((curr, key) => curr?.[key], obj);
}

/** Find keys with empty/whitespace values in a locale */
export function findEmptyValues(locale: Record<string, any>): string[] {
  const keys = extractKeys(locale);
  return keys.filter((k) => isEmptyTranslation(getNestedValue(locale, k)));
}

/** Find keys where translation is identical to English (possible untranslated) */
export function findUntranslated(enLocale: Record<string, any>, targetLocale: Record<string, any>): string[] {
  const keys = extractKeys(enLocale);
  return keys.filter((k) => {
    const enVal = getNestedValue(enLocale, k);
    const targetVal = getNestedValue(targetLocale, k);
    // Only flag strings, skip if intentionally same (like proper nouns)
    return typeof enVal === "string" && typeof targetVal === "string" && enVal === targetVal;
  });
}

// ── Interpolation ──

/** Extract interpolation variables like {{name}} from a translation string */
export function extractInterpolationVars(value: string): string[] {
  const matches = value.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return matches.map((m) => m.replace(/[{}]/g, ""));
}

/** Check that interpolation variables match between source and target */
export function interpolationVarsMatch(sourceVal: string, targetVal: string): boolean {
  const sourceVars = extractInterpolationVars(sourceVal).sort();
  const targetVars = extractInterpolationVars(targetVal).sort();
  return JSON.stringify(sourceVars) === JSON.stringify(targetVars);
}

// ── RTL Support ──

/** Check if a language should use RTL direction */
export function isRTL(code: string): boolean {
  const rtlLanguages = ["ar", "he", "fa", "ur"];
  return rtlLanguages.includes(code);
}

/** Get expected document direction for a locale */
export function getDirection(code: string): "ltr" | "rtl" {
  return isRTL(code) ? "rtl" : "ltr";
}

/** Simulate setting document direction on language change */
export function simulateDirectionChange(langCode: string): { dir: "ltr" | "rtl"; lang: string } {
  return { dir: getDirection(langCode), lang: langCode };
}

// ── Date/Number Formatting ──

export interface FormatOptions {
  locale: string;
  timezone?: string;
}

/** Format a date according to locale conventions */
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** Format a number according to locale conventions */
export function formatNumber(num: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(num);
}

/** Format currency (BDT default for Bangladesh context) */
export function formatCurrency(amount: number, locale: string, currency = "BDT"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/** Format a percentage */
export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Format relative time (e.g. "3 days ago") */
export function formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, locale: string): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
}

// ── Section Keys (for coverage reporting) ──

export const EXPECTED_SECTIONS = [
  "common",
  "auth",
  "dashboard",
  "profile",
  "healthData",
  "sharing",
  "notifications",
  "security",
  "offline",
  "language",
  "errors",
];
