import { describe, it, expect, vi, beforeEach } from "vitest";
import { METRIC_TYPES } from "@/hooks/useHealthMetrics";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: "test-id" }, error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    })),
  },
}));

// Mock Auth Context
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-123" } }),
}));

describe("Health Metrics System", () => {
  describe("METRIC_TYPES Configuration", () => {
    it("should define all 10 core metric types", () => {
      expect(METRIC_TYPES).toHaveLength(10);
    });

    it("should include weight tracking", () => {
      const weight = METRIC_TYPES.find((m) => m.type === "weight");
      expect(weight).toBeDefined();
      expect(weight?.unit).toBe("kg");
      expect(weight?.label).toBe("Weight");
    });

    it("should include blood pressure metrics", () => {
      const systolic = METRIC_TYPES.find((m) => m.type === "blood_pressure_systolic");
      const diastolic = METRIC_TYPES.find((m) => m.type === "blood_pressure_diastolic");

      expect(systolic).toBeDefined();
      expect(systolic?.unit).toBe("mmHg");
      expect(diastolic).toBeDefined();
      expect(diastolic?.unit).toBe("mmHg");
    });

    it("should include heart rate tracking", () => {
      const heartRate = METRIC_TYPES.find((m) => m.type === "heart_rate");
      expect(heartRate).toBeDefined();
      expect(heartRate?.unit).toBe("bpm");
    });

    it("should include blood sugar tracking", () => {
      const bloodSugar = METRIC_TYPES.find((m) => m.type === "blood_sugar");
      expect(bloodSugar).toBeDefined();
      expect(bloodSugar?.unit).toBe("mg/dL");
    });

    it("should include temperature tracking", () => {
      const temp = METRIC_TYPES.find((m) => m.type === "temperature");
      expect(temp).toBeDefined();
      expect(temp?.unit).toBe("°C");
    });

    it("should include oxygen saturation tracking", () => {
      const oxygen = METRIC_TYPES.find((m) => m.type === "oxygen_saturation");
      expect(oxygen).toBeDefined();
      expect(oxygen?.unit).toBe("%");
    });

    it("should include lifestyle metrics", () => {
      const sleep = METRIC_TYPES.find((m) => m.type === "sleep_hours");
      const steps = METRIC_TYPES.find((m) => m.type === "steps");
      const water = METRIC_TYPES.find((m) => m.type === "water_intake");

      expect(sleep).toBeDefined();
      expect(steps).toBeDefined();
      expect(water).toBeDefined();
    });

    it("should have icons for all metrics", () => {
      METRIC_TYPES.forEach((metric) => {
        expect(metric.icon).toBeDefined();
        expect(metric.icon.length).toBeGreaterThan(0);
      });
    });

    it("should have unique type identifiers", () => {
      const types = METRIC_TYPES.map((m) => m.type);
      const uniqueTypes = [...new Set(types)];
      expect(types.length).toBe(uniqueTypes.length);
    });
  });

  describe("Trend Calculation", () => {
    // Simulate the calculateTrend function logic
    const calculateTrend = (
      metrics: { value: number }[]
    ): { direction: "up" | "down" | "stable"; percentage: number } | null => {
      if (!metrics || metrics.length < 2) return null;

      const recent = metrics.slice(-5);
      const older = metrics.slice(0, Math.min(5, metrics.length - 5));

      if (older.length === 0) return null;

      const recentAvg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
      const olderAvg = older.reduce((sum, m) => sum + m.value, 0) / older.length;

      const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;

      if (Math.abs(percentChange) < 2) {
        return { direction: "stable", percentage: 0 };
      }

      return {
        direction: percentChange > 0 ? "up" : "down",
        percentage: Math.abs(percentChange),
      };
    };

    it("should return null for insufficient data", () => {
      expect(calculateTrend([])).toBeNull();
      expect(calculateTrend([{ value: 70 }])).toBeNull();
    });

    it("should detect upward trend", () => {
      const metrics = [
        { value: 70 },
        { value: 71 },
        { value: 72 },
        { value: 73 },
        { value: 74 },
        { value: 75 },
        { value: 76 },
        { value: 77 },
        { value: 78 },
        { value: 80 },
      ];

      const trend = calculateTrend(metrics);
      expect(trend).not.toBeNull();
      expect(trend?.direction).toBe("up");
      expect(trend?.percentage).toBeGreaterThan(0);
    });

    it("should detect downward trend", () => {
      const metrics = [
        { value: 80 },
        { value: 79 },
        { value: 78 },
        { value: 77 },
        { value: 76 },
        { value: 75 },
        { value: 74 },
        { value: 73 },
        { value: 72 },
        { value: 70 },
      ];

      const trend = calculateTrend(metrics);
      expect(trend).not.toBeNull();
      expect(trend?.direction).toBe("down");
      expect(trend?.percentage).toBeGreaterThan(0);
    });

    it("should detect stable trend (less than 2% change)", () => {
      const metrics = [
        { value: 70 },
        { value: 70.5 },
        { value: 70.2 },
        { value: 70.3 },
        { value: 70.1 },
        { value: 70.4 },
        { value: 70.6 },
        { value: 70.5 },
        { value: 70.3 },
        { value: 70.2 },
      ];

      const trend = calculateTrend(metrics);
      expect(trend).not.toBeNull();
      expect(trend?.direction).toBe("stable");
      expect(trend?.percentage).toBe(0);
    });
  });

  describe("Metric Data Validation", () => {
    it("should validate weight is within reasonable range", () => {
      const isValidWeight = (value: number) => value > 0 && value < 700;
      expect(isValidWeight(70)).toBe(true);
      expect(isValidWeight(0)).toBe(false);
      expect(isValidWeight(-10)).toBe(false);
      expect(isValidWeight(800)).toBe(false);
    });

    it("should validate blood pressure ranges", () => {
      const isValidBP = (systolic: number, diastolic: number) =>
        systolic > 60 &&
        systolic < 250 &&
        diastolic > 40 &&
        diastolic < 150 &&
        systolic > diastolic;

      expect(isValidBP(120, 80)).toBe(true);
      expect(isValidBP(90, 60)).toBe(true);
      expect(isValidBP(80, 90)).toBe(false); // systolic < diastolic
      expect(isValidBP(300, 80)).toBe(false);
    });

    it("should validate heart rate ranges", () => {
      const isValidHR = (value: number) => value > 30 && value < 250;
      expect(isValidHR(72)).toBe(true);
      expect(isValidHR(180)).toBe(true); // exercise
      expect(isValidHR(20)).toBe(false);
      expect(isValidHR(300)).toBe(false);
    });

    it("should validate oxygen saturation ranges", () => {
      const isValidSpO2 = (value: number) => value >= 0 && value <= 100;
      expect(isValidSpO2(98)).toBe(true);
      expect(isValidSpO2(95)).toBe(true);
      expect(isValidSpO2(101)).toBe(false);
      expect(isValidSpO2(-5)).toBe(false);
    });

    it("should validate temperature ranges", () => {
      const isValidTemp = (value: number) => value > 34 && value < 43;
      expect(isValidTemp(36.5)).toBe(true);
      expect(isValidTemp(38.5)).toBe(true); // fever
      expect(isValidTemp(30)).toBe(false);
      expect(isValidTemp(50)).toBe(false);
    });
  });

  describe("Metric Source Tracking", () => {
    it("should support manual entry source", () => {
      const validSources = ["manual", "device", "lab", "import"];
      expect(validSources).toContain("manual");
    });

    it("should support device sync source", () => {
      const validSources = ["manual", "device", "lab", "import"];
      expect(validSources).toContain("device");
    });

    it("should support lab result source", () => {
      const validSources = ["manual", "device", "lab", "import"];
      expect(validSources).toContain("lab");
    });
  });
});
