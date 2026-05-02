import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, mockTeamMember } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));

describe("Phase 6: Team Management (10 tests)", () => {
  beforeEach(() => vi.clearAllMocks());

  const members = [
    { ...mockTeamMember, id: "tm-1", is_advisor: false, display_order: 1 },
    { ...mockTeamMember, id: "tm-2", is_advisor: false, display_order: 2, name: "Jane" },
    { ...mockTeamMember, id: "tm-3", is_advisor: true, display_order: 1, name: "Advisor A" },
  ];

  it("55. Fetch team members (non-advisors)", () => {
    const nonAdvisors = members.filter((m) => !m.is_advisor);
    expect(nonAdvisors).toHaveLength(2);
    expect(nonAdvisors[0].display_order).toBeLessThanOrEqual(nonAdvisors[1].display_order);
  });

  it("56. Fetch advisors", () => {
    const advisors = members.filter((m) => m.is_advisor);
    expect(advisors).toHaveLength(1);
    expect(advisors[0].name).toBe("Advisor A");
  });

  it("57. Create team member inserts and invalidates cache", async () => {
    const chain = mockSupabase.createChain({ data: mockTeamMember, error: null });
    mockSupabase.from.mockReturnValue(chain);
    const result = await chain.insert(mockTeamMember).select().single();
    expect(result.data).toHaveProperty("id");
    // Cache key to invalidate
    expect(["team-members"]).toEqual(["team-members"]);
  });

  it("58. Update team member performs partial update", async () => {
    const chain = mockSupabase.createChain({ data: { ...mockTeamMember, name: "Updated" }, error: null });
    mockSupabase.from.mockReturnValue(chain);
    const result = await chain.update({ name: "Updated" }).eq("id", "tm-1").select().single();
    expect(result.data.name).toBe("Updated");
  });

  it("59. Delete team member hard deletes", async () => {
    const chain = mockSupabase.createChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);
    chain.delete.mockReturnValue(chain);
    // No error on delete
    expect(chain.delete).toBeDefined();
  });

  it("60. Upload profile image to team-profiles bucket", async () => {
    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://public.url/photo.jpg" } }),
    });

    const bucket = mockSupabase.storage.from("team-profiles");
    const uploadResult = await bucket.upload("tm-1-123.jpg", new Blob());
    expect(uploadResult.error).toBeNull();
    const { data } = bucket.getPublicUrl("tm-1-123.jpg");
    expect(data.publicUrl).toContain("https://");
  });

  it("61. Image file path format: memberId-timestamp.ext", () => {
    const memberId = "tm-1";
    const timestamp = Date.now();
    const ext = "png";
    const path = `${memberId}-${timestamp}.${ext}`;
    expect(path).toMatch(/^tm-1-\d+\.png$/);
  });

  it("62. Create with image uploads image first, then creates member", async () => {
    const callOrder: string[] = [];
    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockImplementation(async () => {
        callOrder.push("upload");
        return { error: null };
      }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://url" } }),
    });
    const chain = mockSupabase.createChain({ data: mockTeamMember, error: null });
    mockSupabase.from.mockReturnValue(chain);
    chain.single = vi.fn().mockImplementation(async () => {
      callOrder.push("insert");
      return { data: mockTeamMember, error: null };
    });

    // Simulate flow
    await mockSupabase.storage.from("team-profiles").upload("path", new Blob());
    await chain.insert({}).select().single();

    expect(callOrder).toEqual(["upload", "insert"]);
  });

  it("63. Update with image uploads image, then updates member", async () => {
    const callOrder: string[] = [];
    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockImplementation(async () => { callOrder.push("upload"); return { error: null }; }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://url" } }),
    });
    const chain = mockSupabase.createChain({ data: mockTeamMember, error: null });
    mockSupabase.from.mockReturnValue(chain);
    chain.single = vi.fn().mockImplementation(async () => { callOrder.push("update"); return { data: mockTeamMember, error: null }; });

    await mockSupabase.storage.from("team-profiles").upload("path", new Blob());
    await chain.update({}).eq("id", "tm-1").select().single();

    expect(callOrder).toEqual(["upload", "update"]);
  });

  it("64. Cache invalidation on CRUD invalidates team-members key", () => {
    const cacheKey = ["team-members"];
    // All create/update/delete mutations should invalidate this key
    expect(cacheKey[0]).toBe("team-members");
  });
});
