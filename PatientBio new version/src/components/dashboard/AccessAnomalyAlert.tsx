import { useAccessAnomalies } from "@/hooks/useAccessAnomalies";
import { AlertTriangle, Shield, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";

const severityStyles = {
  low: "border-muted-foreground/30 bg-muted/20 text-muted-foreground",
  medium: "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300",
  high: "border-destructive/50 bg-destructive/5 text-destructive",
};

export function AccessAnomalyAlert() {
  const { data } = useAccessAnomalies();
  const { t } = useTranslation();

  if (!data?.anomalies?.length) return null;

  const highSeverity = data.anomalies.filter((a) => a.severity === "high");
  const otherAnomalies = data.anomalies.filter((a) => a.severity !== "high");

  return (
    <div className="space-y-2">
      {highSeverity.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">{t("accessAnomaly.unusualAccessDetected")}</p>
            {highSeverity.map((a, i) => (
              <p key={i} className="text-xs text-destructive/80">{a.description}</p>
            ))}
          </div>
        </div>
      )}
      {otherAnomalies.slice(0, 2).map((a, i) => (
        <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${severityStyles[a.severity]}`}>
          <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate">{a.description}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="h-2.5 w-2.5" />
              <span className="text-[10px]">
                {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
              </span>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] px-1 py-0">{t(`accessAnomaly.severity_${a.severity}`, a.severity)}</Badge>
        </div>
      ))}
    </div>
  );
}