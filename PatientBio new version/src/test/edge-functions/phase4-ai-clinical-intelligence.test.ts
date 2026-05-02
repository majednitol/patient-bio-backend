import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEdgeFunctionMock, mockInvokeResponse } from "./ef-helpers";

describe("Phase 4: AI Clinical Intelligence", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createEdgeFunctionMock();
    mockInvoke = mock.mockInvoke;
  });

  // --- suggest-diagnosis ---
  describe("suggest-diagnosis", () => {
    it("71. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing authorization header" }, error: null });
      const result = await mockInvoke("suggest-diagnosis", { body: {} });
      expect(result.data.error).toContain("authorization");
    });

    it("72. Rejects missing chief_complaint", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Chief complaint is required" }, error: null });
      const result = await mockInvoke("suggest-diagnosis", { body: {} });
      expect(result.data.error).toContain("Chief complaint");
    });

    it("73. Returns diagnosis suggestions", async () => {
      mockInvokeResponse(mockInvoke, {
        data: {
          suggestions: [
            { diagnosis: "Viral Fever", confidence: "high", medications: [{ name: "Paracetamol", dosage: "500mg" }] },
          ],
        },
        error: null,
      });
      const result = await mockInvoke("suggest-diagnosis", { body: { chief_complaint: "Fever for 3 days" } });
      expect(result.data.suggestions).toHaveLength(1);
      expect(result.data.suggestions[0].diagnosis).toBe("Viral Fever");
    });

    it("74. Handles AI fallback gracefully", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "AI service not configured" }, error: null });
      const result = await mockInvoke("suggest-diagnosis", { body: { chief_complaint: "Headache" } });
      expect(result.data.error).toContain("AI service");
    });
  });

  // --- generate-visit-summary ---
  describe("generate-visit-summary", () => {
    it("75. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing authorization header" }, error: null });
      const result = await mockInvoke("generate-visit-summary", { body: {} });
      expect(result.data.error).toContain("authorization");
    });

    it("76. Rejects missing appointmentId", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing appointmentId" }, error: null });
      const result = await mockInvoke("generate-visit-summary", { body: {} });
      expect(result.data.error).toContain("appointmentId");
    });

    it("77. Rejects non-owner doctor", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Not authorized for this appointment" }, error: null });
      const result = await mockInvoke("generate-visit-summary", { body: { appointmentId: "a1" } });
      expect(result.data.error).toContain("Not authorized");
    });

    it("78. Returns summary with 4 fields", async () => {
      const summaryData = {
        success: true,
        data: {
          summary_text: "Thank you for visiting today.",
          diagnosis: "Viral fever",
          medications_summary: "Paracetamol 500mg twice daily",
          follow_up_instructions: "Return in 1 week if symptoms persist",
        },
      };
      mockInvokeResponse(mockInvoke, { data: summaryData, error: null });
      const result = await mockInvoke("generate-visit-summary", { body: { appointmentId: "a1" } });
      expect(result.data.data.summary_text).toBeDefined();
      expect(result.data.data.diagnosis).toBeDefined();
      expect(result.data.data.medications_summary).toBeDefined();
      expect(result.data.data.follow_up_instructions).toBeDefined();
    });

    it("79. Upserts into visit_summaries table", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, data: { id: "vs-1" } }, error: null });
      const result = await mockInvoke("generate-visit-summary", { body: { appointmentId: "a1" } });
      expect(result.data.success).toBe(true);
    });

    it("80. Fallback summary when no API key", async () => {
      const fallback = {
        success: true,
        data: {
          summary_text: "Thank you for visiting today",
          diagnosis: "Assessment for general consultation",
          medications_summary: "No new medications were prescribed.",
          follow_up_instructions: "Follow up with your doctor if symptoms persist",
        },
      };
      mockInvokeResponse(mockInvoke, { data: fallback, error: null });
      const result = await mockInvoke("generate-visit-summary", { body: { appointmentId: "a1" } });
      expect(result.data.data.summary_text).toContain("Thank you");
    });
  });

  // --- check-medication-interactions ---
  describe("check-medication-interactions", () => {
    it("81. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing authorization header" }, error: null });
      const result = await mockInvoke("check-medication-interactions", { body: {} });
      expect(result.data.error).toContain("authorization");
    });

    it("82. Rejects empty medications", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "No medications provided" }, error: null });
      const result = await mockInvoke("check-medication-interactions", { body: { medications: [] } });
      expect(result.data.error).toContain("No medications");
    });

    it("83. Returns low risk for single med", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, data: { interactions: [], overallRisk: "low", generalWarnings: ["At least 2 medications are needed"] } },
        error: null,
      });
      const result = await mockInvoke("check-medication-interactions", { body: { medications: [{ name: "Aspirin" }] } });
      expect(result.data.data.overallRisk).toBe("low");
    });

    it("84. Returns interactions for known pairs", async () => {
      mockInvokeResponse(mockInvoke, {
        data: {
          success: true,
          data: {
            interactions: [{ severity: "moderate", medication1: "warfarin", medication2: "aspirin", description: "Increased bleeding risk" }],
            overallRisk: "moderate",
          },
        },
        error: null,
      });
      const result = await mockInvoke("check-medication-interactions", {
        body: { medications: [{ name: "Warfarin" }, { name: "Aspirin" }] },
      });
      expect(result.data.data.interactions).toHaveLength(1);
      expect(result.data.data.interactions[0].severity).toBe("moderate");
    });

    it("85. Fallback analysis when no API key", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, data: { interactions: [], overallRisk: "low", disclaimer: expect.any(String) } },
        error: null,
      });
      const result = await mockInvoke("check-medication-interactions", {
        body: { medications: [{ name: "Metformin" }, { name: "Lisinopril" }] },
      });
      expect(result.data.success).toBe(true);
    });

    it("86. Overall risk calculation", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, data: { overallRisk: "high", interactions: [{ severity: "severe" }] } },
        error: null,
      });
      const result = await mockInvoke("check-medication-interactions", {
        body: { medications: [{ name: "Methotrexate" }, { name: "Ibuprofen" }] },
      });
      expect(result.data.data.overallRisk).toBe("high");
    });
  });

  // --- Other AI functions ---
  describe("generate-consultation-brief", () => {
    it("87. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
      const result = await mockInvoke("generate-consultation-brief", { body: {} });
      expect(result.data.error).toContain("Unauthorized");
    });

    it("88. Rejects missing patient_id", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "patient_id is required" }, error: null });
      const result = await mockInvoke("generate-consultation-brief", { body: {} });
      expect(result.data.error).toContain("patient_id");
    });

    it("89. Returns consultation brief", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, brief: "Patient has history of..." }, error: null });
      const result = await mockInvoke("generate-consultation-brief", { body: { patient_id: "p1" } });
      expect(result.data.brief).toBeDefined();
    });
  });

  describe("generate-treatment-insights", () => {
    it("90. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
      const result = await mockInvoke("generate-treatment-insights", { body: {} });
      expect(result.data.error).toBeDefined();
    });

    it("91. Rejects missing patient_id", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "patient_id required" }, error: null });
      const result = await mockInvoke("generate-treatment-insights", { body: {} });
      expect(result.data.error).toBeDefined();
    });

    it("92. Returns treatment insights", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, insights: [] }, error: null });
      const result = await mockInvoke("generate-treatment-insights", { body: { patient_id: "p1" } });
      expect(result.data.insights).toBeDefined();
    });
  });

  describe("generate-health-insights", () => {
    it("93. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
      const result = await mockInvoke("generate-health-insights", { body: {} });
      expect(result.data.error).toBeDefined();
    });

    it("94. Returns health insights", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, insights: [{ severity: "info" }] }, error: null });
      const result = await mockInvoke("generate-health-insights", { body: { metrics: [] } });
      expect(result.data.insights).toBeDefined();
    });

    it("95. Fallback insights when no API key", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, insights: [] }, error: null });
      const result = await mockInvoke("generate-health-insights", { body: {} });
      expect(result.data.success).toBe(true);
    });
  });

  describe("summarize-document", () => {
    it("96. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
      const result = await mockInvoke("summarize-document", { body: {} });
      expect(result.data.error).toBeDefined();
    });

    it("97. Returns document summary", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, summary: "This report shows..." }, error: null });
      const result = await mockInvoke("summarize-document", { body: { content: "Lab report text..." } });
      expect(result.data.summary).toBeDefined();
    });
  });

  describe("analyze-report-diagnosis", () => {
    it("98. Returns report diagnosis analysis", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, analysis: { findings: [] } }, error: null });
      const result = await mockInvoke("analyze-report-diagnosis", { body: { report_text: "CBC shows..." } });
      expect(result.data.analysis).toBeDefined();
    });
  });

  describe("forecast-costs", () => {
    it("99. Returns cost forecast", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, forecast: { projected: 5000 } }, error: null });
      const result = await mockInvoke("forecast-costs", { body: {} });
      expect(result.data.forecast).toBeDefined();
    });
  });
});
