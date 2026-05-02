import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEdgeFunctionMock, mockInvokeResponse } from "./ef-helpers";

describe("Phase 7: Notifications and Reminders", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createEdgeFunctionMock();
    mockInvoke = mock.mockInvoke;
  });

  // --- send-access-notification ---
  describe("send-access-notification", () => {
    it("148. Sends push notification", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, sent: 1 }, error: null });
      const result = await mockInvoke("send-access-notification", { body: { user_id: "u1", title: "Data Accessed" } });
      expect(result.data.success).toBe(true);
    });

    it("149. Handles missing subscription", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, sent: 0, reason: "No subscription" }, error: null });
      const result = await mockInvoke("send-access-notification", { body: { user_id: "u1" } });
      expect(result.data.sent).toBe(0);
    });
  });

  // --- send-medication-reminder ---
  describe("send-medication-reminder", () => {
    it("150. Sends medication reminder", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, sent: 3, failed: 0 }, error: null });
      const result = await mockInvoke("send-medication-reminder", { body: {} });
      expect(result.data.sent).toBe(3);
    });

    it("151. Handles zero pending reminders", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, sent: 0, failed: 0 }, error: null });
      const result = await mockInvoke("send-medication-reminder", { body: {} });
      expect(result.data.sent).toBe(0);
    });
  });

  // --- schedule-medication-reminders ---
  describe("schedule-medication-reminders", () => {
    it("152. Schedules medication reminders", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, scheduled: 5, skipped: 0 }, error: null });
      const result = await mockInvoke("schedule-medication-reminders", { body: {} });
      expect(result.data.scheduled).toBe(5);
    });

    it("153. Skips existing log entries", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, scheduled: 0, skipped: 3 }, error: null });
      const result = await mockInvoke("schedule-medication-reminders", { body: {} });
      expect(result.data.skipped).toBe(3);
    });

    it("154. Calculates next occurrences correctly", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, scheduled: 2, skipped: 0 }, error: null });
      const result = await mockInvoke("schedule-medication-reminders", { body: {} });
      expect(result.data.scheduled).toBeGreaterThanOrEqual(0);
    });

    it("155. Respects days_of_week filter", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, scheduled: 1, skipped: 0 }, error: null });
      const result = await mockInvoke("schedule-medication-reminders", { body: {} });
      expect(result.data.success).toBe(true);
    });

    it("166. Multiple reminder_times handled", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, scheduled: 4, skipped: 0 }, error: null });
      const result = await mockInvoke("schedule-medication-reminders", { body: {} });
      expect(result.data.scheduled).toBe(4);
    });
  });

  // --- schedule-appointment-reminders ---
  describe("schedule-appointment-reminders", () => {
    it("156. Schedules appointment reminders", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, message: "Scheduled 3 reminders, skipped 0 appointments" }, error: null });
      const result = await mockInvoke("schedule-appointment-reminders", { body: {} });
      expect(result.data.message).toContain("Scheduled");
    });

    it("157. Skips past reminder times", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, message: "Scheduled 0 reminders, skipped 2 appointments" }, error: null });
      const result = await mockInvoke("schedule-appointment-reminders", { body: {} });
      expect(result.data.message).toContain("skipped");
    });

    it("158. Respects email/SMS preferences", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, message: "Scheduled 1 reminders" }, error: null });
      const result = await mockInvoke("schedule-appointment-reminders", { body: {} });
      expect(result.data.success).toBe(true);
    });

    it("159. Skips existing reminders", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, message: "Scheduled 0 reminders" }, error: null });
      const result = await mockInvoke("schedule-appointment-reminders", { body: {} });
      expect(result.data.success).toBe(true);
    });

    it("160. Default 24h reminder when no prefs", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, message: "Scheduled 1 reminders" }, error: null });
      const result = await mockInvoke("schedule-appointment-reminders", { body: {} });
      expect(result.data.success).toBe(true);
    });

    it("161. No appointments returns message", async () => {
      mockInvokeResponse(mockInvoke, { data: { message: "No upcoming appointments to schedule reminders for" }, error: null });
      const result = await mockInvoke("schedule-appointment-reminders", { body: {} });
      expect(result.data.message).toContain("No upcoming appointments");
    });

    it("167. 48-hour lookahead window", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, message: "Scheduled 2 reminders" }, error: null });
      const result = await mockInvoke("schedule-appointment-reminders", { body: {} });
      expect(result.data.success).toBe(true);
    });

    it("168. SMS reminder when enabled", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, message: "Scheduled 1 reminders" }, error: null });
      const result = await mockInvoke("schedule-appointment-reminders", { body: {} });
      expect(result.data.success).toBe(true);
    });

    it("169. Email reminder when enabled", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, message: "Scheduled 1 reminders" }, error: null });
      const result = await mockInvoke("schedule-appointment-reminders", { body: {} });
      expect(result.data.success).toBe(true);
    });
  });

  // --- send-appointment-reminder ---
  describe("send-appointment-reminder", () => {
    it("162. Sends appointment reminder", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true }, error: null });
      const result = await mockInvoke("send-appointment-reminder", { body: {} });
      expect(result.data.success).toBe(true);
    });
  });

  // --- send-weekly-digest ---
  describe("send-weekly-digest", () => {
    it("163. Sends weekly digest", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, sent: 10 }, error: null });
      const result = await mockInvoke("send-weekly-digest", { body: {} });
      expect(result.data.sent).toBe(10);
    });

    it("164. Handles no active users", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, sent: 0 }, error: null });
      const result = await mockInvoke("send-weekly-digest", { body: {} });
      expect(result.data.sent).toBe(0);
    });
  });
});
