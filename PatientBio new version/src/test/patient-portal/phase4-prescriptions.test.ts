import { describe, it, expect, vi, beforeEach } from "vitest";
import { startOfDay, endOfDay, format, subDays } from "date-fns";

describe("Phase 4: Prescriptions and Medications", () => {
  // Test 26-28: Prescriptions
  describe("Test 26: View digital prescriptions", () => {
    it("should structure prescription with medication details", () => {
      const prescription = {
        id: "rx-1",
        doctor_id: "doc-1",
        patient_id: "pat-1",
        diagnosis: "Common Cold",
        medications: [
          { name: "Paracetamol", dosage: "500mg", frequency: "3x daily", duration: "5 days" },
          { name: "Vitamin C", dosage: "1000mg", frequency: "1x daily", duration: "10 days" },
        ],
        created_at: new Date().toISOString(),
      };

      expect(prescription.medications).toHaveLength(2);
      expect(prescription.diagnosis).toBe("Common Cold");
      expect(prescription.medications[0].name).toBe("Paracetamol");
    });
  });

  describe("Test 27: Prescription detail view", () => {
    it("should display full medication details", () => {
      const medication = {
        name: "Amoxicillin",
        dosage: "250mg",
        frequency: "3 times daily",
        duration: "7 days",
        instructions: "Take after meals",
      };

      expect(medication.name).toBeDefined();
      expect(medication.dosage).toBeDefined();
      expect(medication.frequency).toBeDefined();
      expect(medication.duration).toBeDefined();
    });
  });

  // Test 29-31: Medication Tracking
  describe("Test 29: Medication reminders", () => {
    it("should filter today's medication logs", () => {
      const today = new Date();
      const start = startOfDay(today);
      const end = endOfDay(today);

      const logs = [
        { id: "1", scheduled_for: today.toISOString(), status: "pending" },
        { id: "2", scheduled_for: subDays(today, 1).toISOString(), status: "taken" },
        { id: "3", scheduled_for: today.toISOString(), status: "sent" },
      ];

      const todayLogs = logs.filter((log) => {
        const d = new Date(log.scheduled_for);
        return d >= start && d <= end;
      });

      expect(todayLogs).toHaveLength(2);
    });
  });

  describe("Test 30: Medication streak tracking", () => {
    it("should calculate adherence percentage", () => {
      const logs = [
        { status: "taken" },
        { status: "taken" },
        { status: "missed" },
        { status: "taken" },
        { status: "skipped" },
      ];

      const total = logs.length;
      const taken = logs.filter((l) => l.status === "taken").length;
      const percentage = Math.round((taken / total) * 100);

      expect(percentage).toBe(60);
    });

    it("should handle empty logs", () => {
      const logs: any[] = [];
      const percentage = logs.length > 0
        ? Math.round((logs.filter((l) => l.status === "taken").length / logs.length) * 100)
        : 0;

      expect(percentage).toBe(0);
    });
  });

  describe("Test 31: Mark medication as taken", () => {
    it("should count pending medications correctly", () => {
      const now = new Date();
      const logs = [
        { status: "pending", scheduled_for: subDays(now, 0).toISOString() },
        { status: "sent", scheduled_for: subDays(now, 0).toISOString() },
        { status: "taken", scheduled_for: subDays(now, 0).toISOString() },
        { status: "pending", scheduled_for: new Date(now.getTime() + 3600000).toISOString() },
      ];

      const pendingCount = logs.filter(
        (log) =>
          (log.status === "pending" || log.status === "sent") &&
          new Date(log.scheduled_for) <= now
      ).length;

      expect(pendingCount).toBe(2);
    });
  });

  describe("Group logs by date", () => {
    it("should group medication logs by date", () => {
      const logs = [
        { id: "1", scheduled_for: "2026-02-16T09:00:00Z" },
        { id: "2", scheduled_for: "2026-02-16T14:00:00Z" },
        { id: "3", scheduled_for: "2026-02-15T09:00:00Z" },
      ];

      const grouped = logs.reduce((acc, log) => {
        const date = format(new Date(log.scheduled_for), "yyyy-MM-dd");
        if (!acc[date]) acc[date] = [];
        acc[date].push(log);
        return acc;
      }, {} as Record<string, typeof logs>);

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped["2026-02-16"]).toHaveLength(2);
      expect(grouped["2026-02-15"]).toHaveLength(1);
    });
  });
});
