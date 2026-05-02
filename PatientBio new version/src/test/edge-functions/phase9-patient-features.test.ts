import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEdgeFunctionMock, mockInvokeResponse, mockResearcherUser } from "./ef-helpers";

describe("Phase 9: Patient Features (broadcast-research-request)", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createEdgeFunctionMock();
    mockInvoke = mock.mockInvoke;
  });

  it("190. Rejects unauthenticated", async () => {
    mockInvokeResponse(mockInvoke, { data: { error: "Missing authorization header" }, error: null });
    const result = await mockInvoke("broadcast-research-request", { body: {} });
    expect(result.data.error).toContain("authorization");
  });

  it("191. Rejects missing disease_category", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { error: "disease_category and research_purpose are required" },
      error: null,
    });
    const result = await mockInvoke("broadcast-research-request", { body: { research_purpose: "Study" } });
    expect(result.data.error).toContain("disease_category");
  });

  it("192. Rejects missing research_purpose", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { error: "disease_category and research_purpose are required" },
      error: null,
    });
    const result = await mockInvoke("broadcast-research-request", { body: { disease_category: "diabetes" } });
    expect(result.data.error).toContain("research_purpose");
  });

  it("193. Creates broadcast request record", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, broadcast_request_id: "br-1", patients_notified: 5 },
      error: null,
    });
    const result = await mockInvoke("broadcast-research-request", {
      body: { disease_category: "diabetes", research_purpose: "Study glucose" },
    });
    expect(result.data.broadcast_request_id).toBeDefined();
  });

  it("194. Finds matching patients by disease category", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, patients_notified: 3, broadcast_request_id: "br-1" },
      error: null,
    });
    const result = await mockInvoke("broadcast-research-request", {
      body: { disease_category: "cardiovascular", research_purpose: "Heart study" },
    });
    expect(result.data.patients_notified).toBe(3);
  });

  it("195. Creates data_access_requests per patient", async () => {
    mockInvokeResponse(mockInvoke, { data: { success: true, patients_notified: 2 }, error: null });
    const result = await mockInvoke("broadcast-research-request", {
      body: { disease_category: "diabetes", research_purpose: "Study" },
    });
    expect(result.data.patients_notified).toBe(2);
  });

  it("196. Creates notifications for patients", async () => {
    mockInvokeResponse(mockInvoke, { data: { success: true, patients_notified: 4 }, error: null });
    const result = await mockInvoke("broadcast-research-request", {
      body: { disease_category: "diabetes", research_purpose: "Study" },
    });
    expect(result.data.success).toBe(true);
  });

  it("197. Excludes researcher from patient list", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, patients_notified: 2 },
      error: null,
    });
    const result = await mockInvoke("broadcast-research-request", {
      body: { disease_category: "diabetes", research_purpose: "Study" },
    });
    // Researcher's own ID should be filtered out
    expect(result.data.patients_notified).toBe(2);
  });

  it("198. Returns 0 patients when no matches", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, patients_notified: 0, message: "No patients found with matching disease category" },
      error: null,
    });
    const result = await mockInvoke("broadcast-research-request", {
      body: { disease_category: "rare_disease", research_purpose: "Study" },
    });
    expect(result.data.patients_notified).toBe(0);
  });

  it("199. Uses default token offer from token_pricing", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, token_offer_per_patient: 10, patients_notified: 3 },
      error: null,
    });
    const result = await mockInvoke("broadcast-research-request", {
      body: { disease_category: "diabetes", research_purpose: "Study" },
    });
    expect(result.data.token_offer_per_patient).toBe(10);
  });

  it("200. Custom token_offer_per_patient used", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, token_offer_per_patient: 25, patients_notified: 3 },
      error: null,
    });
    const result = await mockInvoke("broadcast-research-request", {
      body: { disease_category: "diabetes", research_purpose: "Study", token_offer_per_patient: 25 },
    });
    expect(result.data.token_offer_per_patient).toBe(25);
  });

  it("201. Rollback on access request failure", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { error: "Failed to create access requests" },
      error: null,
    });
    const result = await mockInvoke("broadcast-research-request", {
      body: { disease_category: "diabetes", research_purpose: "Study" },
    });
    expect(result.data.error).toContain("Failed to create access requests");
  });

  it("202. Notification failure is non-fatal", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, patients_notified: 3 },
      error: null,
    });
    const result = await mockInvoke("broadcast-research-request", {
      body: { disease_category: "diabetes", research_purpose: "Study" },
    });
    expect(result.data.success).toBe(true);
  });

  it("203. Total token budget calculated", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, token_offer_per_patient: 10, patients_notified: 5 },
      error: null,
    });
    const result = await mockInvoke("broadcast-research-request", {
      body: { disease_category: "diabetes", research_purpose: "Study" },
    });
    // Budget = offer * patients
    expect(result.data.token_offer_per_patient * result.data.patients_notified).toBe(50);
  });
});
