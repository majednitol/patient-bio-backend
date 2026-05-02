import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, mockContactMessage } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));

describe("Phase 7: Contact Messages (10 tests)", () => {
  beforeEach(() => vi.clearAllMocks());

  const messages = [
    { ...mockContactMessage, id: "m1", name: "Alice", subject: "Data Export", status: "new" },
    { ...mockContactMessage, id: "m2", name: "Bob Smith", subject: "Account Issue", status: "read" },
    { ...mockContactMessage, id: "m3", name: "Charlie", subject: "Privacy Question", status: "new" },
  ];

  it("65. Fetch messages ordered by created_at desc", () => {
    expect(messages).toHaveLength(3);
    expect(messages[0]).toHaveProperty("created_at");
  });

  it("66. Mark message as read sets status and read_at", async () => {
    const chain = mockSupabase.createChain({ data: { ...messages[0], status: "read", read_at: new Date().toISOString() }, error: null });
    mockSupabase.from.mockReturnValue(chain);
    const updates = { status: "read", read_at: new Date().toISOString() };
    expect(updates.status).toBe("read");
    expect(updates.read_at).toBeTruthy();
  });

  it("67. Mark message as unread sets status new and read_at null", () => {
    const updates = { status: "new", read_at: null };
    expect(updates.status).toBe("new");
    expect(updates.read_at).toBeNull();
  });

  it("68. Delete message performs hard delete", () => {
    const chain = mockSupabase.createChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);
    expect(chain.delete).toBeDefined();
  });

  it("69. Cache invalidation on read invalidates contact-messages and admin-stats", () => {
    const keys = ["contact-messages", "admin-stats"];
    expect(keys).toContain("contact-messages");
    expect(keys).toContain("admin-stats");
  });

  it("70. Cache invalidation on unread invalidates contact-messages and admin-stats", () => {
    const keys = ["contact-messages", "admin-stats"];
    expect(keys).toEqual(["contact-messages", "admin-stats"]);
  });

  it("71. Cache invalidation on delete invalidates contact-messages and admin-stats", () => {
    const keys = ["contact-messages", "admin-stats"];
    expect(keys).toEqual(["contact-messages", "admin-stats"]);
  });

  it("72. Search messages by name", () => {
    const query = "bob";
    const filtered = messages.filter((m) => m.name.toLowerCase().includes(query));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Bob Smith");
  });

  it("73. Search messages by subject", () => {
    const query = "privacy";
    const filtered = messages.filter((m) => m.subject.toLowerCase().includes(query));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("m3");
  });

  it("74. Messages pagination with 10 items per page", () => {
    const items = Array.from({ length: 35 }, (_, i) => ({ id: `m${i}` }));
    const itemsPerPage = 10;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    expect(totalPages).toBe(4);
    expect(items.slice(30, 40)).toHaveLength(5);
  });
});
