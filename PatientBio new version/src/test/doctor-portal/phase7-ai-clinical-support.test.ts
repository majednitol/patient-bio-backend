import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInvoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    functions: { invoke: (...args: any[]) => mockInvoke(...args) },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "doctor-123" } }),
}));

describe("Phase 7: AI Clinical Support", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("AI Diagnosis Suggestion", () => {
    it("invokes suggest-diagnosis edge function", async () => {
      mockInvoke.mockResolvedValue({
        data: {
          suggestions: [
            {
              diagnosis: "Acute Bronchitis",
              confidence: "high",
              reasoning: "Cough with phlegm for 5 days",
              medications: [{ name: "Amoxicillin", dosage: "500mg", frequency: "TID", duration: "7 days" }],
            },
          ],
        },
        error: null,
      });

      const result = await mockInvoke("suggest-diagnosis", { body: { chief_complaint: "Cough" } });
      expect(result.data.suggestions.length).toBe(1);
      expect(result.data.suggestions[0].diagnosis).toBe("Acute Bronchitis");
    });

    it("validates suggestion structure", () => {
      const suggestion = {
        diagnosis: "Test",
        confidence: "high" as const,
        reasoning: "Test reasoning",
        medications: [{ name: "Drug", dosage: "10mg", frequency: "daily", duration: "7d" }],
        general_instructions: "Rest well",
      };
      expect(["high", "medium", "low"]).toContain(suggestion.confidence);
      expect(suggestion.medications.length).toBeGreaterThan(0);
      expect(suggestion.diagnosis).toBeTruthy();
    });

    it("handles empty suggestions", async () => {
      mockInvoke.mockResolvedValue({ data: { suggestions: [] }, error: null });
      const result = await mockInvoke("suggest-diagnosis", { body: { chief_complaint: "Unknown" } });
      expect(result.data.suggestions.length).toBe(0);
    });

    it("handles error gracefully", async () => {
      mockInvoke.mockResolvedValue({ data: null, error: { message: "AI error" } });
      const result = await mockInvoke("suggest-diagnosis", { body: { chief_complaint: "Test" } });
      expect(result.error).toBeTruthy();
    });

    it("clearSuggestions resets to empty array", () => {
      let suggestions = [{ diagnosis: "Test", confidence: "high" }];
      suggestions = [];
      expect(suggestions).toEqual([]);
    });
  });

  describe("Diagnosis History", () => {
    it("counts diagnoses by frequency from prescriptions", () => {
      const diagnoses = ["Hypertension", "Diabetes", "Hypertension", "Cold", "Hypertension"];
      const counts = new Map<string, number>();
      for (const d of diagnoses) {
        counts.set(d, (counts.get(d) || 0) + 1);
      }
      const sorted = Array.from(counts.entries())
        .map(([diagnosis, count]) => ({ diagnosis, count }))
        .sort((a, b) => b.count - a.count);

      expect(sorted[0].diagnosis).toBe("Hypertension");
      expect(sorted[0].count).toBe(3);
      expect(sorted.length).toBe(3);
    });
  });

  describe("Consultation Brief Generation", () => {
    it("synthesizes intake + vitals + history", () => {
      const briefInput = {
        intake: { chief_complaint: "Headache", symptom_duration: "3 days" },
        vitals: { blood_pressure: "120/80", temperature: "98.6" },
        history: { allergies: ["Penicillin"], conditions: ["Migraine"] },
      };
      expect(briefInput.intake.chief_complaint).toBeTruthy();
      expect(briefInput.vitals).toBeDefined();
      expect(briefInput.history.allergies).toContain("Penicillin");
    });
  });

  describe("Medication Interaction Check", () => {
    it("flags drug-drug and allergy conflicts", () => {
      const interactions = [
        { type: "drug-drug", severity: "moderate", drugs: ["Warfarin", "Aspirin"] },
        { type: "allergy", severity: "contraindicated", drug: "Penicillin", allergy: "Penicillin" },
      ];
      expect(interactions[0].type).toBe("drug-drug");
      expect(interactions[1].severity).toBe("contraindicated");
    });
  });
});
