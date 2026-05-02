import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ShieldAlert, AlertTriangle, CalendarPlus, Home, Lightbulb, AlertCircle } from "lucide-react";
import type { TriageResult } from "@/hooks/useSymptomTriageRecommend";

const URGENCY_CONFIG = {
  emergency: {
    icon: ShieldAlert,
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/30",
    badge: "bg-destructive text-destructive-foreground",
  },
  see_doctor_soon: {
    icon: AlertTriangle,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
    badge: "bg-orange-500 text-white",
  },
  schedule_appointment: {
    icon: CalendarPlus,
    color: "text-primary",
    bg: "bg-primary/5 border-primary/20",
    badge: "bg-primary text-primary-foreground",
  },
  self_care: {
    icon: Home,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    badge: "bg-green-600 text-white",
  },
};

interface TriageResultCardProps {
  triage: TriageResult;
}

export function TriageResultCard({ triage }: TriageResultCardProps) {
  const { t } = useTranslation();
  const config = URGENCY_CONFIG[triage.urgency];
  const Icon = config.icon;

  return (
    <div className="space-y-3">
      {/* Urgency Card */}
      <Card className={cn("border", config.bg)}>
        <CardContent className="p-3 sm:p-5">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg shrink-0", config.bg)}>
              <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", config.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <Badge className={cn("text-xs mb-1.5", config.badge)}>
                {triage.urgency_label}
              </Badge>
              <p className="text-sm sm:text-base font-medium">{triage.summary}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{triage.reasoning}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Specialties */}
      {triage.recommended_specialties?.length > 0 && (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-primary" />
              {t("triageEngine.recommendedSpecialties", "Recommended Specialists")}
            </h4>
            <div className="space-y-2">
              {triage.recommended_specialties.map((spec, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{spec.specialty}</p>
                    <p className="text-xs text-muted-foreground">{spec.reasoning}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 ml-2 text-xs">
                    {spec.relevance_score}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations + Warnings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {triage.recommendations?.length > 0 && (
          <Card>
            <CardContent className="p-3 sm:p-4">
              <h4 className="text-sm font-semibold mb-2">{t("symptomChecker.recommendations")}</h4>
              <ul className="space-y-1">
                {triage.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs sm:text-sm flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {triage.warning_signs?.length > 0 && (
          <Card className="border-destructive/20">
            <CardContent className="p-3 sm:p-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                {t("symptomChecker.warningTitle")}
              </h4>
              <ul className="space-y-1">
                {triage.warning_signs.map((sign, i) => (
                  <li key={i} className="text-xs sm:text-sm flex items-start gap-1.5">
                    <span className="text-destructive mt-0.5">•</span>
                    <span>{sign}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Home Remedies */}
      {triage.home_remedies?.length > 0 && (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <h4 className="text-sm font-semibold mb-2">{t("symptomChecker.homeRemedies")}</h4>
            <ul className="space-y-1">
              {triage.home_remedies.map((remedy, i) => (
                <li key={i} className="text-xs sm:text-sm flex items-start gap-1.5">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{remedy}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
