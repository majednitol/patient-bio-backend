import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldAlert, RefreshCw, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PoolStats {
  totalContributors: number;
  diseaseDistribution: Record<string, number>;
  ageDistribution: Record<string, number>;
  genderDistribution: Record<string, number>;
  jurisdictions: string[];
}

interface RiskTier {
  name: string;
  color: string;
  percentage: number;
  count: number;
  criteria: string;
  topConditions: string[];
  recommendation: string;
}

interface StratificationResult {
  tiers: RiskTier[];
  keyInsight: string;
  studyOpportunity: string;
}

const tierColorMap: Record<string, { bg: string; text: string; progress: string }> = {
  red: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-400", progress: "bg-red-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", progress: "bg-amber-500" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", progress: "bg-blue-500" },
  green: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", progress: "bg-emerald-500" },
};

export const RiskStratificationModel = ({ stats }: { stats: PoolStats }) => {
  const [result, setResult] = useState<StratificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runStratification = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-hypothesis-generator", {
        body: { poolStats: stats, mode: "risk_stratification" },
      });
      if (error) throw error;
      setResult(data);
    } catch {
      toast({ title: "Error", description: "Failed to run risk stratification.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Risk Stratification Model
            </CardTitle>
            <CardDescription>AI-categorized risk tiers based on disease, age & medication patterns</CardDescription>
          </div>
          <Button onClick={runStratification} disabled={isLoading || stats.totalContributors === 0} size="sm">
            {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
            {result ? "Refresh" : "Run Stratification"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!result ? (
          <p className="text-sm text-muted-foreground">
            {stats.totalContributors === 0
              ? "No pool data available for risk stratification."
              : "Click \"Run Stratification\" to categorize the pool into risk tiers using AI analysis."}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Tiers */}
            <div className="space-y-3">
              {result.tiers.map((tier) => {
                const colors = tierColorMap[tier.color] || tierColorMap.blue;
                return (
                  <div key={tier.name} className={`rounded-lg p-4 ${colors.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-semibold ${colors.text}`}>{tier.name}</h4>
                        <Badge variant="outline" className="text-xs">{tier.count} contributors</Badge>
                      </div>
                      <span className={`text-lg font-bold ${colors.text}`}>{tier.percentage}%</span>
                    </div>
                    <div className="mb-2">
                      <Progress value={tier.percentage} className="h-2" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      <span className="font-medium">Criteria:</span> {tier.criteria}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {tier.topConditions.map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                      ))}
                    </div>
                    <p className="text-xs italic text-muted-foreground">{tier.recommendation}</p>
                  </div>
                );
              })}
            </div>

            {/* Insights */}
            <div className="border-t pt-3 space-y-2">
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">Key Insight: </span>
                <span>{result.keyInsight}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">Study Opportunity: </span>
                <span>{result.studyOpportunity}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
