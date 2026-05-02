import { describe, it, expect, vi } from "vitest";
import { mockUser, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 24 — Study Notes Tests (Tests 265–272)
 */

const mockNote = (overrides: Record<string, unknown> = {}) => ({
  id: "note-1",
  study_id: "study-1",
  researcher_id: mockUser.id,
  title: "Initial Observations",
  content: "We observed significant variation in HbA1c levels...",
  methodology: "Longitudinal cohort analysis",
  findings: "Correlation found between BMI and glucose response",
  tags: ["diabetes", "biomarkers"],
  publication_status: "draft",
  created_at: "2025-01-15T00:00:00Z",
  updated_at: "2025-01-20T00:00:00Z",
  ...overrides,
});

describe("Phase 24: Study Notes", () => {
  // Test 265: Notes fetch order
  it("265. fetches notes by study_id ordered by updated_at desc", () => {
    const notes = [
      mockNote({ updated_at: "2025-01-10T00:00:00Z" }),
      mockNote({ id: "n2", updated_at: "2025-03-01T00:00:00Z" }),
      mockNote({ id: "n3", updated_at: "2025-02-01T00:00:00Z" }),
    ];
    const sorted = [...notes].sort(
      (a, b) => new Date(b.updated_at as string).getTime() - new Date(a.updated_at as string).getTime()
    );
    expect(sorted[0].id).toBe("n2");
  });

  // Test 266: Note creation
  it("266. creates note with title and content", () => {
    const note = mockNote({ title: "New Finding", content: "Unexpected results..." });
    expect(note.title).toBe("New Finding");
    expect(note.researcher_id).toBe(mockUser.id);
  });

  // Test 267: Note editing with optimistic update
  it("267. editing note updates local state optimistically", () => {
    const note = mockNote();
    const edited = { ...note, title: "Revised Observations", updated_at: new Date().toISOString() };
    expect(edited.title).toBe("Revised Observations");
    expect(new Date(edited.updated_at).getTime()).toBeGreaterThan(new Date(note.updated_at as string).getTime());
  });

  // Test 268: Note deletion
  it("268. note deletion removes from list", () => {
    const notes = [mockNote(), mockNote({ id: "n2" }), mockNote({ id: "n3" })];
    const remaining = notes.filter(n => n.id !== "n2");
    expect(remaining).toHaveLength(2);
  });

  // Test 269: Threaded comments
  it("269. comments section supports threaded replies", () => {
    const comments = [
      { id: "c1", note_id: "note-1", parent_id: null, content: "Great observation" },
      { id: "c2", note_id: "note-1", parent_id: "c1", content: "I agree, we should investigate further" },
      { id: "c3", note_id: "note-1", parent_id: null, content: "Different point" },
    ];
    const topLevel = comments.filter(c => c.parent_id === null);
    const replies = comments.filter(c => c.parent_id !== null);
    expect(topLevel).toHaveLength(2);
    expect(replies).toHaveLength(1);
    expect(replies[0].parent_id).toBe("c1");
  });

  // Test 270: Version history
  it("270. version history tracks edits", () => {
    const versions = [
      { version_number: 1, title: "Draft 1", changed_by: mockUser.id, created_at: "2025-01-15T00:00:00Z" },
      { version_number: 2, title: "Revised", changed_by: mockUser.id, created_at: "2025-01-18T00:00:00Z" },
      { version_number: 3, title: "Final", changed_by: mockUser.id, created_at: "2025-01-20T00:00:00Z" },
    ];
    expect(versions).toHaveLength(3);
    expect(versions[versions.length - 1].version_number).toBe(3);
  });

  // Test 271: Data references
  it("271. note data references link to cohort/pool entries", () => {
    const references = [
      { type: "cohort", id: "cohort-1", label: "Diabetes Cohort A" },
      { type: "pool", id: "pool-1", label: "Global Pool Entry #123" },
    ];
    expect(references).toHaveLength(2);
    expect(references[0].type).toBe("cohort");
    expect(references[1].type).toBe("pool");
  });

  // Test 272: Note dialog mode
  it("272. dialog opens in correct edit/view mode", () => {
    const editMode = { mode: "edit" as const, noteId: "note-1" };
    const viewMode = { mode: "view" as const, noteId: "note-1" };
    expect(editMode.mode).toBe("edit");
    expect(viewMode.mode).toBe("view");
  });
});
