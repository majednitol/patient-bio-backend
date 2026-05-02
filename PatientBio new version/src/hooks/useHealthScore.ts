import { useMemo } from "react";
import { useHealthMetrics, METRIC_TYPES } from "@/hooks/useHealthMetrics";

/** Normal ranges for each metric type (used for "in-range" scoring) */
const NORMAL_RANGES: Record<string, { min: number; max: number }> = {
  weight: { min: 40, max: 120 },
  blood_pressure_systolic: { min: 90, max: 140 },
  blood_pressure_diastolic: { min: 60, max: 90 },
  heart_rate: { min: 60, max: 100 },
  blood_sugar: { min: 70, max: 140 },
  temperature: { min: 36.1, max: 37.5 },
  oxygen_saturation: { min: 95, max: 100 },
  sleep_hours: { min: 6, max: 9 },
  steps: { min: 3000, max: 30000 },
  water_intake: { min: 1500, max: 4000 },
};

export interface ScoreBreakdown {
  coverage: number;
  inRange: number;
  trend: number;
  consistency: number;
}

export interface MetricStatus {
  type: string;
  label: string;
  unit: string;
  icon: string;
  latestValue: number | null;
  normalRange: { min: number; max: number };
  status: "good" | "warning" | "critical" | "untracked";
}

export interface HealthScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
  label: string;
  color: string;
  trackedTypes: number;
  totalTypes: number;
  metricStatuses: MetricStatus[];
  untrackedTypes: string[];
}

function getLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "text-green-600" };
  if (score >= 60) return { label: "Good", color: "text-blue-600" };
  if (score >= 40) return { label: "Fair", color: "text-yellow-600" };
  return { label: "Needs Attention", color: "text-red-600" };
}

export { NORMAL_RANGES };

export const useHealthScore = (days = 30): HealthScoreResult => {
  const { metrics } = useHealthMetrics(undefined, days);

  return useMemo(() => {
    const totalTypes = METRIC_TYPES.length;

    const emptyStatuses: MetricStatus[] = METRIC_TYPES.map((mt) => ({
      type: mt.type,
      label: mt.label,
      unit: mt.unit,
      icon: mt.icon,
      latestValue: null,
      normalRange: NORMAL_RANGES[mt.type] || { min: 0, max: 100 },
      status: "untracked" as const,
    }));

    if (!metrics || metrics.length === 0) {
      return {
        score: 0,
        breakdown: { coverage: 0, inRange: 0, trend: 0, consistency: 0 },
        label: "No Data",
        color: "text-muted-foreground",
        trackedTypes: 0,
        totalTypes,
        metricStatuses: emptyStatuses,
        untrackedTypes: METRIC_TYPES.map((mt) => mt.type),
      };
    }

    // Group metrics by type
    const byType: Record<string, Array<{ value: number; date: Date }>> = {};
    for (const m of metrics) {
      if (!byType[m.metric_type]) byType[m.metric_type] = [];
      byType[m.metric_type].push({ value: Number(m.value), date: new Date(m.measured_at) });
    }

    const trackedTypeNames = Object.keys(byType);
    const trackedTypes = trackedTypeNames.length;
    const untrackedTypes = METRIC_TYPES.filter((mt) => !byType[mt.type]).map((mt) => mt.type);

    // Build per-metric statuses
    const metricStatuses: MetricStatus[] = METRIC_TYPES.map((mt) => {
      const data = byType[mt.type];
      const range = NORMAL_RANGES[mt.type] || { min: 0, max: 100 };
      if (!data || data.length === 0) {
        return { type: mt.type, label: mt.label, unit: mt.unit, icon: mt.icon, latestValue: null, normalRange: range, status: "untracked" as const };
      }
      const sorted = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
      const latest = sorted[sorted.length - 1].value;
      let status: "good" | "warning" | "critical" = "good";
      if (latest < range.min || latest > range.max) {
        const deviation = latest < range.min
          ? (range.min - latest) / (range.max - range.min)
          : (latest - range.max) / (range.max - range.min);
        status = deviation > 0.3 ? "critical" : "warning";
      }
      return { type: mt.type, label: mt.label, unit: mt.unit, icon: mt.icon, latestValue: latest, normalRange: range, status };
    });

    // --- 1. Coverage score (0-25) ---
    const coverage = Math.round((trackedTypes / totalTypes) * 25);

    // --- 2. In-range score (0-35) ---
    let totalReadings = 0;
    let inRangeReadings = 0;
    for (const [type, data] of Object.entries(byType)) {
      const range = NORMAL_RANGES[type];
      if (!range) continue;
      const recent = data.slice(-5);
      for (const d of recent) {
        totalReadings++;
        if (d.value >= range.min && d.value <= range.max) inRangeReadings++;
      }
    }
    const inRange = totalReadings > 0 ? Math.round((inRangeReadings / totalReadings) * 35) : 0;

    // --- 3. Trend score (0-25) ---
    let trendPoints = 0;
    let trendCount = 0;
    for (const [type, data] of Object.entries(byType)) {
      if (data.length < 3) continue;
      const range = NORMAL_RANGES[type];
      if (!range) continue;

      const sorted = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
      const midpoint = (range.min + range.max) / 2;

      const olderHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
      const newerHalf = sorted.slice(Math.floor(sorted.length / 2));

      const olderAvg = olderHalf.reduce((s, d) => s + d.value, 0) / olderHalf.length;
      const newerAvg = newerHalf.reduce((s, d) => s + d.value, 0) / newerHalf.length;

      const olderDist = Math.abs(olderAvg - midpoint);
      const newerDist = Math.abs(newerAvg - midpoint);

      if (newerDist < olderDist) trendPoints += 1;
      else if (newerDist === olderDist) trendPoints += 0.5;
      trendCount++;
    }
    const trend = trendCount > 0 ? Math.round((trendPoints / trendCount) * 25) : 12;

    // --- 4. Consistency score (0-15) ---
    const uniqueDays = new Set(metrics.map(m => m.measured_at.slice(0, 10)));
    const consistencyRatio = Math.min(uniqueDays.size / Math.min(days, 14), 1);
    const consistency = Math.round(consistencyRatio * 15);

    const score = Math.min(coverage + inRange + trend + consistency, 100);
    const { label, color } = getLabel(score);

    return {
      score,
      breakdown: { coverage, inRange, trend, consistency },
      label,
      color,
      trackedTypes,
      totalTypes,
      metricStatuses,
      untrackedTypes,
    };
  }, [metrics, days]);
};
