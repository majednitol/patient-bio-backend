import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Plus, Sparkles } from "lucide-react";
import { STALE_TIMES } from "@/lib/queryConfig";

const ALL_DATA_CATEGORIES = [
  "prescriptions", "diagnoses", "vitals", "lab_results",
  "allergies", "demographics", "clinical_records",
];

const CATEGORY_LABELS: Record<string, string> = {
  prescriptions: "Prescriptions",
  diagnoses: "Diagnoses",
  vitals: "Vitals",
  lab_results: "Lab Results",
  allergies: "Allergies",
  demographics: "Demographics",
  clinical_records: "Clinical Records",
};

// Static fallback demand ranking when no access log data
const STATIC_DEMAND = ["lab_results", "diagnoses", "vitals", "clinical_records", "prescriptions"];

interface Props {
  selectedCategories: string[];
  onAddCategory: (key: string) => void;
}

export function ResearchDemandInsights({ selectedCategories, onAddCategory }: Props) {
  const { user } = useAuth();

  const { data: demandData } = useQuery({
    queryKey: ["research-demand-insights", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribution_access_log")
        .select("contribution_id, query_context");
      if (error) throw error;

      // Count how often each category appears in query_context
      const categoryCounts: Record<string, number> = {};
      (data || []).forEach(row => {
        const ctx = row.query_context || "";
        ALL_DATA_CATEGORIES.forEach(cat => {
          if (ctx.toLowerCase().includes(cat.replace("_", " ")) || ctx.toLowerCase().includes(cat)) {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          }
        });
      });

      return categoryCounts;
    },
    enabled: !!user,
    staleTime: STALE_TIMES.ANALYTICS,
  });

  // Determine unshared categories sorted by demand
  const hasLogData = demandData && Object.keys(demandData).length > 0;
  const rankedCategories = hasLogData
    ? ALL_DATA_CATEGORIES.sort((a, b) => (demandData[b] || 0) - (demandData[a] || 0))
    : STATIC_DEMAND;

  const unshared = rankedCategories.filter(c => !selectedCategories.includes(c));
  const recommendations = unshared.slice(0, 3);

  if (recommendations.length === 0) return null;

  const impactBoost = Math.min(recommendations.length * 12, 30);

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Boost Your Research Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {hasLogData ? "Most requested by researchers" : "Recommended for maximum impact"} — adding these could boost your impact by ~{impactBoost}%
        </p>
        <div className="flex flex-wrap gap-2">
          {recommendations.map(cat => (
            <Button
              key={cat}
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 border-primary/30 hover:bg-primary/10"
              onClick={() => onAddCategory(cat)}
            >
              <Plus className="h-3 w-3" />
              {CATEGORY_LABELS[cat] || cat}
              {hasLogData && demandData[cat] && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
                  <Sparkles className="h-2 w-2 mr-0.5" />
                  {demandData[cat]} queries
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
