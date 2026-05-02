import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Banknote, Lightbulb, BarChart3 } from "lucide-react";
import { useCostForecast } from "@/hooks/useCostForecast";

export function CostForecastCard() {
  const { t } = useTranslation();
  const { data: forecast, isLoading } = useCostForecast();

  const trendConfig = {
    increasing: { icon: TrendingUp, label: t("medications.increasing"), color: "text-destructive" },
    decreasing: { icon: TrendingDown, label: t("medications.decreasing"), color: "text-primary" },
    stable: { icon: Minus, label: t("medications.stable"), color: "text-muted-foreground" },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!forecast) return null;

  const trend = trendConfig[forecast.trend_direction] || trendConfig.stable;
  const TrendIcon = trend.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{t("medications.costForecast")}</CardTitle>
            <CardDescription className="text-xs">{t("medications.aiProjected")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`gap-1 text-xs ${trend.color}`}>
            <TrendIcon className="h-3 w-3" />
            {trend.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{forecast.summary}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {forecast.projected_months.map((m) => (
            <div key={m.month_offset} className="text-center p-2 rounded-lg bg-muted/30">
              <p className="text-[10px] text-muted-foreground">{t("medications.monthOffset", { offset: m.month_offset })}</p>
              <p className="text-sm font-semibold flex items-center justify-center gap-0.5">
                <Banknote className="h-3 w-3" />
                ৳{m.estimated_total.toLocaleString("en-BD")}
              </p>
            </div>
          ))}
        </div>

        {forecast.savings_tip && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 rounded-md p-2">
            <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span>{forecast.savings_tip}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}