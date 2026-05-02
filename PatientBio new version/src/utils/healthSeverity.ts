/**
 * Shared severity thresholds, color utilities, and actionable recommendations
 * for the System Health dashboard.
 */

export type Severity = "healthy" | "warning" | "error";

export interface HealthWarning {
  source: string;
  message: string;
  severity: Severity;
  recommendation: string;
}

// ── Threshold helpers ──────────────────────────────────────────────

export function latencySeverity(avgMs: number): Severity {
  if (avgMs <= 0) return "healthy";
  if (avgMs < 300) return "healthy";
  if (avgMs < 500) return "warning";
  return "error";
}

export function integritySeverity(percentage: number): Severity {
  if (percentage >= 99) return "healthy";
  if (percentage >= 90) return "warning";
  return "error";
}

export function crossChainSeverity(percentage: number): Severity {
  if (percentage >= 95) return "healthy";
  if (percentage >= 80) return "warning";
  return "error";
}

export function errorRateSeverity(rate: number): Severity {
  if (rate < 5) return "healthy";
  if (rate < 15) return "warning";
  return "error";
}

export function storageSeverity(usedPercent: number): Severity {
  if (usedPercent < 80) return "healthy";
  if (usedPercent < 95) return "warning";
  return "error";
}

// ── Color classes ──────────────────────────────────────────────────

export function severityDotClass(s: Severity): string {
  switch (s) {
    case "healthy": return "bg-emerald-500";
    case "warning": return "bg-amber-500";
    case "error": return "bg-destructive";
  }
}

export function severityTextClass(s: Severity): string {
  switch (s) {
    case "healthy": return "text-emerald-600 dark:text-emerald-400";
    case "warning": return "text-amber-600 dark:text-amber-400";
    case "error": return "text-destructive";
  }
}

export function severityBadgeClass(s: Severity): string {
  switch (s) {
    case "healthy": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    case "warning": return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20";
    case "error": return "bg-destructive/15 text-destructive border-destructive/20";
  }
}

export function severityGaugeStroke(s: Severity): string {
  switch (s) {
    case "healthy": return "hsl(var(--primary))";
    case "warning": return "hsl(45 93% 47%)";
    case "error": return "hsl(var(--destructive))";
  }
}

// ── Recommendations ────────────────────────────────────────────────

export const RECOMMENDATIONS: Record<string, string> = {
  apiLatency: "Consider optimizing queries or adding indexes",
  errorRate: "Review recent appointment patterns and cancellation reasons",
  blockchainIntegrity: "Run chain repair from the Blockchain Integrity card",
  auditTrailIntegrity: "Click Repair Chain to fix hash inconsistencies",
  crossChainConsistency: "Check for missing blockchain entries",
  storageUsage: "Archive old files or increase storage quota",
};
