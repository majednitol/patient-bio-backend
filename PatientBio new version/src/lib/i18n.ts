import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Only import English statically — other locales loaded on demand
import en from "@/locales/en.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", dir: "ltr" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr" },
  { code: "zh", name: "Mandarin", nativeName: "中文", dir: "ltr" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", dir: "ltr" },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]["code"];

const LOCALE_LOADERS: Record<string, () => Promise<{ default: Record<string, any> }>> = {
  es: () => import("@/locales/es.json"),
  fr: () => import("@/locales/fr.json"),
  hi: () => import("@/locales/hi.json"),
  zh: () => import("@/locales/zh.json"),
  bn: () => import("@/locales/bn.json"),
};

/**
 * Lazily loads a locale bundle and adds it to i18n.
 * Returns immediately if already loaded.
 */
async function loadLocale(lng: string) {
  if (lng === "en" || i18n.hasResourceBundle(lng, "translation")) return;
  const loader = LOCALE_LOADERS[lng];
  if (!loader) return;
  const mod = await loader();
  i18n.addResourceBundle(lng, "translation", mod.default, true, true);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((lang) => lang.code),

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

// Load the detected language if it's not English
const detectedLng = i18n.language?.split("-")[0];
if (detectedLng && detectedLng !== "en") {
  loadLocale(detectedLng);
}

// Auto-load locale on language change
i18n.on("languageChanged", (lng) => {
  loadLocale(lng.split("-")[0]);
});

export { loadLocale };
export default i18n;
