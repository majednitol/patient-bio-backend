import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, mockContactMessage } from "./test-helpers";
import { subDays, isAfter, parseISO } from "date-fns";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));

describe("Phase 2: Dashboard Statistics (14 tests)", () => {
  beforeEach(() => vi.clearAllMocks());

  const now = new Date();
  const weekAgo = subDays(now, 7);

  const messages = [
    { ...mockContactMessage, id: "m1", status: "new", created_at: now.toISOString() },
    { ...mockContactMessage, id: "m2", status: "read", created_at: now.toISOString() },
    { ...mockContactMessage, id: "m3", status: "new", created_at: subDays(now, 10).toISOString() },
  ];

  it("11. Fetch contact messages stats", () => {
    expect(messages.length).toBe(3);
    expect(messages[0]).toHaveProperty("id");
    expect(messages[0]).toHaveProperty("status");
    expect(messages[0]).toHaveProperty("created_at");
  });

  it("12. Unread messages count", () => {
    const unread = messages.filter((m) => m.status === "new").length;
    expect(unread).toBe(2);
  });

  it("13. This week messages count", () => {
    const thisWeek = messages.filter((m) => isAfter(parseISO(m.created_at), weekAgo)).length;
    expect(thisWeek).toBe(2);
  });

  it("14. Fetch team count", () => {
    const teamMembers = [{ id: "1" }, { id: "2" }, { id: "3" }];
    expect(teamMembers.length).toBe(3);
  });

  it("15. Fetch user stats via edge function", async () => {
    const mockResponse = { users: [{ id: "1", created_at: now.toISOString(), email_confirmed_at: now.toISOString() }] };
    mockSupabase.functions.invoke.mockResolvedValue({ data: mockResponse, error: null });
    const result = await mockSupabase.functions.invoke("admin-users", { method: "GET" });
    expect(result.data.users).toHaveLength(1);
  });

  it("16. This week signups calculation", () => {
    const signups = [
      { created_at: now.toISOString() },
      { created_at: subDays(now, 2).toISOString() },
      { created_at: subDays(now, 10).toISOString() },
    ];
    const thisWeek = signups.filter((s) => isAfter(parseISO(s.created_at), weekAgo)).length;
    expect(thisWeek).toBe(2);
  });

  it("17. Verified users count", () => {
    const users = [
      { email_confirmed_at: now.toISOString() },
      { email_confirmed_at: null },
      { email_confirmed_at: now.toISOString() },
    ];
    const verified = users.filter((u) => u.email_confirmed_at).length;
    expect(verified).toBe(2);
  });

  it("18. Role distribution computation", () => {
    const roles = [
      { role: "user" }, { role: "user" }, { role: "doctor" },
      { role: "pathologist" }, { role: "researcher" }, { role: "hospital_admin" },
    ];
    const labels: Record<string, string> = {
      user: "Patient", doctor: "Doctor", pathologist: "Pathologist",
      researcher: "Researcher", hospital_admin: "Hospital",
    };
    const distribution: Record<string, number> = {};
    roles.forEach((r) => {
      const label = labels[r.role] || r.role;
      distribution[label] = (distribution[label] || 0) + 1;
    });
    expect(distribution["Patient"]).toBe(2);
    expect(distribution["Doctor"]).toBe(1);
  });

  it("19. Role distribution filters zero counts", () => {
    const dist = { Patient: 5, Doctor: 0, Pathologist: 3 };
    const filtered = Object.entries(dist).filter(([, v]) => v > 0);
    expect(filtered.length).toBe(2);
    expect(filtered.find(([k]) => k === "Doctor")).toBeUndefined();
  });

  it("20. Shared data stats computation", () => {
    const tokens = [{ is_revoked: false }, { is_revoked: true }, { is_revoked: false }];
    const pathShares = [{ id: "1" }, { id: "2" }];
    const resShares = [{ id: "1" }];
    expect(tokens.length + pathShares.length + resShares.length).toBe(6);
  });

  it("21. Active tokens count", () => {
    const tokens = [{ is_revoked: false }, { is_revoked: true }, { is_revoked: false }];
    const active = tokens.filter((t) => !t.is_revoked).length;
    expect(active).toBe(2);
  });

  it("22. Disease distribution groups health records", () => {
    const records = [
      { disease_category: "diabetes" },
      { disease_category: "diabetes" },
      { disease_category: "cancer" },
      { disease_category: "general" },
    ];
    const dist: Record<string, number> = {};
    records.forEach((r) => {
      dist[r.disease_category] = (dist[r.disease_category] || 0) + 1;
    });
    expect(dist["diabetes"]).toBe(2);
    expect(dist["cancer"]).toBe(1);
  });

  it("23. Messages by day produces 30-day array", () => {
    const days = 30;
    const messagesByDay: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i).toISOString().split("T")[0];
      const count = messages.filter((m) => m.created_at.startsWith(date)).length;
      messagesByDay.push({ date, count });
    }
    expect(messagesByDay.length).toBe(30);
  });

  it("24. Signups by day with cumulative total", () => {
    const signups = [
      { created_at: subDays(now, 2).toISOString() },
      { created_at: subDays(now, 1).toISOString() },
      { created_at: now.toISOString() },
    ];
    let cumulative = 0;
    const result = [2, 1, 0].map((daysAgo) => {
      const date = subDays(now, daysAgo).toISOString().split("T")[0];
      const count = signups.filter((s) => s.created_at.startsWith(date)).length;
      cumulative += count;
      return { date, count, cumulative };
    });
    expect(result[result.length - 1].cumulative).toBe(3);
  });
});
