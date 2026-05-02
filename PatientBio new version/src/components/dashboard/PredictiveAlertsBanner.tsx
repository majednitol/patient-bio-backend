import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePredictiveAlerts, type PredictiveAlert } from "@/hooks/usePredictiveAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, TrendingUp, TrendingDown, Loader2, RefreshCw, Clock,
  Shield, ChevronDown, ChevronUp, Lightbulb, Activity, Heart,
  Droplets, Thermometer, Weight, X, Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const METRIC_ICON_MAP: Record<string, React.ElementType> = {
  blood_pressure_systolic: Heart,
  blood_pressure_diastolic: Heart,
  heart_rate: Activity,
  blood_sugar: Droplets,
  oxygen_saturation: Droplets,
  temperature: Thermometer,
  weight: Weight,
};

const SEVERITY_CONFIG = {
  critical: {
    border: "border-red-300 dark:border-red-800/60",
    bg: "bg-gradient-to-r from-red-50 to-red-50/30 dark:from-red-950/30 dark:to-red-950/10",
    iconBg: "bg-red-100 dark:bg-red-900/50",
    iconColor: "text-red-600 dark:text-red-400",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border-red-200 dark:border-red-800",
    dot: "bg-red-500",
    pulse: true,
    label: "Critical Risk",
  },
  warning: {
    border: "border-amber-300 dark:border-amber-800/60",
    bg: "bg-gradient-to-r from-amber-50 to-amber-50/30 dark:from-amber-950/30 dark:to-amber-950/10",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
    pulse: false,
    label: "Warning",
  },
  info: {
    border: "border-blue-200 dark:border-blue-800/50",
    bg: "bg-gradient-to-r from-blue-50 to-blue-50/30 dark:from-blue-950/20 dark:to-blue-950/5",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
    pulse: false,
    label: "Info",
  },
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-muted-foreground",
};

function AlertCard({ alert, onDismiss }: { alert: PredictiveAlert; onDismiss: (id: string) => void }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const severity = (alert.severity as keyof typeof SEVERITY_CONFIG) || "info";
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const dataSummary = alert.data_summary as any;
  const timeframe = dataSummary?.timeframe;
  const confidence = dataSummary?.confidence;
  const metricType = alert.metric_types?.[0];
  const MetricIcon = (metricType && METRIC_ICON_MAP[metricType]) || Activity;

  // Split content into prediction and recommendation
  const parts = alert.content.split(/Recommendation:\s*/i);
  const prediction = parts[0]?.trim();
  const recommendation = parts[1]?.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className={cn(
          "group rounded-xl border overflow-hidden transition-all duration-200",
          config.border,
          config.bg,
          !alert.is_read && "ring-1 ring-primary/20"
        )}
      >
        <div className="p-3 sm:p-4">
          {/* Header row */}
          <div className="flex items-start gap-3">
            {/* Metric icon with severity pulse */}
            <div className={cn("relative p-2 rounded-lg shrink-0", config.iconBg)}>
              <MetricIcon className={cn("h-4 w-4", config.iconColor)} />
              {config.pulse && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Title + severity badge */}
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <h4 className="font-semibold text-sm leading-tight">{alert.title}</h4>
              </div>

              {/* Meta badges row */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 gap-1 border", config.badge)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
                  {config.label}
                </Badge>
                {timeframe && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                    <Clock className="h-3 w-3" />
                    {timeframe}
                  </Badge>
                )}
                {confidence && (
                  <span className={cn("text-[10px] font-medium", CONFIDENCE_COLORS[confidence] || "text-muted-foreground")}>
                    {confidence} confidence
                  </span>
                )}
              </div>

              {/* Prediction text */}
              <p className="text-sm text-foreground/80 leading-relaxed">{prediction}</p>

              {/* Expandable recommendation */}
              {recommendation && (
                <>
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 text-xs font-medium text-primary mt-2 hover:underline press-feedback"
                  >
                    <Lightbulb className="h-3 w-3" />
                    {expanded ? "Hide recommendation" : "View recommendation"}
                    {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 p-2.5 rounded-lg bg-background/60 border border-border/50">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                            <p className="text-xs text-foreground/70 leading-relaxed">{recommendation}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Timestamp */}
              <p className="text-[10px] text-muted-foreground/60 mt-2">
                {formatDistanceToNow(new Date(alert.generated_at), { addSuffix: true })}
              </p>
            </div>

            {/* Dismiss button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDismiss(alert.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const PredictiveAlertsBanner = () => {
  const { t } = useTranslation();
  const { alerts, isLoading, generatePredictions, isGenerating, criticalCount, warningCount } = usePredictiveAlerts();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));

  // Sort: critical first, then warning, then info
  const sortedAlerts = [...visibleAlerts].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    return (order[a.severity || "info"] ?? 2) - (order[b.severity || "info"] ?? 2);
  });

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
  };

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
            <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
              {t("healthInsights.predictiveTitle")}
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse">
                  {criticalCount} critical
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border-0">
                  {warningCount} warning
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t("healthInsights.predictiveDesc")}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => generatePredictions.mutate(undefined)}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          {t("healthInsights.analyze")}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sortedAlerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">{t("healthInsights.noRisks")}</p>
            <p className="text-xs">{t("healthInsights.noRisksDesc")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {sortedAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onDismiss={handleDismiss} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
