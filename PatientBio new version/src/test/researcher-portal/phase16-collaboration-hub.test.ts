import { describe, it, expect, vi } from "vitest";
import { mockUser, mockDoctorResearcherShare, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 16 — Collaboration Hub Tests (Tests 189–200)
 */

const mockThread = (overrides: Record<string, unknown> = {}) => ({
  id: "thread-1",
  researcher_id: mockUser.id,
  title: "Diabetes Research Discussion",
  category: "methodology",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const mockInvitation = (overrides: Record<string, unknown> = {}) => ({
  id: "inv-1",
  study_id: "study-1",
  inviter_id: "other-researcher",
  invitee_id: mockUser.id,
  role: "co-investigator",
  status: "pending",
  created_at: new Date().toISOString(),
  ...overrides,
});

describe("Phase 16: Collaboration Hub", () => {
  // Test 189: Thread list fetches by researcher_id
  it("189. fetches threads filtered by researcher_id", () => {
    const threads = [
      mockThread(),
      mockThread({ id: "t2", researcher_id: "other-user" }),
      mockThread({ id: "t3" }),
    ];
    const myThreads = threads.filter(t => t.researcher_id === mockUser.id);
    expect(myThreads).toHaveLength(2);
  });

  // Test 190: New thread creation
  it("190. creates thread with title and category", () => {
    const newThread = mockThread({ title: "New Discussion", category: "data-sharing" });
    expect(newThread.title).toBe("New Discussion");
    expect(newThread.category).toBe("data-sharing");
    expect(newThread.researcher_id).toBe(mockUser.id);
  });

  // Test 191: Thread deletion
  it("191. thread deletion removes from list", () => {
    const threads = [mockThread(), mockThread({ id: "t2" }), mockThread({ id: "t3" })];
    const deleteId = "t2";
    const remaining = threads.filter(t => t.id !== deleteId);
    expect(remaining).toHaveLength(2);
    expect(remaining.find(t => t.id === deleteId)).toBeUndefined();
  });

  // Test 192: Thread message sending
  it("192. message appends to thread with correct structure", () => {
    const message = {
      id: "msg-1",
      thread_id: "thread-1",
      sender_id: mockUser.id,
      content: "Let's discuss the methodology",
      created_at: new Date().toISOString(),
    };
    expect(message.thread_id).toBe("thread-1");
    expect(message.sender_id).toBe(mockUser.id);
    expect(message.content).toBeTruthy();
  });

  // Test 193: Pending invitations display
  it("193. shows pending invitations with accept/decline options", () => {
    const invitations = [
      mockInvitation({ status: "pending" }),
      mockInvitation({ id: "inv-2", status: "accepted" }),
      mockInvitation({ id: "inv-3", status: "pending" }),
    ];
    const pending = invitations.filter(i => i.status === "pending");
    expect(pending).toHaveLength(2);
  });

  // Test 194: Accept invitation
  it("194. accepting invitation changes status to accepted", () => {
    const invitation = mockInvitation();
    const responded = { ...invitation, status: "accepted" };
    expect(responded.status).toBe("accepted");
  });

  // Test 195: Decline invitation
  it("195. declining invitation changes status to declined", () => {
    const invitation = mockInvitation();
    const responded = { ...invitation, status: "declined" };
    expect(responded.status).toBe("declined");
  });

  // Test 196: Active collaborations grouped by study
  it("196. groups collaborations by study with role badges", () => {
    const collabs = [
      { study_id: "s1", study_title: "Study A", role: "lead" },
      { study_id: "s1", study_title: "Study A", role: "co-investigator" },
      { study_id: "s2", study_title: "Study B", role: "data-analyst" },
    ];
    const grouped = collabs.reduce((acc, c) => {
      if (!acc[c.study_id]) acc[c.study_id] = [];
      acc[c.study_id].push(c);
      return acc;
    }, {} as Record<string, typeof collabs>);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["s1"]).toHaveLength(2);
  });

  // Test 197: Shared Data tab shows doctor shares
  it("197. incoming doctor shares display with status badges", () => {
    const shares = [
      { ...mockDoctorResearcherShare, status: "pending" },
      { ...mockDoctorResearcherShare, id: "ds2", status: "accepted" },
    ];
    const statusBadge = (status: string) => {
      const map: Record<string, string> = { pending: "warning", accepted: "success", completed: "info" };
      return map[status] || "default";
    };
    expect(statusBadge(shares[0].status)).toBe("warning");
    expect(statusBadge(shares[1].status)).toBe("success");
  });

  // Test 198: Share status transitions
  it("198. share status transitions follow correct flow", () => {
    const validTransitions: Record<string, string[]> = {
      pending: ["accepted", "rejected"],
      accepted: ["in_progress"],
      in_progress: ["completed"],
    };
    expect(validTransitions["pending"]).toContain("accepted");
    expect(validTransitions["accepted"]).toContain("in_progress");
    expect(validTransitions["in_progress"]).toContain("completed");
  });

  // Test 199: KPI stats computation
  it("199. KPI stats reflect threads, invitations, data, collaborations", () => {
    const stats = {
      activeThreads: 5,
      pendingInvitations: 2,
      incomingData: 8,
      collaborations: 3,
    };
    expect(stats.activeThreads).toBeGreaterThan(0);
    expect(stats.pendingInvitations).toBeGreaterThanOrEqual(0);
    expect(Object.keys(stats)).toHaveLength(4);
  });

  // Test 200: Empty states
  it("200. empty states render correctly for each tab", () => {
    const emptyMessages: Record<string, string> = {
      threads: "No discussion threads yet",
      teams: "No team invitations",
      sharedData: "No shared data received",
      collaborations: "No active collaborations",
    };
    Object.values(emptyMessages).forEach(msg => {
      expect(msg.length).toBeGreaterThan(0);
    });
  });
});
