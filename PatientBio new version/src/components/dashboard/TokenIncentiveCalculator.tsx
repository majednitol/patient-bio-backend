import { useTranslation } from "react-i18next";
import { useTokenIncentives } from "@/hooks/useTokenIncentives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Coins, TrendingUp, Sparkles, ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";

export const TokenIncentiveCalculator = () => {
  const { t } = useTranslation();
  const { dataCompletenessScore, estimatedMonthlyEarning, currentTier, tierLabel, suggestions } = useTokenIncentives();

  const tierColors = [
    "bg-muted text-muted-foreground",
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg"><Coins className="h-5 w-5 text-primary" /></div>
          <div>
            <CardTitle className="text-lg">{t("walletDetails.earningPotential")}</CardTitle>
            <CardDescription>{t("walletDetails.maximizeEarnings")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">{t("walletDetails.dataCompleteness")}</span>
              <span className="text-sm font-bold">{dataCompletenessScore}%</span>
            </div>
            <Progress value={dataCompletenessScore} className="h-2" />
          </div>
          <Badge className={`${tierColors[currentTier - 1]} shrink-0`}><Star className="h-3 w-3 mr-1" />{tierLabel}</Badge>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <TrendingUp className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">{t("walletDetails.estMonthlyEarning")}</p>
            <p className="font-bold text-lg text-primary">~{estimatedMonthlyEarning} PBIO</p>
          </div>
        </div>
        {suggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Sparkles className="h-4 w-4 text-primary" />{t("walletDetails.earnMore")}</h4>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{s.title}</p><p className="text-xs text-muted-foreground truncate">{s.description}</p></div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge variant="secondary" className="text-xs">+{s.potentialTokens} PBIO</Badge>
                    {s.actionLink && <Link to={s.actionLink}><Button variant="ghost" size="icon" className="h-7 w-7"><ArrowRight className="h-3.5 w-3.5" /></Button></Link>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};