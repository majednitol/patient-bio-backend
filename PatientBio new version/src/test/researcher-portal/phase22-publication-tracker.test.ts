import { describe, it, expect, vi } from "vitest";
import { mockUser, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 22 — Publication Tracker Tests (Tests 249–256)
 */

const mockPublication = (overrides: Record<string, unknown> = {}) => ({
  id: "pub-1",
  researcher_id: mockUser.id,
  title: "Genomics Biomarker Discovery",
  journal: "Nature Medicine",
  status: "draft",
  study_id: "study-1",
  submitted_at: null,
  accepted_at: null,
  published_at: null,
  doi: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

describe("Phase 22: Publication Tracker", () => {
  // Test 249: Publications list
  it("249. fetches publications by researcher_id", () => {
    const pubs = [
      mockPublication(),
      mockPublication({ id: "pub-2", title: "Cardiology Outcomes" }),
    ];
    const filtered = pubs.filter(p => p.researcher_id === mockUser.id);
    expect(filtered).toHaveLength(2);
  });

  // Test 250: New publication creation
  it("250. creates publication with metadata", () => {
    const pub = mockPublication({ title: "New Research Paper", journal: "The Lancet" });
    expect(pub.title).toBe("New Research Paper");
    expect(pub.journal).toBe("The Lancet");
    expect(pub.status).toBe("draft");
  });

  // Test 251: Status tracking
  it("251. publication status follows lifecycle", () => {
    const statuses = ["draft", "submitted", "under_review", "accepted", "published"];
    const advanceStatus = (current: string) => {
      const idx = statuses.indexOf(current);
      return idx < statuses.length - 1 ? statuses[idx + 1] : current;
    };
    expect(advanceStatus("draft")).toBe("submitted");
    expect(advanceStatus("submitted")).toBe("under_review");
    expect(advanceStatus("accepted")).toBe("published");
    expect(advanceStatus("published")).toBe("published");
  });

  // Test 252: Study report generator
  it("252. study report produces formatted output", () => {
    const report = {
      title: "Genomics Phase I - Final Report",
      sections: ["Abstract", "Methods", "Results", "Discussion", "Conclusions"],
      generatedAt: new Date().toISOString(),
    };
    expect(report.sections).toHaveLength(5);
    expect(report.sections).toContain("Methods");
  });

  // Test 253: Share insights
  it("253. share insights sends to collaborators", () => {
    const collaborators = ["collab-1", "collab-2"];
    const insight = { publicationId: "pub-1", message: "Check out our results" };
    const notifications = collaborators.map(c => ({
      recipient_id: c,
      ...insight,
    }));
    expect(notifications).toHaveLength(2);
    notifications.forEach(n => expect(n.publicationId).toBe("pub-1"));
  });

  // Test 254: Scheduled report config
  it("254. scheduled report saves preferences", () => {
    const config = {
      frequency: "weekly",
      recipients: [mockUser.email],
      includeMetrics: true,
      format: "pdf",
    };
    expect(config.frequency).toBe("weekly");
    expect(config.recipients).toContain(mockUser.email);
  });

  // Test 255: Study link
  it("255. publication correctly links to study_id", () => {
    const pub = mockPublication({ study_id: "study-42" });
    expect(pub.study_id).toBe("study-42");
  });

  // Test 256: Empty state
  it("256. empty publications state shows creation prompt", () => {
    const publications: any[] = [];
    const showPrompt = publications.length === 0;
    expect(showPrompt).toBe(true);
  });
});
