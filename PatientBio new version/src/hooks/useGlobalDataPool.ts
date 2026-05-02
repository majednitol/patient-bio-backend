import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { differenceInDays, startOfMonth, subMonths } from "date-fns";

interface PoolEntry {
  id: string;
  contribution_hash: string;
  anonymized_data: Record<string, unknown>;
  data_categories: string[];
  disease_categories: string[];
  age_range: string | null;
  gender: string | null;
  source_jurisdiction: string;
  govt_approval_status: string;
  contributed_at: string;
  quality_score: number | null;
}

interface PoolFilters {
  diseaseCategory?: string;
  ageRange?: string;
  gender?: string;
  jurisdiction?: string;
  dataCategory?: string;
}

const ALL_DATA_CATEGORIES = ['prescriptions', 'diagnoses', 'vitals', 'lab_results', 'allergies', 'demographics'];

export const useGlobalDataPool = () => {
  const [filters, setFilters] = useState<PoolFilters>({});

  const { data: poolData = [], isLoading } = useQuery({
    queryKey: ['global-data-pool', filters],
    queryFn: async () => {
      let query = supabase
        .from('anonymous_pool_view' as 'anonymous_health_contributions')
        .select('*');

      if (filters.diseaseCategory) {
        query = query.contains('disease_categories', [filters.diseaseCategory]);
      }
      if (filters.ageRange) {
        query = query.eq('age_range', filters.ageRange);
      }
      if (filters.gender) {
        query = query.eq('gender', filters.gender);
      }
      if (filters.jurisdiction) {
        query = query.eq('source_jurisdiction', filters.jurisdiction as any);
      }
      if (filters.dataCategory) {
        query = query.contains('data_categories', [filters.dataCategory]);
      }

      const { data, error } = await query.order('contributed_at', { ascending: false }).limit(500);
      if (error) throw error;
      return (data || []) as unknown as PoolEntry[];
    },
  });

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  // Growth stats
  const thisMonth = poolData.filter(d => new Date(d.contributed_at) >= thisMonthStart).length;
  const lastMonth = poolData.filter(d => {
    const dt = new Date(d.contributed_at);
    return dt >= lastMonthStart && dt < thisMonthStart;
  }).length;
  const growthRate = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : thisMonth > 0 ? 100 : 0;

  // Freshness
  const ageDays = poolData.map(d => differenceInDays(now, new Date(d.contributed_at))).sort((a, b) => a - b);
  const medianAgeDays = ageDays.length > 0 ? ageDays[Math.floor(ageDays.length / 2)] : 0;
  const newestContribution = poolData.length > 0 ? poolData[0].contributed_at : '';
  const oldestContribution = poolData.length > 0 ? poolData[poolData.length - 1].contributed_at : '';

  // Data category completeness
  const dataCategoryCompleteness: Record<string, number> = {};
  const total = poolData.length || 1;
  ALL_DATA_CATEGORIES.forEach(cat => {
    const count = poolData.filter(d => d.data_categories.includes(cat)).length;
    dataCategoryCompleteness[cat] = Math.round((count / total) * 100);
  });

  // Compute aggregate stats
  const stats = {
    totalContributors: poolData.length,
    diseaseCategories: [...new Set(poolData.flatMap(d => d.disease_categories))],
    jurisdictions: [...new Set(poolData.map(d => d.source_jurisdiction))],
    genderDistribution: poolData.reduce((acc, d) => {
      const g = d.gender || 'unknown';
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    ageDistribution: poolData.reduce((acc, d) => {
      const a = d.age_range || 'unknown';
      acc[a] = (acc[a] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    diseaseDistribution: poolData.reduce((acc, d) => {
      d.disease_categories.forEach(dc => {
        acc[dc] = (acc[dc] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>),
    growthStats: { thisMonth, lastMonth, growthRate },
    freshness: { medianAgeDays, newestContribution, oldestContribution },
    dataCategoryCompleteness,
  };

  return {
    poolData,
    isLoading,
    filters,
    setFilters,
    stats,
  };
};
