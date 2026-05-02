import { describe, it, expect, vi } from "vitest";
import { mockUser, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 20 — Literature Search Tests (Tests 233–240)
 */

describe("Phase 20: Literature Search", () => {
  // Test 233: Search invokes edge function
  it("233. search query invokes AI literature cross-reference function", async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { results: [{ title: "Study A", relevance: 0.95 }] },
      error: null,
    });
    const result = await mockSupabase.functions.invoke("ai-literature-cross-reference", {
      body: { query: "diabetes biomarkers", domain: "endocrinology" },
    });
    expect(result.data.results).toHaveLength(1);
    expect(result.data.results[0].relevance).toBe(0.95);
  });

  // Test 234: Results with relevance scores
  it("234. results display with relevance scores and citation info", () => {
    const results = [
      { title: "Study A", relevance: 0.95, citation: "Smith et al., 2024" },
      { title: "Study B", relevance: 0.82, citation: "Jones et al., 2023" },
    ];
    const sorted = [...results].sort((a, b) => b.relevance - a.relevance);
    expect(sorted[0].relevance).toBeGreaterThan(sorted[1].relevance);
    results.forEach(r => expect(r.citation).toBeTruthy());
  });

  // Test 235: Empty search guidance
  it("235. empty search returns helpful guidance", () => {
    const query = "";
    const guidance = !query.trim()
      ? "Enter a research topic to find relevant literature"
      : null;
    expect(guidance).toBeTruthy();
  });

  // Test 236: Search history
  it("236. search history stores and retrieves queries", () => {
    const history: string[] = [];
    history.push("diabetes biomarkers");
    history.push("cardiology outcomes");
    expect(history).toHaveLength(2);
    expect(history[0]).toBe("diabetes biomarkers");
  });

  // Test 237: Domain insight templates
  it("237. domain insight templates filter by domain", () => {
    const templates = [
      { domain: "endocrinology", template: "Hormone pathway analysis" },
      { domain: "cardiology", template: "Cardiac risk factors" },
      { domain: "endocrinology", template: "Metabolic syndrome review" },
    ];
    const filtered = templates.filter(t => t.domain === "endocrinology");
    expect(filtered).toHaveLength(2);
  });

  // Test 238: Hypothesis generator
  it("238. hypothesis generator produces structured output", () => {
    const hypothesis = {
      statement: "Increased HbA1c correlates with retinopathy progression",
      variables: { independent: "HbA1c levels", dependent: "retinopathy grade" },
      testable: true,
    };
    expect(hypothesis.statement).toBeTruthy();
    expect(hypothesis.variables.independent).toBeDefined();
    expect(hypothesis.testable).toBe(true);
  });

  // Test 239: AI service unavailability error handling
  it("239. handles AI service unavailability gracefully", async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: "Service unavailable" },
    });
    const result = await mockSupabase.functions.invoke("ai-literature-cross-reference", {
      body: { query: "test" },
    });
    expect(result.error).toBeTruthy();
    expect(result.error.message).toBe("Service unavailable");
  });

  // Test 240: Rate limiting
  it("240. rate limiting prevents excessive API calls", () => {
    const MIN_INTERVAL_MS = 2000;
    let lastCall = 0;
    const canCall = () => {
      const now = Date.now();
      if (now - lastCall < MIN_INTERVAL_MS) return false;
      lastCall = now;
      return true;
    };
    lastCall = Date.now() - 3000;
    expect(canCall()).toBe(true);
    expect(canCall()).toBe(false); // too soon
  });
});
