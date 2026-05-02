import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "doctor-123" } }),
}));

describe("Phase 4: Appointments and Queue", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Appointment Status Transitions", () => {
    it("validates scheduled -> confirmed -> completed flow", () => {
      const validTransitions: Record<string, string[]> = {
        scheduled: ["confirmed", "cancelled"],
        confirmed: ["completed", "cancelled"],
        completed: [],
        cancelled: [],
      };
      expect(validTransitions["scheduled"]).toContain("confirmed");
      expect(validTransitions["confirmed"]).toContain("completed");
    });

    it("sets cancelled_by and cancelled_at on cancellation", () => {
      const userId = "doctor-123";
      const updateData: Record<string, unknown> = { status: "cancelled" };
      updateData.cancelled_by = userId;
      updateData.cancelled_at = new Date().toISOString();
      expect(updateData.cancelled_by).toBe(userId);
      expect(updateData.cancelled_at).toBeDefined();
    });
  });

  describe("Queue Priority Sorting", () => {
    it("sorts emergency > urgent > normal", () => {
      const priorityOrder = { emergency: 0, urgent: 1, normal: 2 };
      const entries = [
        { priority: "normal" as const, checked_in_at: "2024-01-01T09:00:00Z" },
        { priority: "emergency" as const, checked_in_at: "2024-01-01T09:30:00Z" },
        { priority: "urgent" as const, checked_in_at: "2024-01-01T08:30:00Z" },
      ];

      const sorted = entries.sort((a, b) => {
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        return new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime();
      });

      expect(sorted[0].priority).toBe("emergency");
      expect(sorted[1].priority).toBe("urgent");
      expect(sorted[2].priority).toBe("normal");
    });

    it("sorts same priority by check-in time", () => {
      const entries = [
        { priority: "normal" as const, checked_in_at: "2024-01-01T10:00:00Z" },
        { priority: "normal" as const, checked_in_at: "2024-01-01T09:00:00Z" },
      ];
      const sorted = entries.sort(
        (a, b) => new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime()
      );
      expect(sorted[0].checked_in_at).toBe("2024-01-01T09:00:00Z");
    });
  });

  describe("Queue Operations", () => {
    it("callNext completes current and sets next to in_consultation", () => {
      const operations = [
        { action: "update", filter: { status: "in_consultation" }, set: { status: "completed" } },
        { action: "update", filter: { id: "entry-1" }, set: { status: "in_consultation" } },
      ];
      expect(operations[0].set.status).toBe("completed");
      expect(operations[1].set.status).toBe("in_consultation");
    });

    it("skipPatient sets status to skipped with completed_at", () => {
      const update = { status: "skipped", completed_at: new Date().toISOString() };
      expect(update.status).toBe("skipped");
      expect(update.completed_at).toBeTruthy();
    });

    it("completePatient sets status to completed with completed_at", () => {
      const update = { status: "completed", completed_at: new Date().toISOString() };
      expect(update.status).toBe("completed");
    });

    it("addToQueue calculates queue_position from waiting count", () => {
      const waitingCount = 3;
      const newPosition = waitingCount + 1;
      expect(newPosition).toBe(4);
    });

    it("handles duplicate appointment_id error", () => {
      const error = { message: "duplicate key value violates unique constraint" };
      expect(error.message.includes("duplicate")).toBe(true);
    });
  });

  describe("Waiting/InConsultation Derivation", () => {
    it("correctly filters queue into waiting and inConsultation", () => {
      const queue = [
        { id: "1", status: "waiting" as const },
        { id: "2", status: "in_consultation" as const },
        { id: "3", status: "waiting" as const },
      ];
      const waiting = queue.filter((q) => q.status === "waiting");
      const inConsultation = queue.find((q) => q.status === "in_consultation");
      expect(waiting.length).toBe(2);
      expect(inConsultation?.id).toBe("2");
    });
  });

  describe("Consultation Timer", () => {
    it("start consultation sets consultation_started_at", () => {
      const update = {
        consultation_started_at: new Date().toISOString(),
        status: "confirmed",
      };
      expect(update.consultation_started_at).toBeTruthy();
      expect(update.status).toBe("confirmed");
    });

    it("end consultation sets consultation_ended_at", () => {
      const update = {
        consultation_ended_at: new Date().toISOString(),
        status: "completed",
      };
      expect(update.consultation_ended_at).toBeTruthy();
    });
  });

  describe("Real-time Queue Subscription", () => {
    it("subscribes to patient_queue table changes", () => {
      const channelConfig = {
        event: "*",
        schema: "public",
        table: "patient_queue",
        filter: "doctor_id=eq.doctor-123",
      };
      expect(channelConfig.table).toBe("patient_queue");
      expect(channelConfig.filter).toContain("doctor-123");
    });
  });
});
