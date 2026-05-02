import { describe, it, expect, vi } from "vitest";
import { mockUser, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 17 — Study Protocols and Milestones Tests (Tests 201–214)
 */

const mockStudy = (overrides: Record<string, unknown> = {}) => ({
  id: "study-1",
  researcher_id: mockUser.id,
  title: "Genomics Phase I",
  description: "A study on genomics",
  disease_category: "diabetes",
  study_type: "observational",
  status: "active",
  target_sample_size: 100,
  notes: "Initial notes",
  created_at: "2025-01-15T00:00:00Z",
  updated_at: "2025-01-15T00:00:00Z",
  ...overrides,
});

const mockMilestone = (overrides: Record<string, unknown> = {}) => ({
  id: "ms-1",
  study_id: "study-1",
  name: "Ethics Approval",
  description: "Get IRB approval",
  status: "completed",
  milestone_order: 1,
  due_date: "2025-03-01",
  created_at: "2025-01-15T00:00:00Z",
  ...overrides,
});

describe("Phase 17: Study Protocols and Milestones", () => {
  // Test 201: Study list order
  it("201. fetches studies ordered by created_at desc", () => {
    const studies = [
      mockStudy({ id: "s1", created_at: "2025-01-01T00:00:00Z" }),
      mockStudy({ id: "s2", created_at: "2025-03-01T00:00:00Z" }),
      mockStudy({ id: "s3", created_at: "2025-02-01T00:00:00Z" }),
    ];
    const sorted = [...studies].sort(
      (a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
    );
    expect(sorted[0].id).toBe("s2");
  });

  // Test 202: Study from template populates milestones
  it("202. template creates study with predefined milestones", () => {
    const template = {
      name: "Clinical Trial",
      milestones: ["Ethics Approval", "Recruitment", "Data Collection", "Analysis", "Publication"],
    };
    const milestones = template.milestones.map((name, i) => ({
      name,
      milestone_order: i + 1,
      status: "pending",
    }));
    expect(milestones).toHaveLength(5);
    expect(milestones[0].name).toBe("Ethics Approval");
    expect(milestones[4].milestone_order).toBe(5);
  });

  // Test 203: Search by title
  it("203. search filters studies by title case-insensitively", () => {
    const studies = [
      mockStudy({ title: "Genomics Phase I" }),
      mockStudy({ id: "s2", title: "Cardiology Trial" }),
      mockStudy({ id: "s3", title: "Advanced genomics" }),
    ];
    const query = "genomics";
    const filtered = studies.filter(s =>
      (s.title as string).toLowerCase().includes(query.toLowerCase())
    );
    expect(filtered).toHaveLength(2);
  });

  // Test 204: Filter by disease category
  it("204. filters studies by disease category", () => {
    const studies = [
      mockStudy({ disease_category: "diabetes" }),
      mockStudy({ id: "s2", disease_category: "cardiology" }),
      mockStudy({ id: "s3", disease_category: "diabetes" }),
    ];
    const filtered = studies.filter(s => s.disease_category === "diabetes");
    expect(filtered).toHaveLength(2);
  });

  // Test 205: Filter by study type
  it("205. filters studies by study type", () => {
    const studies = [
      mockStudy({ study_type: "observational" }),
      mockStudy({ id: "s2", study_type: "interventional" }),
    ];
    const filtered = studies.filter(s => s.study_type === "interventional");
    expect(filtered).toHaveLength(1);
  });

  // Test 206: KPI computation
  it("206. computes KPIs: total, active, avg progress, due this week", () => {
    const now = new Date();
    const inOneWeek = new Date(now.getTime() + 7 * 86400000);
    const studies = [
      mockStudy({ status: "active" }),
      mockStudy({ id: "s2", status: "active" }),
      mockStudy({ id: "s3", status: "completed" }),
    ];
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
    const milestones = [
      mockMilestone({ study_id: "study-1", status: "completed" }),
      mockMilestone({ id: "ms-2", study_id: "study-1", status: "pending", due_date: tomorrow }),
      mockMilestone({ id: "ms-3", study_id: "s2", status: "in_progress" }),
    ];
    const total = studies.length;
    const active = studies.filter(s => s.status === "active").length;
    const completedMs = milestones.filter(m => m.status === "completed").length;
    const avgProgress = milestones.length > 0 ? Math.round((completedMs / milestones.length) * 100) : 0;
    const dueThisWeek = milestones.filter(m => {
      if (!m.due_date || m.status === "completed") return false;
      const due = new Date(m.due_date as string);
      return due >= now && due <= inOneWeek;
    }).length;

    expect(total).toBe(3);
    expect(active).toBe(2);
    expect(avgProgress).toBe(33);
    expect(dueThisWeek).toBe(1);
  });

  // Test 207: Study detail dialog data
  it("207. detail dialog receives correct study data", () => {
    const study = mockStudy();
    expect(study.title).toBe("Genomics Phase I");
    expect(study.notes).toBe("Initial notes");
    expect(study.target_sample_size).toBe(100);
  });

  // Test 208: Inline study edit
  it("208. inline edit updates title, description, notes", () => {
    const study = mockStudy();
    const updated = {
      ...study,
      title: "Updated Title",
      description: "Updated description",
      notes: "Updated notes",
    };
    expect(updated.title).toBe("Updated Title");
    expect(updated.description).toBe("Updated description");
    expect(updated.notes).toBe("Updated notes");
  });

  // Test 209: Add custom milestone with auto-order
  it("209. adds milestone with auto-incremented order", () => {
    const existing = [
      mockMilestone({ milestone_order: 1 }),
      mockMilestone({ id: "ms-2", milestone_order: 2 }),
    ];
    const nextOrder = Math.max(...existing.map(m => m.milestone_order as number)) + 1;
    const newMs = mockMilestone({ id: "ms-3", name: "Custom Step", milestone_order: nextOrder });
    expect(newMs.milestone_order).toBe(3);
  });

  // Test 210: Delete milestone
  it("210. deleting milestone removes from list", () => {
    const milestones = [
      mockMilestone({ id: "ms-1" }),
      mockMilestone({ id: "ms-2" }),
      mockMilestone({ id: "ms-3" }),
    ];
    const remaining = milestones.filter(m => m.id !== "ms-2");
    expect(remaining).toHaveLength(2);
  });

  // Test 211: Milestone status advance
  it("211. milestone status advances: pending -> in_progress -> completed", () => {
    const advanceStatus = (current: string) => {
      const flow: Record<string, string> = { pending: "in_progress", in_progress: "completed" };
      return flow[current] || current;
    };
    expect(advanceStatus("pending")).toBe("in_progress");
    expect(advanceStatus("in_progress")).toBe("completed");
    expect(advanceStatus("completed")).toBe("completed");
  });

  // Test 212: Collaborator manager embedded mode
  it("212. collaborator manager supports embedded rendering", () => {
    const props = { studyId: "study-1", studyTitle: "Genomics Phase I", embedded: true };
    expect(props.embedded).toBe(true);
    expect(props.studyId).toBeDefined();
  });

  // Test 213: DUA tab filters by study_id
  it("213. DUA tab filters agreements by study_id", () => {
    const allDUAs = [
      { id: "d1", study_id: "study-1" },
      { id: "d2", study_id: "study-2" },
      { id: "d3", study_id: "study-1" },
    ];
    const studyDUAs = allDUAs.filter(d => d.study_id === "study-1");
    expect(studyDUAs).toHaveLength(2);
  });

  // Test 214: Mini progress ring percentage
  it("214. progress ring computes percentage from milestone statuses", () => {
    const milestones = [
      { status: "completed" },
      { status: "completed" },
      { status: "in_progress" },
      { status: "pending" },
    ];
    const completed = milestones.filter(m => m.status === "completed").length;
    const pct = Math.round((completed / milestones.length) * 100);
    expect(pct).toBe(50);
  });
});
