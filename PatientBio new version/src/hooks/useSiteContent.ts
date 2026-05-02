import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { z } from "zod";

export interface HeroStats {
  stats: Array<{ value: string; label: string }>;
}

export interface ContactInfo {
  email: string;
  emailDescription: string;
  phone: string;
  phoneDescription: string;
  address: string;
  addressDescription: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQContent {
  faqs: FAQItem[];
}

// Default values used as fallbacks
export const DEFAULT_HERO_STATS: HeroStats = {
  stats: [
    { value: "195+", label: "Countries" },
    { value: "100%", label: "Patient Owned" },
    { value: "24/7", label: "Instant Access" },
  ],
};

export const DEFAULT_CONTACT_INFO: ContactInfo = {
  email: "hello@patientbio.app",
  emailDescription: "We'll respond within 24 hours",
  phone: "+880 1XXX-XXXXXX",
  phoneDescription: "Sun-Thu, 9am-6pm BST",
  address: "House 12, Road 5, Dhanmondi",
  addressDescription: "Dhaka 1205, Bangladesh",
};

export const DEFAULT_FAQ_CONTENT: FAQContent = {
  faqs: [
    {
      question: "How secure is my health data?",
      answer: "We use military-grade encryption and are HIPAA compliant. Your data is never sold or shared without explicit consent.",
    },
    {
      question: "Can I export my data?",
      answer: "Yes! You can export all your health records in standard formats like PDF, HL7, or FHIR at any time.",
    },
    {
      question: "Is Patient Bio free?",
      answer: "We offer a free tier with basic features. Premium plans unlock advanced features like family sharing and AI insights.",
    },
  ],
};

export interface GuidelinesContent {
  sections: Array<{ title: string; content: string }>;
  videos: Array<{ title: string; url: string; duration: string }>;
  faqs: Array<{ question: string; answer: string }>;
}

type ContentKey = "hero_stats" | "contact_info" | "faq_content" | `guidelines_${string}`;
type ContentValue = HeroStats | ContactInfo | FAQContent | GuidelinesContent;

const HeroStatSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const HeroStatsSchema = z.object({
  stats: z.array(HeroStatSchema).min(1),
});

const ContactInfoSchema = z.object({
  email: z.string(),
  emailDescription: z.string(),
  phone: z.string(),
  phoneDescription: z.string(),
  address: z.string(),
  addressDescription: z.string(),
});

const FAQItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const FAQContentSchema = z.object({
  faqs: z.array(FAQItemSchema),
});

function extractValueFromSiteContentResponse(data: unknown): unknown {
  // supabase-js should return an object with { value }, but in some cases we may receive an array.
  if (Array.isArray(data)) return data[0]?.value;
  if (data && typeof data === "object" && "value" in (data as Record<string, unknown>)) {
    return (data as Record<string, unknown>).value;
  }
  return undefined;
}

function normalizeHeroStats(raw: unknown, fallback: HeroStats): HeroStats {
  const parsed = HeroStatsSchema.safeParse(raw);
  if (parsed.success) return parsed.data as unknown as HeroStats;

  // Legacy shape: { countries, ownership, access }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const countries = typeof obj.countries === "string" ? obj.countries : undefined;
    const ownership = typeof obj.ownership === "string" ? obj.ownership : undefined;
    const access = typeof obj.access === "string" ? obj.access : undefined;

    if (countries || ownership || access) {
      return {
        stats: [
          { value: countries ?? fallback.stats[0]?.value ?? "", label: fallback.stats[0]?.label ?? "Countries" },
          { value: ownership ?? fallback.stats[1]?.value ?? "", label: fallback.stats[1]?.label ?? "Patient Owned" },
          { value: access ?? fallback.stats[2]?.value ?? "", label: fallback.stats[2]?.label ?? "Instant Access" },
        ],
      };
    }
  }

  return fallback;
}

function normalizeContactInfo(raw: unknown, fallback: ContactInfo): ContactInfo {
  const parsed = ContactInfoSchema.safeParse(raw);
  if (parsed.success) return parsed.data as unknown as ContactInfo;

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const email = typeof obj.email === "string" ? obj.email : fallback.email;
    const phone = typeof obj.phone === "string" ? obj.phone : fallback.phone;
    const address = typeof obj.address === "string" ? obj.address : fallback.address;

    const emailDescription =
      typeof obj.emailDescription === "string" ? obj.emailDescription : fallback.emailDescription;
    const phoneDescription =
      typeof obj.phoneDescription === "string" ? obj.phoneDescription : fallback.phoneDescription;
    const addressDescription =
      typeof obj.addressDescription === "string" ? obj.addressDescription : fallback.addressDescription;

    return { email, emailDescription, phone, phoneDescription, address, addressDescription };
  }

  return fallback;
}

function normalizeFAQContent(raw: unknown, fallback: FAQContent): FAQContent {
  const parsed = FAQContentSchema.safeParse(raw);
  if (parsed.success) return parsed.data as unknown as FAQContent;

  // Allow legacy array shape: [{question, answer}, ...]
  if (Array.isArray(raw)) {
    const arrayParsed = z.array(FAQItemSchema).safeParse(raw);
    if (arrayParsed.success) return { faqs: arrayParsed.data as unknown as FAQItem[] };
  }

  return fallback;
}

function normalizeContent(key: ContentKey, raw: unknown, fallback: ContentValue): ContentValue {
  switch (key) {
    case "hero_stats":
      return normalizeHeroStats(raw, fallback as HeroStats);
    case "contact_info":
      return normalizeContactInfo(raw, fallback as ContactInfo);
    case "faq_content":
      return normalizeFAQContent(raw, fallback as FAQContent);
    default:
      // guidelines_* keys pass through — shape matches expected interface
      if (typeof key === "string" && key.startsWith("guidelines_")) {
        return (raw && typeof raw === "object" ? raw : fallback) as ContentValue;
      }
      return fallback;
  }
}

export function useSiteContent<T extends ContentValue>(key: ContentKey, defaultValue: T) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["site-content", key],
    placeholderData: defaultValue as any,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", key)
        .maybeSingle();

      if (error) throw error;

      const raw = extractValueFromSiteContentResponse(data);
      if (raw === undefined || raw === null) return defaultValue;
      return normalizeContent(key, raw, defaultValue) as T;
    },
  });

  const mutation = useMutation({
    mutationFn: async (value: T) => {
      const { data: existing } = await supabase
        .from("site_content")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      // Normalize before persisting so the DB always stores our expected shape.
      const normalized = normalizeContent(key, value, defaultValue) as unknown as Json;

      if (existing) {
        const { error } = await supabase
          .from("site_content")
          .update({ value: normalized, updated_at: new Date().toISOString() })
          .eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_content")
          .insert([{ key, value: normalized }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-content", key] });
    },
  });

  return {
    data: query.data ?? defaultValue,
    isLoading: query.isLoading,
    error: query.error,
    update: mutation.mutate,
    updateAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
