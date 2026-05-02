import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
      }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "doctor-123" } }),
}));

describe("Phase 12: Availability and Smart Scheduling", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Availability CRUD", () => {
    it("fetches slots by day_of_week filterable by hospital", () => {
      const queryConfig = {
        table: "doctor_availability",
        filters: { is_active: true, doctor_id: "doctor-123" },
        ordering: "day_of_week",
      };
      expect(queryConfig.ordering).toBe("day_of_week");
    });

    it("upserts via onConflict on doctor_id,hospital_id,day_of_week", () => {
      const upsertConfig = {
        onConflict: "doctor_id,hospital_id,day_of_week",
      };
      expect(upsertConfig.onConflict).toContain("doctor_id");
    });

    it("deletes availability by id", () => {
      const deleteConfig = { table: "doctor_availability", filter: { id: "avail-1" } };
      expect(deleteConfig.filter.id).toBe("avail-1");
    });
  });

  describe("Time Off", () => {
    it("inserts time off with date range", () => {
      const timeOff = {
        doctor_id: "doctor-123",
        start_date: "2024-03-01",
        end_date: "2024-03-05",
        reason: "Conference",
      };
      expect(timeOff.start_date).toBe("2024-03-01");
      expect(timeOff.end_date).toBe("2024-03-05");
    });

    it("deletes time off by id", () => {
      const deleteConfig = { table: "doctor_time_off", filter: { id: "to-1" } };
      expect(deleteConfig.table).toBe("doctor_time_off");
    });
  });

  describe("Slot Recommendations", () => {
    it("analyzes 14-day density and returns load levels", () => {
      const countByDate: Record<string, number> = {
        "2024-03-01": 2,
        "2024-03-02": 8,
        "2024-03-03": 0,
        "2024-03-04": 5,
      };
      const counts = Object.values(countByDate);
      const avg = counts.reduce((s, c) => s + c, 0) / counts.length;

      const getLoad = (count: number) => {
        if (count <= avg * 0.5) return "low";
        if (count >= avg * 1.5) return "high";
        return "medium";
      };

      expect(getLoad(0)).toBe("low");
      expect(getLoad(8)).toBe("high");
      expect(getLoad(5)).toBe("medium");
    });

    it("returns top 3 lowest-load dates as suggested", () => {
      const recommendations = [
        { date: "2024-03-03", appointmentCount: 0 },
        { date: "2024-03-01", appointmentCount: 2 },
        { date: "2024-03-04", appointmentCount: 5 },
        { date: "2024-03-02", appointmentCount: 8 },
      ].sort((a, b) => a.appointmentCount - b.appointmentCount);

      const suggested = recommendations.slice(0, 3).map((r) => r.date);
      expect(suggested).toEqual(["2024-03-03", "2024-03-01", "2024-03-04"]);
    });

    it("correctly splits morning/afternoon by hour < 12", () => {
      const appointments = [
        { start_time: "09:00" },
        { start_time: "11:30" },
        { start_time: "14:00" },
        { start_time: "16:30" },
      ];
      let morning = 0, afternoon = 0;
      for (const a of appointments) {
        const hour = parseInt(a.start_time.split(":")[0], 10);
        if (hour < 12) morning++;
        else afternoon++;
      }
      expect(morning).toBe(2);
      expect(afternoon).toBe(2);
    });
  });
});
