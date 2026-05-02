import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import { Sparkline } from "@/components/ui/Sparkline";
import { severityDotClass, severityGaugeStroke } from "@/utils/healthSeverity";
import type { Severity } from "@/utils/healthSeverity";

interface HealthMetric {
  name: string;
  status: Severity;
  value: string;
  description: string;
  target?: string;
  history?: number[];
}

interface HealthStatusCardsProps {
  metrics: HealthMetric[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "healthy":
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "error":
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function HealthStatusCards({ metrics }: HealthStatusCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.name} className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${severityDotClass(metric.status)}`} />
                <span className="text-sm font-medium text-muted-foreground">{metric.name}</span>
              </div>
              {getStatusIcon(metric.status)}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold tracking-tight">{metric.value}</div>
              {metric.history && metric.history.length > 1 && (
                <Sparkline
                  data={metric.history}
                  width={64}
                  height={24}
                  color={severityGaugeStroke(metric.status)}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metric.description}
              {metric.target && <> · <span className="font-medium">{metric.target}</span></>}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
