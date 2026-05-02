/**
 * usePatientRiskFlags - Analyze patient vitals history for concerning trends
 * Detects: Rising BP, low SpO2, tachycardia, fever, significant weight changes
 */
import { useMemo } from 'react';
import { PatientVitals } from '@/hooks/usePatientVitals';

export type RiskLevel = 'critical' | 'warning' | 'info';

export interface RiskFlag {
  id: string;
  level: RiskLevel;
  label: string;
  detail: string;
  metric: string;
}

interface RiskAnalysisResult {
  flags: RiskFlag[];
  highestLevel: RiskLevel | null;
  hasCritical: boolean;
  hasWarning: boolean;
}

// Normal ranges for vitals
const THRESHOLDS = {
  bp_systolic: { warning: 140, critical: 160 },
  bp_diastolic: { warning: 90, critical: 100 },
  heart_rate_high: { warning: 100, critical: 120 },
  heart_rate_low: { warning: 55, critical: 45 },
  spo2: { warning: 94, critical: 90 },
  temperature: { warning: 38.0, critical: 39.0 },
  weight_change_pct: { warning: 5, critical: 10 }, // % change over visits
};

function analyzeVitals(vitals: PatientVitals[]): RiskFlag[] {
  if (!vitals.length) return [];

  const flags: RiskFlag[] = [];
  const latest = vitals[0]; // most recent (already sorted desc)

  // --- Single-reading alerts on latest vitals ---

  if (latest.bp_systolic && latest.bp_systolic >= THRESHOLDS.bp_systolic.critical) {
    flags.push({
      id: 'bp-sys-critical',
      level: 'critical',
      label: 'High BP',
      detail: `Systolic ${latest.bp_systolic} mmHg (≥${THRESHOLDS.bp_systolic.critical})`,
      metric: 'bp_systolic',
    });
  } else if (latest.bp_systolic && latest.bp_systolic >= THRESHOLDS.bp_systolic.warning) {
    flags.push({
      id: 'bp-sys-warning',
      level: 'warning',
      label: 'Elevated BP',
      detail: `Systolic ${latest.bp_systolic} mmHg (≥${THRESHOLDS.bp_systolic.warning})`,
      metric: 'bp_systolic',
    });
  }

  if (latest.bp_diastolic && latest.bp_diastolic >= THRESHOLDS.bp_diastolic.critical) {
    flags.push({
      id: 'bp-dia-critical',
      level: 'critical',
      label: 'High Diastolic',
      detail: `Diastolic ${latest.bp_diastolic} mmHg (≥${THRESHOLDS.bp_diastolic.critical})`,
      metric: 'bp_diastolic',
    });
  }

  if (latest.spo2 != null && latest.spo2 <= THRESHOLDS.spo2.critical) {
    flags.push({
      id: 'spo2-critical',
      level: 'critical',
      label: 'Low SpO2',
      detail: `SpO2 ${latest.spo2}% (≤${THRESHOLDS.spo2.critical}%)`,
      metric: 'spo2',
    });
  } else if (latest.spo2 != null && latest.spo2 <= THRESHOLDS.spo2.warning) {
    flags.push({
      id: 'spo2-warning',
      level: 'warning',
      label: 'Low SpO2',
      detail: `SpO2 ${latest.spo2}% (≤${THRESHOLDS.spo2.warning}%)`,
      metric: 'spo2',
    });
  }

  if (latest.heart_rate && latest.heart_rate >= THRESHOLDS.heart_rate_high.critical) {
    flags.push({
      id: 'hr-high-critical',
      level: 'critical',
      label: 'Tachycardia',
      detail: `Heart rate ${latest.heart_rate} bpm (≥${THRESHOLDS.heart_rate_high.critical})`,
      metric: 'heart_rate',
    });
  } else if (latest.heart_rate && latest.heart_rate >= THRESHOLDS.heart_rate_high.warning) {
    flags.push({
      id: 'hr-high-warning',
      level: 'warning',
      label: 'Elevated HR',
      detail: `Heart rate ${latest.heart_rate} bpm (≥${THRESHOLDS.heart_rate_high.warning})`,
      metric: 'heart_rate',
    });
  }

  if (latest.heart_rate && latest.heart_rate <= THRESHOLDS.heart_rate_low.critical) {
    flags.push({
      id: 'hr-low-critical',
      level: 'critical',
      label: 'Bradycardia',
      detail: `Heart rate ${latest.heart_rate} bpm (≤${THRESHOLDS.heart_rate_low.critical})`,
      metric: 'heart_rate',
    });
  }

  if (latest.temperature && latest.temperature >= THRESHOLDS.temperature.critical) {
    flags.push({
      id: 'temp-critical',
      level: 'critical',
      label: 'High Fever',
      detail: `Temperature ${latest.temperature}°C (≥${THRESHOLDS.temperature.critical}°C)`,
      metric: 'temperature',
    });
  } else if (latest.temperature && latest.temperature >= THRESHOLDS.temperature.warning) {
    flags.push({
      id: 'temp-warning',
      level: 'warning',
      label: 'Fever',
      detail: `Temperature ${latest.temperature}°C (≥${THRESHOLDS.temperature.warning}°C)`,
      metric: 'temperature',
    });
  }

  // --- Trend analysis (requires 3+ readings) ---

  if (vitals.length >= 3) {
    // Rising BP trend: check if systolic increased across last 3 readings
    const bpReadings = vitals
      .slice(0, 5)
      .filter((v) => v.bp_systolic != null)
      .map((v) => v.bp_systolic!);

    if (bpReadings.length >= 3) {
      const isRising = bpReadings[0] > bpReadings[1] && bpReadings[1] > bpReadings[2];
      if (isRising && bpReadings[0] >= 130) {
        flags.push({
          id: 'bp-trend-rising',
          level: 'warning',
          label: 'BP Rising',
          detail: `Systolic trending up: ${bpReadings.slice(0, 3).reverse().join(' → ')} mmHg`,
          metric: 'bp_systolic',
        });
      }
    }

    // Weight change trend
    const weightReadings = vitals
      .filter((v) => v.weight != null)
      .map((v) => v.weight!);

    if (weightReadings.length >= 2) {
      const oldest = weightReadings[weightReadings.length - 1];
      const newest = weightReadings[0];
      const changePct = Math.abs(((newest - oldest) / oldest) * 100);

      if (changePct >= THRESHOLDS.weight_change_pct.critical) {
        flags.push({
          id: 'weight-change-critical',
          level: 'warning',
          label: newest > oldest ? 'Weight Gain' : 'Weight Loss',
          detail: `${changePct.toFixed(1)}% change (${oldest}→${newest} kg) over ${weightReadings.length} readings`,
          metric: 'weight',
        });
      } else if (changePct >= THRESHOLDS.weight_change_pct.warning) {
        flags.push({
          id: 'weight-change-warning',
          level: 'info',
          label: newest > oldest ? 'Weight Gain' : 'Weight Loss',
          detail: `${changePct.toFixed(1)}% change (${oldest}→${newest} kg)`,
          metric: 'weight',
        });
      }
    }
  }

  return flags;
}

/**
 * Analyze a patient's vitals history and return risk flags.
 * Pass in the vitals array (from usePatientVitalsHistory).
 */
export function usePatientRiskFlags(vitals: PatientVitals[] | undefined): RiskAnalysisResult {
  return useMemo(() => {
    if (!vitals || vitals.length === 0) {
      return { flags: [], highestLevel: null, hasCritical: false, hasWarning: false };
    }

    const flags = analyzeVitals(vitals);
    const hasCritical = flags.some((f) => f.level === 'critical');
    const hasWarning = flags.some((f) => f.level === 'warning');
    const highestLevel: RiskLevel | null = hasCritical ? 'critical' : hasWarning ? 'warning' : flags.length > 0 ? 'info' : null;

    return { flags, highestLevel, hasCritical, hasWarning };
  }, [vitals]);
}
