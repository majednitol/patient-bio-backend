import { useMemo } from "react";
import { useHealthMetrics, METRIC_TYPES } from "@/hooks/useHealthMetrics";
import { usePatientWallet, TokenPricing } from "@/hooks/usePatientWallet";

export interface EarnMoreSuggestion {
  title: string;
  description: string;
  potentialTokens: number;
  actionLink?: string;
}

export interface TokenIncentiveResult {
  dataCompletenessScore: number;       // 0-100
  estimatedMonthlyEarning: number;     // tokens
  currentTier: number;                 // 1-3
  tierLabel: string;
  suggestions: EarnMoreSuggestion[];
  pricingGrid: TokenPricing[];
  trackedMetricTypes: string[];
  untrackedMetricTypes: string[];
}

export const useTokenIncentives = (): TokenIncentiveResult => {
  const { metrics } = useHealthMetrics(undefined, 30);
  const { pricing, transactions } = usePatientWallet();

  return useMemo(() => {
    // Tracked vs untracked metric types
    const trackedSet = new Set(metrics.map(m => m.metric_type));
    const trackedMetricTypes = METRIC_TYPES.filter(m => trackedSet.has(m.type)).map(m => m.type);
    const untrackedMetricTypes = METRIC_TYPES.filter(m => !trackedSet.has(m.type)).map(m => m.type);

    // Data completeness: coverage (50%) + frequency (30%) + recency (20%)
    const coverageScore = (trackedMetricTypes.length / METRIC_TYPES.length) * 50;

    // Frequency: average readings per tracked type
    const avgReadings = trackedMetricTypes.length > 0
      ? metrics.length / trackedMetricTypes.length
      : 0;
    const frequencyScore = Math.min(avgReadings / 10, 1) * 30; // 10+ readings = max

    // Recency: most recent reading within last 3 days = full marks
    const now = Date.now();
    const mostRecentMs = metrics.length > 0
      ? Math.max(...metrics.map(m => new Date(m.measured_at).getTime()))
      : 0;
    const daysSinceLastReading = mostRecentMs > 0 ? (now - mostRecentMs) / (1000 * 60 * 60 * 24) : 999;
    const recencyScore = daysSinceLastReading <= 3 ? 20 : daysSinceLastReading <= 7 ? 12 : daysSinceLastReading <= 14 ? 5 : 0;

    const dataCompletenessScore = Math.round(coverageScore + frequencyScore + recencyScore);

    // Tier: 1 (basic), 2 (good), 3 (premium)
    const currentTier = dataCompletenessScore >= 70 ? 3 : dataCompletenessScore >= 40 ? 2 : 1;
    const tierLabels = ["Basic", "Standard", "Premium"];
    const tierMultipliers = [1, 1.5, 3];

    // Estimated monthly earning based on avg base price * tier multiplier * projected shares
    const avgBasePrice = pricing.length > 0
      ? pricing.reduce((s, p) => s + Number(p.base_price_tokens), 0) / pricing.length
      : 10;
    const monthlyShareEstimate = Math.max(transactions.filter(t => {
      const d = new Date(t.created_at);
      const now2 = new Date();
      return d.getMonth() === now2.getMonth() && d.getFullYear() === now2.getFullYear();
    }).length, 1); // At least 1 projected share
    const estimatedMonthlyEarning = Math.round(avgBasePrice * tierMultipliers[currentTier - 1] * monthlyShareEstimate);

    // Generate suggestions
    const suggestions: EarnMoreSuggestion[] = [];

    if (untrackedMetricTypes.length > 0) {
      const topUntracked = METRIC_TYPES.find(m => m.type === untrackedMetricTypes[0]);
      if (topUntracked) {
        suggestions.push({
          title: `Track ${topUntracked.label}`,
          description: `Start tracking ${topUntracked.label.toLowerCase()} to increase your data completeness score`,
          potentialTokens: Math.round(avgBasePrice * 0.3),
          actionLink: "/dashboard/health-trends",
        });
      }
    }

    if (daysSinceLastReading > 3) {
      suggestions.push({
        title: "Log today's readings",
        description: "Recent data earns higher tier rewards. Log at least one metric today.",
        potentialTokens: Math.round(avgBasePrice * 0.2),
        actionLink: "/dashboard/health-trends",
      });
    }

    if (currentTier < 3) {
      suggestions.push({
        title: `Reach ${tierLabels[currentTier]} Tier`,
        description: `Track ${Math.ceil((currentTier === 1 ? 40 : 70) / 50 * METRIC_TYPES.length) - trackedMetricTypes.length} more metric types to unlock ${tierMultipliers[currentTier]}x earning multiplier`,
        potentialTokens: Math.round(avgBasePrice * (tierMultipliers[currentTier] - tierMultipliers[currentTier - 1])),
      });
    }

    if (trackedMetricTypes.length >= 3 && avgReadings < 5) {
      suggestions.push({
        title: "Increase tracking frequency",
        description: "More frequent readings increase your data value for researchers",
        potentialTokens: Math.round(avgBasePrice * 0.5),
        actionLink: "/dashboard/health-trends",
      });
    }

    return {
      dataCompletenessScore,
      estimatedMonthlyEarning,
      currentTier,
      tierLabel: tierLabels[currentTier - 1],
      suggestions: suggestions.slice(0, 3),
      pricingGrid: pricing,
      trackedMetricTypes,
      untrackedMetricTypes,
    };
  }, [metrics, pricing, transactions]);
};
