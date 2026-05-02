import { useTranslation } from "react-i18next";
import {
  Sparkles, TrendingUp, AlertTriangle, CheckCircle, Info, Loader2, X,
  RefreshCw, Apple, Dumbbell, Pill, ShieldAlert, Heart, Brain,
  Thermometer, Droplets, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHealthInsights } from "@/hooks/useHealthInsights";
import { PredictiveAlertsBanner } from "@/components/dashboard/PredictiveAlertsBanner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

/** Map insight_type or keywords in content to a category for richer display */
function categorizeInsight(insight: { insight_type: string; title: string; content: string; severity: string | null; metric_types: string[] | null }) {
  const text = `${insight.title} ${insight.content}`.toLowerCase();

  if (text.match(/diet|nutrition|food|eat|calorie|vitamin|hydrat|water/))
    return "diet" as const;
  if (text.match(/exercise|activity|step|walk|run|workout|physical/))
    return "exercise" as const;
  if (text.match(/medic|drug|prescription|dose|pill|pharma/))
    return "medication" as const;
  if (insight.severity === "critical" || insight.severity === "warning" || text.match(/risk|danger|critical|alert|abnormal|spike|drop/))
    return "risk" as const;
  if (text.match(/heart|cardio|bp|blood pressure|pulse/))
    return "cardiac" as const;
  if (text.match(/mental|stress|sleep|anxiety|mood/))
    return "wellness" as const;
  return "general" as const;
}

type InsightCategory = ReturnType<typeof categorizeInsight>;

const CATEGORY_CONFIG: Record<InsightCategory, {
  icon: React.ElementType;
  label: string;
  gradient: string;
  iconBg: string;
  border: string;
  badge: string;
}> = {
  diet: {
    icon: Apple,
    label: "Diet & Nutrition",
    gradient: "from-emerald-500/10 to-transparent",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800/50",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  exercise: {
    icon: Dumbbell,
    label: "Exercise & Activity",
    gradient: "from-blue-500/10 to-transparent",
    iconBg: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800/50",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  medication: {
    icon: Pill,
    label: "Medication",
    gradient: "from-violet-500/10 to-transparent",
    iconBg: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800/50",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  },
  risk: {
    icon: ShieldAlert,
    label: "Risk Alert",
    gradient: "from-red-500/10 to-transparent",
    iconBg: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800/50",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
  cardiac: {
    icon: Heart,
    label: "Cardiac Health",
    gradient: "from-rose-500/10 to-transparent",
    iconBg: "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800/50",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
  },
  wellness: {
    icon: Brain,
    label: "Mental Wellness",
    gradient: "from-amber-500/10 to-transparent",
    iconBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800/50",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  general: {
    icon: Sparkles,
    label: "General",
    gradient: "from-primary/10 to-transparent",
    iconBg: "bg-primary/10 text-primary",
    border: "border-border",
    badge: "bg-primary/10 text-primary",
  },
};

const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; dot: string; label: string }> = {
  critical: { icon: AlertTriangle, dot: "bg-red-500", label: "Critical" },
  warning: { icon: AlertTriangle, dot: "bg-amber-500", label: "Warning" },
  positive: { icon: CheckCircle, dot: "bg-emerald-500", label: "Good" },
  info: { icon: Info, dot: "bg-blue-500", label: "Info" },
};

export const HealthInsightsCard = () => {
  const { t } = useTranslation();
  const {
    insights,
    isLoading,
    generateInsights,
    isGenerating,
    markAsRead,
    deleteInsight,
    unreadCount,
    hasMetrics,
  } = useHealthInsights();

  return (
    <div className="space-y-4">
      <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <CardHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                {t("healthInsights.title")}
                {unreadCount > 0 && (
                  <Badge variant="default" className="text-xs">
                    {t("healthInsights.newCount", { count: unreadCount })}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t("healthInsights.description")}
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => generateInsights.mutate()}
            disabled={isGenerating || !hasMetrics}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {t("healthInsights.generateInsights")}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !hasMetrics ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>{t("healthInsights.noMetricsTitle")}</p>
              <p className="text-sm">{t("healthInsights.noMetricsDesc")}</p>
            </div>
          ) : insights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>{t("healthInsights.noInsightsTitle")}</p>
              <p className="text-sm">{t("healthInsights.noInsightsDesc")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight) => {
                const category = categorizeInsight(insight);
                const catConfig = CATEGORY_CONFIG[category];
                const sevConfig = SEVERITY_CONFIG[insight.severity || "info"] || SEVERITY_CONFIG.info;
                const CategoryIcon = catConfig.icon;
                const SeverityIcon = sevConfig.icon;

                return (
                  <div
                    key={insight.id}
                    className={cn(
                      "group relative rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer",
                      catConfig.border,
                      !insight.is_read && "ring-2 ring-primary/20"
                    )}
                    onClick={() => !insight.is_read && markAsRead.mutate(insight.id)}
                  >
                    {/* Category gradient strip */}
                    <div className={cn("absolute inset-0 bg-gradient-to-r pointer-events-none", catConfig.gradient)} />

                    <div className="relative p-4">
                      {/* Top row: category icon + severity + dismiss */}
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg shrink-0", catConfig.iconBg)}>
                          <CategoryIcon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Title row */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-semibold text-sm leading-tight">{insight.title}</h4>
                            {!insight.is_read && (
                              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                            )}
                          </div>

                          {/* Badges row */}
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            <Badge className={cn("text-[10px] px-1.5 py-0 font-medium border-0", catConfig.badge)}>
                              {catConfig.label}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                              <span className={cn("w-1.5 h-1.5 rounded-full", sevConfig.dot)} />
                              {sevConfig.label}
                            </Badge>
                          </div>

                          {/* Content */}
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {insight.content}
                          </p>

                          {/* Metric tags */}
                          {insight.metric_types && insight.metric_types.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {insight.metric_types.map((type) => (
                                <Badge key={type} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {type.replace(/_/g, " ")}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Footer: timestamp */}
                          <p className="text-[11px] text-muted-foreground/60 mt-2">
                            {t("healthInsights.generated", {
                              time: formatDistanceToNow(new Date(insight.generated_at), { addSuffix: true }),
                            })}
                          </p>
                        </div>

                        {/* Dismiss button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteInsight.mutate(insight.id);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Predictive Alerts Section */}
      {hasMetrics && <PredictiveAlertsBanner />}
    </div>
  );
};
