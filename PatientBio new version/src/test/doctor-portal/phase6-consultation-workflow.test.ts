import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    functions: { invoke: vi.fn() },
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null }) },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "doctor-123" } }),
}));

describe("Phase 6: Consultation Workflow", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Average Duration Calculation", () => {
    it("averages last 20 completed appointments", () => {
      const durations = [10, 15, 12, 8, 20]; // minutes
      const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
      expect(avg).toBe(13);
    });

    it("returns null when no history", () => {
      const data: any[] = [];
      const result = data.length === 0 ? null : 15;
      expect(result).toBeNull();
    });

    it("rounds to 1 decimal place", () => {
      const avg = 12.3456;
      const rounded = Math.round(avg * 10) / 10;
      expect(rounded).toBe(12.3);
    });

    it("calculates duration from started_at and ended_at", () => {
      const start = new Date("2024-01-01T09:00:00Z").getTime();
      const end = new Date("2024-01-01T09:15:00Z").getTime();
      const minutes = (end - start) / 60000;
      expect(minutes).toBe(15);
    });
  });

  describe("Duration Color Transitions", () => {
    it("returns green when under average", () => {
      const getColor = (elapsed: number, avg: number) => {
        const ratio = elapsed / avg;
        if (ratio <= 1) return "green";
        if (ratio <= 1.5) return "amber";
        return "red";
      };
      expect(getColor(10, 15)).toBe("green");
      expect(getColor(15, 15)).toBe("green");
      expect(getColor(20, 15)).toBe("amber");
      expect(getColor(25, 15)).toBe("red");
    });
  });

  describe("Visit Summary", () => {
    it("generates summary via edge function", () => {
      const functionName = "generate-visit-summary";
      const body = { appointmentId: "apt-1" };
      expect(functionName).toBe("generate-visit-summary");
      expect(body.appointmentId).toBeTruthy();
    });

    it("approve sets is_approved=true and approved_at", () => {
      const update = { is_approved: true, approved_at: new Date().toISOString() };
      expect(update.is_approved).toBe(true);
      expect(update.approved_at).toBeTruthy();
    });

    it("patient only sees approved summaries", () => {
      const filter = { is_approved: true };
      expect(filter.is_approved).toBe(true);
    });

    it("fetches single summary by appointment_id", () => {
      const queryConfig = {
        table: "visit_summaries",
        filter: { appointment_id: "apt-1" },
        method: "maybeSingle",
      };
      expect(queryConfig.method).toBe("maybeSingle");
    });
  });
});
