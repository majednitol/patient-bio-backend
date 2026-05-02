/**
 * ICD-11 Chapter Mapping Utility
 * Maps disease categories to standardized ICD-11 chapter codes and provides
 * bidirectional lookup between plain-text categories and ICD-11 chapters.
 */

export interface ICD11ChapterInfo {
  code: string;
  name: string;
  description: string;
  diseaseCategory: string; // legacy disease_category enum value
}

/**
 * Complete ICD-11 chapter reference with mapping to legacy disease_category values.
 */
export const ICD11_CHAPTERS: ICD11ChapterInfo[] = [
  { code: "1", name: "Infectious Diseases", description: "Certain infectious or parasitic diseases", diseaseCategory: "covid19" },
  { code: "2", name: "Neoplasms", description: "Neoplasms (cancer, tumors)", diseaseCategory: "cancer" },
  { code: "3", name: "Blood Diseases", description: "Diseases of the blood or blood-forming organs", diseaseCategory: "other" },
  { code: "4", name: "Immune System", description: "Diseases of the immune system", diseaseCategory: "other" },
  { code: "5A", name: "Endocrine & Metabolic", description: "Endocrine, nutritional or metabolic diseases", diseaseCategory: "diabetes" },
  { code: "6A", name: "Mental Health", description: "Mental, behavioural or neurodevelopmental disorders", diseaseCategory: "other" },
  { code: "7", name: "Sleep-Wake", description: "Sleep-wake disorders", diseaseCategory: "other" },
  { code: "8", name: "Nervous System", description: "Diseases of the nervous system", diseaseCategory: "other" },
  { code: "9", name: "Visual System", description: "Diseases of the visual system", diseaseCategory: "other" },
  { code: "AA", name: "Ear & Mastoid", description: "Diseases of the ear or mastoid process", diseaseCategory: "other" },
  { code: "BA", name: "Circulatory System", description: "Diseases of the circulatory system", diseaseCategory: "heart_disease" },
  { code: "CA", name: "Respiratory System", description: "Diseases of the respiratory system", diseaseCategory: "other" },
  { code: "DA", name: "Digestive System", description: "Diseases of the digestive system", diseaseCategory: "other" },
  { code: "EA", name: "Skin", description: "Diseases of the skin", diseaseCategory: "other" },
  { code: "FA", name: "Musculoskeletal", description: "Diseases of the musculoskeletal system or connective tissue", diseaseCategory: "other" },
  { code: "GA", name: "Genitourinary", description: "Diseases of the genitourinary system", diseaseCategory: "other" },
  { code: "JA", name: "Pregnancy & Childbirth", description: "Pregnancy, childbirth or the puerperium", diseaseCategory: "other" },
  { code: "LA", name: "Developmental Anomalies", description: "Developmental anomalies", diseaseCategory: "other" },
  { code: "MA", name: "Symptoms & Signs", description: "Symptoms, signs or clinical findings, not elsewhere classified", diseaseCategory: "general" },
  { code: "NA", name: "Injury & Poisoning", description: "Injury, poisoning or certain other consequences of external causes", diseaseCategory: "other" },
];

/**
 * Map legacy disease_category enum value → ICD-11 chapter code
 */
export const DISEASE_CATEGORY_TO_ICD11: Record<string, string> = {
  cancer: "2",
  covid19: "1",
  diabetes: "5A",
  heart_disease: "BA",
  general: "MA",
  mental_health: "6A",
  respiratory: "CA",
  other: "",
};

/**
 * Map ICD-11 chapter code → legacy disease_category enum value
 */
export const ICD11_TO_DISEASE_CATEGORY: Record<string, string> = {
  "1": "covid19",
  "2": "cancer",
  "3": "other",
  "4": "other",
  "5A": "diabetes",
  "6A": "other",
  "7": "other",
  "8": "other",
  "9": "other",
  "AA": "other",
  "BA": "heart_disease",
  "CA": "other",
  "DA": "other",
  "EA": "other",
  "FA": "other",
  "GA": "other",
  "JA": "other",
  "LA": "other",
  "MA": "general",
  "NA": "other",
};

/**
 * Get the ICD-11 chapter code for a disease category
 */
export function getICD11ChapterCode(diseaseCategory: string | null | undefined): string | null {
  if (!diseaseCategory) return null;
  return DISEASE_CATEGORY_TO_ICD11[diseaseCategory] || null;
}

/**
 * Get the ICD-11 chapter info by code
 */
export function getICD11ChapterByCode(code: string): ICD11ChapterInfo | undefined {
  return ICD11_CHAPTERS.find((ch) => ch.code === code);
}

/**
 * Get the legacy disease category from an ICD-11 chapter code
 */
export function getDiseaseCategory(icd11ChapterCode: string | null | undefined): string | null {
  if (!icd11ChapterCode) return null;
  return ICD11_TO_DISEASE_CATEGORY[icd11ChapterCode] || "other";
}

/**
 * Get the ICD-11 chapter code from a full ICD-11 diagnosis code.
 * E.g., "BA00" → "BA", "5A11" → "5A", "1C40" → "1"
 */
export function extractICD11Chapter(icd11Code: string): string | null {
  if (!icd11Code) return null;

  // Check 2-char chapter codes first (BA, CA, DA, etc.)
  const twoChar = icd11Code.substring(0, 2);
  if (ICD11_CHAPTERS.some((ch) => ch.code === twoChar)) return twoChar;

  // Then single-char (1, 2, 3, etc.)
  const oneChar = icd11Code.substring(0, 1);
  if (ICD11_CHAPTERS.some((ch) => ch.code === oneChar)) return oneChar;

  return null;
}

/**
 * Display-friendly label for ICD-11 chapter code
 */
export function getICD11ChapterLabel(code: string | null | undefined): string {
  if (!code) return "—";
  const chapter = getICD11ChapterByCode(code);
  return chapter ? `${chapter.code} · ${chapter.name}` : code;
}
