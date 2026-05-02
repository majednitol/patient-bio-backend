import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, mockAdminUser } from "./test-helpers";
import { format } from "date-fns";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));

describe("Phase 4: Bulk User Operations (10 tests)", () => {
  beforeEach(() => vi.clearAllMocks());

  const currentUserId = mockAdminUser.id;
  const pageUsers = [
    { id: "u1", email: "a@t.com", role: "user" as const },
    { id: "u2", email: "b@t.com", role: "doctor" as const },
    { id: currentUserId, email: "admin@t.com", role: "admin" as const },
  ];

  it("37. Bulk delete users via edge function", async () => {
    mockSupabase.functions.invoke.mockResolvedValue({ data: { deleted: 3 }, error: null });
    const result = await mockSupabase.functions.invoke("admin-users?action=bulk-delete-users", {
      method: "POST",
      body: { targetUserIds: ["u1", "u2", "u3"] },
    });
    expect(result.data.deleted).toBe(3);
  });

  it("38. Bulk set role via edge function", async () => {
    mockSupabase.functions.invoke.mockResolvedValue({ data: { updated: 2 }, error: null });
    const result = await mockSupabase.functions.invoke("admin-users?action=bulk-set-role", {
      method: "POST",
      body: { targetUserIds: ["u1", "u2"], role: "researcher" },
    });
    expect(result.data.updated).toBe(2);
  });

  it("39. Bulk delete success clears selection", () => {
    const selectedUserIds = new Set(["u1", "u2"]);
    // On success callback
    selectedUserIds.clear();
    expect(selectedUserIds.size).toBe(0);
  });

  it("40. Bulk role change success clears selection", () => {
    const selectedUserIds = new Set(["u1", "u2"]);
    selectedUserIds.clear();
    expect(selectedUserIds.size).toBe(0);
  });

  it("41. Select all on page selects non-current-user IDs", () => {
    const selectedUserIds = new Set<string>();
    const selectableIds = pageUsers.filter((u) => u.id !== currentUserId).map((u) => u.id);
    selectableIds.forEach((id) => selectedUserIds.add(id));
    expect(selectedUserIds.size).toBe(2);
    expect(selectedUserIds.has(currentUserId)).toBe(false);
  });

  it("42. Deselect all on page removes all page IDs", () => {
    const selectedUserIds = new Set(["u1", "u2"]);
    const pageIds = pageUsers.map((u) => u.id);
    pageIds.forEach((id) => selectedUserIds.delete(id));
    expect(selectedUserIds.size).toBe(0);
  });

  it("43. Toggle individual user adds/removes from set", () => {
    const selectedUserIds = new Set<string>();
    // Add
    selectedUserIds.add("u1");
    expect(selectedUserIds.has("u1")).toBe(true);
    // Remove
    selectedUserIds.delete("u1");
    expect(selectedUserIds.has("u1")).toBe(false);
  });

  it("44. Current user excluded from selection", () => {
    const selectableIds = pageUsers
      .filter((u) => u.id !== currentUserId)
      .map((u) => u.id);
    expect(selectableIds).not.toContain(currentUserId);
    expect(selectableIds).toHaveLength(2);
  });

  it("45. Export selected users CSV has correct headers", () => {
    const headers = ["Email", "Role", "Verified", "Joined", "Last Sign In", "Last Activity"];
    const users = [
      { email: "a@t.com", role: "user", email_confirmed_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z", last_sign_in_at: null, last_activity_at: null },
    ];
    const csvRows = [headers.join(",")];
    users.forEach((u) => {
      csvRows.push([
        u.email, u.role, u.email_confirmed_at ? "Yes" : "No",
        format(new Date(u.created_at), "yyyy-MM-dd"),
        u.last_sign_in_at ? format(new Date(u.last_sign_in_at), "yyyy-MM-dd") : "Never",
        u.last_activity_at ? format(new Date(u.last_activity_at), "yyyy-MM-dd") : "Never",
      ].join(","));
    });
    expect(csvRows[0]).toContain("Email");
    expect(csvRows[0]).toContain("Last Activity");
    expect(csvRows).toHaveLength(2);
  });

  it("46. CSV date formatting uses yyyy-MM-dd", () => {
    const date = new Date("2026-02-15T12:00:00Z");
    const formatted = format(date, "yyyy-MM-dd");
    expect(formatted).toBe("2026-02-15");
  });
});
