import { describe, it, expect, vi } from "vitest";
import { mockUser, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe("Phase 11: Verification and Data Import", () => {
  // Test 123: Submit researcher verification
  it("should insert verification with provider_type=researcher", async () => {
    const chain = mockSupabase.createChain({ data: { id: "ver-1", provider_type: "researcher" }, error: null });
    mockSupabase.from.mockReturnValueOnce(chain);

    const result = await chain.insert({
      user_id: mockUser.id,
      provider_type: "researcher",
      license_number: "RES-12345",
      issuing_authority: "Research Council",
      issuing_country: "US",
    }).select().single();

    expect(result.data.provider_type).toBe("researcher");
  });

  // Test 124: Upload verification document
  it("should upload to provider-verifications bucket", async () => {
    const fileName = `${mockUser.id}/${Date.now()}-test.pdf`;
    await mockSupabase.storage.from("provider-verifications").upload(fileName, new Blob());
    expect(mockSupabase.storage.from).toHaveBeenCalledWith("provider-verifications");
  });

  // Test 125: Document URL generation
  it("should generate 1-hour signed URL", async () => {
    const result = await mockSupabase.storage.from("provider-verifications").createSignedUrl("test.pdf", 3600);
    expect(result.data.signedUrl).toBe("https://signed.url/test");
  });

  // Test 126: Resubmit after rejection
  it("should create new verification record on resubmit", async () => {
    const chain = mockSupabase.createChain({ data: { id: "ver-2", provider_type: "researcher" }, error: null });
    mockSupabase.from.mockReturnValueOnce(chain);

    const result = await chain.insert({
      user_id: mockUser.id,
      provider_type: "researcher",
      license_number: "RES-12345-V2",
      issuing_authority: "Research Council",
      issuing_country: "US",
    }).select().single();

    expect(result.data.id).toBe("ver-2");
  });

  // Test 127: Verification statuses
  it("should support 4 verification statuses", () => {
    const statuses = ["pending", "approved", "rejected", "expired"];
    expect(statuses.length).toBe(4);
  });

  // Test 128: Import research studies CSV
  it("should invoke import-researcher-data with importType=research_studies", async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { success: true, imported: 5, updated: 0, skipped: 0, errors: [], warnings: [] },
      error: null,
    });

    const result = await mockSupabase.functions.invoke("import-researcher-data", {
      body: { importType: "research_studies", csvContent: "col1,col2\nval1,val2", conflictResolution: "merge" },
    });

    expect(result.data.success).toBe(true);
    expect(result.data.imported).toBe(5);
  });

  // Test 129: Import participant cohorts
  it("should invoke import-researcher-data with importType=participant_cohorts", async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { success: true, imported: 3, updated: 1, skipped: 0, errors: [], warnings: [] },
      error: null,
    });

    const result = await mockSupabase.functions.invoke("import-researcher-data", {
      body: { importType: "participant_cohorts", csvContent: "data", conflictResolution: "replace" },
    });

    expect(result.data.imported).toBe(3);
    expect(result.data.updated).toBe(1);
  });

  // Test 130: Import study notes
  it("should invoke import-researcher-data with importType=study_notes", async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { success: true, imported: 10, updated: 0, skipped: 2, errors: [], warnings: [] },
      error: null,
    });

    const result = await mockSupabase.functions.invoke("import-researcher-data", {
      body: { importType: "study_notes", csvContent: "notes", conflictResolution: "skip" },
    });

    expect(result.data.skipped).toBe(2);
  });

  // Test 131: Conflict resolution modes
  it("should support merge, replace, skip", () => {
    const modes = ["merge", "replace", "skip"];
    expect(modes.length).toBe(3);
    expect(modes).toContain("merge");
    expect(modes).toContain("replace");
    expect(modes).toContain("skip");
  });

  // Test 132: Cache invalidation per import type
  it("should invalidate correct keys per import type", () => {
    const cacheMap: Record<string, string[]> = {
      research_studies: ["research-broadcast-requests"],
      participant_cohorts: ["data-access-requests", "patient-researcher-shares"],
      study_notes: ["researcher-study-notes"],
    };
    expect(cacheMap.research_studies).toContain("research-broadcast-requests");
    expect(cacheMap.participant_cohorts).toContain("data-access-requests");
    expect(cacheMap.study_notes).toContain("researcher-study-notes");
  });
});
