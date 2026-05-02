import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { STALE_TIMES } from "@/lib/queryConfig";

interface Props {
  hasActiveContributions: boolean;
}

export function ContributionAISummary({ hasActiveContributions }: Props) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["contribution-ai-summary", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("smart-recontribution-check");
      if (error) throw error;
      return data as {
        has_changes: boolean;
        summary: string | null;
        new_prescriptions?: number;
        new_health_records?: number;
        new_diseases?: string[];
        estimated_impact_delta?: number;
      };
    },
    enabled: !!user && hasActiveContributions,
    staleTime: STALE_TIMES.EXPENSIVE,
  });

  if (!hasActiveContributions) return null;

  const summary = data?.summary;
  const fallback = hasActiveContributions
    ? "Your anonymized data is helping researchers worldwide discover new treatments and patterns. Every contribution advances medical science."
    : null;

  const displayText = summary || fallback;
  if (!displayText && !isLoading) return null;

  return (
    <Card className="border-accent/30 bg-gradient-to-r from-accent/5 via-primary/5 to-transparent">
      <CardContent className="py-3 sm:py-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-accent/10 shrink-0">
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-accent animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-accent" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-accent mb-1">What Your Data Enables</p>
            {isLoading ? (
              <p className="text-xs sm:text-sm text-muted-foreground">Analyzing your contribution impact…</p>
            ) : (
              <p className="text-xs sm:text-sm text-foreground leading-relaxed">{displayText}</p>
            )}
            {data?.has_changes && data.estimated_impact_delta && (
              <p className="text-[10px] sm:text-xs text-primary mt-1.5">
                💡 Updating your contribution could boost your impact score by +{data.estimated_impact_delta} points
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
