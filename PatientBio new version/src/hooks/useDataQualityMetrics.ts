import { useMemo } from "react";
import { usePatientResearcherShares } from "@/hooks/usePatientResearcherShares";
import { format, subDays } from "date-fns";

export interface DataQualityFilters {
  disease?: string;
  timeRange?: "30d" | "90d" | "1y" | "all";
  tier?: "Excellent" | "Good" | "Fair" | "Poor";
}

export interface DataQualityMetrics {
  overallScore: number;
  totalShares: number;
  completenessRate: number;
  anonymizationRate: number;
  averageAgeDays: number;
  qualityDistribution: { label: string; count: number }[];
  lowestQualityShares: { id: string; patient_id: string; disease_category: string; score: number; created_at: string }[];
  freshShares: number;
  staleShares: number;
  diseaseBreakdown: { category: string; avgScore: number; count: number }[];
  qualityTrend: { month: string; avgScore: number; count: number }[];
  dimensionScores: { dimension: string; score: number }[];
  availableCategories: string[];
}

interface DimensionScores {
  diseaseCategory: number;
  status: number;
  anonymization: number;
  freshness: number;
  base: number;
}

function computeShareQuality(share: any): { total: number; dimensions: DimensionScores } {
  const dimensions: DimensionScores = { diseaseCategory: 0, status: 0, anonymization: 0, freshness: 0, base: 15 };
  if (share.disease_category) dimensions.diseaseCategory = 25;
  if (share.status === "completed") dimensions.status = 25;
  if (share.is_anonymized !== undefined) dimensions.anonymization = 15;
  const daysSince = (Date.now() - new Date(share.shared_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 30) dimensions.freshness = 20;
  else if (daysSince < 90) dimensions.freshness = 10;
  const total = Math.min(dimensions.diseaseCategory + dimensions.status + dimensions.anonymization + dimensions.freshness + dimensions.base, 100);
  return { total, dimensions };
}

function getTier(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

function getTimeRangeCutoff(range?: string): Date | null {
  if (!range || range === "all") return null;
  const days = range === "30d" ? 30 : range === "90d" ? 90 : 365;
  return subDays(new Date(), days);
}

export const useDataQualityMetrics = (filters?: DataQualityFilters): DataQualityMetrics & { isLoading: boolean } => {
  const { researcherShares, isLoading } = usePatientResearcherShares();

  const metrics = useMemo<DataQualityMetrics>(() => {
    const empty: DataQualityMetrics = {
      overallScore: 0, totalShares: 0, completenessRate: 0, anonymizationRate: 0,
      averageAgeDays: 0, qualityDistribution: [], lowestQualityShares: [], freshShares: 0, staleShares: 0,
      diseaseBreakdown: [], qualityTrend: [], dimensionScores: [], availableCategories: [],
    };
    if (researcherShares.length === 0) return empty;

    // Compute all categories before filtering
    const availableCategories = [...new Set(researcherShares.map(s => s.disease_category || "General"))].sort();

    // Score all shares
    const allScored = researcherShares.map(s => ({ ...s, ...computeShareQuality(s), tier: "" }));
    allScored.forEach(s => { s.tier = getTier(s.total); });

    // Apply filters
    const cutoff = getTimeRangeCutoff(filters?.timeRange);
    let filtered = allScored;
    if (filters?.disease) filtered = filtered.filter(s => (s.disease_category || "General") === filters.disease);
    if (cutoff) filtered = filtered.filter(s => new Date(s.shared_at) >= cutoff);
    if (filters?.tier) filtered = filtered.filter(s => s.tier === filters.tier);

    if (filtered.length === 0) return { ...empty, availableCategories };

    const overallScore = Math.round(filtered.reduce((a, s) => a + s.total, 0) / filtered.length);
    const completenessRate = Math.round((filtered.filter(s => s.disease_category && s.status === "completed").length / filtered.length) * 100);
    const anonymizationRate = Math.round((filtered.filter(s => s.is_anonymized).length / filtered.length) * 100);

    const now = Date.now();
    const ages = filtered.map(s => (now - new Date(s.shared_at).getTime()) / (1000 * 60 * 60 * 24));
    const averageAgeDays = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
    const freshShares = ages.filter(a => a < 30).length;
    const staleShares = ages.filter(a => a > 90).length;

    const buckets = { Excellent: 0, Good: 0, Fair: 0, Poor: 0 };
    filtered.forEach(s => { buckets[s.tier as keyof typeof buckets]++; });

    // Disease breakdown
    const diseaseMap = new Map<string, { totalScore: number; count: number }>();
    filtered.forEach(s => {
      const cat = s.disease_category || "General";
      const entry = diseaseMap.get(cat) || { totalScore: 0, count: 0 };
      entry.totalScore += s.total;
      entry.count++;
      diseaseMap.set(cat, entry);
    });
    const diseaseBreakdown = [...diseaseMap.entries()]
      .map(([category, v]) => ({ category, avgScore: Math.round(v.totalScore / v.count), count: v.count }))
      .sort((a, b) => b.count - a.count);

    // Quality trend by month
    const monthMap = new Map<string, { totalScore: number; count: number }>();
    filtered.forEach(s => {
      const month = format(new Date(s.shared_at), "yyyy-MM");
      const entry = monthMap.get(month) || { totalScore: 0, count: 0 };
      entry.totalScore += s.total;
      entry.count++;
      monthMap.set(month, entry);
    });
    const qualityTrend = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month: format(new Date(month + "-01"), "MMM yyyy"), avgScore: Math.round(v.totalScore / v.count), count: v.count }));

    // Dimension scores (averaged)
    const dimTotals = { diseaseCategory: 0, status: 0, anonymization: 0, freshness: 0, base: 0 };
    filtered.forEach(s => {
      dimTotals.diseaseCategory += s.dimensions.diseaseCategory;
      dimTotals.status += s.dimensions.status;
      dimTotals.anonymization += s.dimensions.anonymization;
      dimTotals.freshness += s.dimensions.freshness;
      dimTotals.base += s.dimensions.base;
    });
    const n = filtered.length;
    const maxScores = { diseaseCategory: 25, status: 25, anonymization: 15, freshness: 20, base: 15 };
    const dimensionScores = [
      { dimension: "Disease Info", score: Math.round((dimTotals.diseaseCategory / n / maxScores.diseaseCategory) * 100) },
      { dimension: "Completion", score: Math.round((dimTotals.status / n / maxScores.status) * 100) },
      { dimension: "Anonymization", score: Math.round((dimTotals.anonymization / n / maxScores.anonymization) * 100) },
      { dimension: "Freshness", score: Math.round((dimTotals.freshness / n / maxScores.freshness) * 100) },
      { dimension: "Base", score: Math.round((dimTotals.base / n / maxScores.base) * 100) },
    ];

    return {
      overallScore, totalShares: filtered.length, completenessRate, anonymizationRate,
      averageAgeDays, freshShares, staleShares, availableCategories,
      qualityDistribution: Object.entries(buckets).map(([label, count]) => ({ label, count })),
      lowestQualityShares: [...filtered].sort((a, b) => a.total - b.total).slice(0, 5).map(s => ({
        id: s.id, patient_id: s.patient_id, disease_category: s.disease_category || "General",
        score: s.total, created_at: s.shared_at,
      })),
      diseaseBreakdown, qualityTrend, dimensionScores,
    };
  }, [researcherShares, filters?.disease, filters?.timeRange, filters?.tier]);

  return { ...metrics, isLoading };
};
