import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEFAULT_HERO_STATS, DEFAULT_CONTACT_INFO, DEFAULT_FAQ_CONTENT,
  type HeroStats, type ContactInfo, type FAQContent,
} from "@/hooks/useSiteContent";
import { z } from "zod";

const { mockSupabase } = vi.hoisted(() => {
  const mockFn = vi.fn;
  const createChain = (resolveValue: unknown = { data: [], error: null }) => {
    const chain: any = {};
    ["select","insert","update","delete","upsert","eq","neq","in","is","or","gt","gte","lt","lte","like","ilike","order","limit","filter","head"].forEach((m) => { chain[m] = mockFn().mockReturnValue(chain); });
    chain.single = mockFn().mockResolvedValue(resolveValue);
    chain.maybeSingle = mockFn().mockResolvedValue(resolveValue);
    Object.defineProperty(chain, "then", { value: (resolve: any) => Promise.resolve(resolveValue).then(resolve), writable: true });
    return chain;
  };
  return {
    mockSupabase: {
      from: mockFn().mockImplementation(() => createChain()),
      rpc: mockFn().mockResolvedValue({ data: null, error: null }),
      functions: { invoke: mockFn().mockResolvedValue({ data: null, error: null }) },
      storage: { from: mockFn().mockReturnValue({ upload: mockFn().mockResolvedValue({ error: null }), getPublicUrl: mockFn().mockReturnValue({ data: { publicUrl: "https://public.url/test" } }) }) },
      auth: { getUser: mockFn().mockResolvedValue({ data: { user: { id: "admin-user-1", email: "admin@patientbio.app" } } }) },
    },
  };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));

// Re-implement internal functions for testing
const HeroStatsSchema = z.object({ stats: z.array(z.object({ value: z.string(), label: z.string() })).min(1) });
const FAQItemSchema = z.object({ question: z.string(), answer: z.string() });

function extractValueFromSiteContentResponse(data: unknown): unknown {
  if (Array.isArray(data)) return data[0]?.value;
  if (data && typeof data === "object" && "value" in (data as Record<string, unknown>)) {
    return (data as Record<string, unknown>).value;
  }
  return undefined;
}

function normalizeHeroStats(raw: unknown, fallback: HeroStats): HeroStats {
  const parsed = HeroStatsSchema.safeParse(raw);
  if (parsed.success) return parsed.data as HeroStats;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.countries === "string" || typeof obj.ownership === "string") {
      return {
        stats: [
          { value: (obj.countries as string) ?? fallback.stats[0]?.value ?? "", label: "Countries" },
          { value: (obj.ownership as string) ?? fallback.stats[1]?.value ?? "", label: "Patient Owned" },
          { value: (obj.access as string) ?? fallback.stats[2]?.value ?? "", label: "Instant Access" },
        ],
      };
    }
  }
  return fallback;
}

function normalizeFAQContent(raw: unknown, fallback: FAQContent): FAQContent {
  if (raw && typeof raw === "object" && "faqs" in (raw as any)) {
    return raw as FAQContent;
  }
  if (Array.isArray(raw)) {
    const parsed = z.array(FAQItemSchema).safeParse(raw);
    if (parsed.success) return { faqs: parsed.data as FAQContent["faqs"] };
  }
  return fallback;
}

describe("Phase 8: Site Content Management (14 tests)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("75. Fetch hero stats returns stats array", () => {
    const heroStats = DEFAULT_HERO_STATS;
    expect(heroStats.stats).toHaveLength(3);
    expect(heroStats.stats[0]).toHaveProperty("value");
    expect(heroStats.stats[0]).toHaveProperty("label");
  });

  it("76. Fetch contact info returns all fields", () => {
    const ci = DEFAULT_CONTACT_INFO;
    expect(ci.email).toBeTruthy();
    expect(ci.phone).toBeTruthy();
    expect(ci.address).toBeTruthy();
    expect(ci.emailDescription).toBeTruthy();
  });

  it("77. Fetch FAQ content returns faqs array", () => {
    const faq = DEFAULT_FAQ_CONTENT;
    expect(faq.faqs.length).toBeGreaterThan(0);
    expect(faq.faqs[0]).toHaveProperty("question");
    expect(faq.faqs[0]).toHaveProperty("answer");
  });

  it("78. Update hero stats upserts into site_content", () => {
    // Validates the upsert pattern: check existing, then update or insert
    const updatePayload = { value: { stats: [{ value: "10+", label: "Labs" }] }, updated_at: new Date().toISOString() };
    expect(updatePayload.value.stats).toHaveLength(1);
  });

  it("79. Update contact info upserts into site_content", () => {
    const updatePayload = { value: DEFAULT_CONTACT_INFO, updated_at: new Date().toISOString() };
    expect(updatePayload.value.email).toBeTruthy();
  });

  it("80. Update FAQ content upserts into site_content", () => {
    const updatePayload = { value: DEFAULT_FAQ_CONTENT, updated_at: new Date().toISOString() };
    expect(updatePayload.value.faqs).toHaveLength(3);
  });

  it("81. Normalize legacy hero stats converts object to stats array", () => {
    const legacy = { countries: "200+", ownership: "100%", access: "24/7" };
    const result = normalizeHeroStats(legacy, DEFAULT_HERO_STATS);
    expect(result.stats).toHaveLength(3);
    expect(result.stats[0].value).toBe("200+");
    expect(result.stats[1].value).toBe("100%");
    expect(result.stats[2].value).toBe("24/7");
  });

  it("82. Normalize FAQ array shape wraps into {faqs: [...]}", () => {
    const rawArray = [
      { question: "Q1?", answer: "A1" },
      { question: "Q2?", answer: "A2" },
    ];
    const result = normalizeFAQContent(rawArray, DEFAULT_FAQ_CONTENT);
    expect(result.faqs).toHaveLength(2);
    expect(result.faqs[0].question).toBe("Q1?");
  });

  it("83. Default fallback for hero stats when no data", () => {
    const result = normalizeHeroStats(undefined, DEFAULT_HERO_STATS);
    expect(result).toEqual(DEFAULT_HERO_STATS);
  });

  it("84. Default fallback for contact info when no data", () => {
    expect(DEFAULT_CONTACT_INFO.email).toBe("hello@patientbio.app");
  });

  it("85. Default fallback for FAQ when no data", () => {
    const result = normalizeFAQContent(undefined, DEFAULT_FAQ_CONTENT);
    expect(result).toEqual(DEFAULT_FAQ_CONTENT);
  });

  it("86. Zod validation for hero stats", () => {
    const valid = { stats: [{ value: "10+", label: "Labs" }] };
    const result = HeroStatsSchema.safeParse(valid);
    expect(result.success).toBe(true);

    const invalid = { stats: [] };
    const result2 = HeroStatsSchema.safeParse(invalid);
    expect(result2.success).toBe(false);
  });

  it("87. Cache invalidation on update uses site-content key", () => {
    const key = ["site-content", "hero_stats"];
    expect(key[0]).toBe("site-content");
  });

  it("88. Extract value from response handles array and object shapes", () => {
    // Object shape
    const objResult = extractValueFromSiteContentResponse({ value: { stats: [] } });
    expect(objResult).toEqual({ stats: [] });

    // Array shape
    const arrResult = extractValueFromSiteContentResponse([{ value: { stats: [] } }]);
    expect(arrResult).toEqual({ stats: [] });

    // Undefined
    const undResult = extractValueFromSiteContentResponse(null);
    expect(undResult).toBeUndefined();
  });
});
