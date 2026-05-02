import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { User, HeartPulse, FileText, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import type { PatientFeatureEligibility } from "@/hooks/usePatientFeatureEligibility";

interface FeatureGateBlockerProps {
  eligibility: PatientFeatureEligibility;
  feature: "appointments" | "find-doctor" | "share-data" | "wallet";
}

const CATEGORY_CONFIG = {
  profile: {
    icon: User,
    route: "/dashboard/profile",
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
  },
  health: {
    icon: HeartPulse,
    route: "/dashboard/health-data",
    colorClass: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-100 dark:bg-rose-900/30",
  },
  clinical: {
    icon: FileText,
    route: "/dashboard/clinical-records",
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-100 dark:bg-amber-900/30",
  },
} as const;

export const FeatureGateBlocker = ({ eligibility, feature }: FeatureGateBlockerProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const percentage = Math.round((eligibility.completedCount / eligibility.totalCount) * 100);

  const allCategories: ('profile' | 'health')[] = ['profile', 'health'];

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-lg border-amber-200 dark:border-amber-800/40">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold">{t("featureGate.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("featureGate.description")}</p>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("featureGate.progress")}</span>
              <span className="font-semibold">{eligibility.completedCount}/{eligibility.totalCount}</span>
            </div>
            <Progress value={percentage} className="h-2.5" />
          </div>

          {/* Categories */}
          <div className="space-y-3">
            {allCategories.map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              const Icon = config.icon;
              const isComplete = !eligibility.missingCategories.includes(cat);
              const missingFields = cat === 'profile'
                ? eligibility.missingProfileFields
                : cat === 'health'
                  ? eligibility.missingHealthFields
                  : !eligibility.hasClinicalRecords ? [t("featureGate.noClinicalRecords")] : [];

              return (
                <div
                  key={cat}
                  className={`rounded-lg border p-3 sm:p-4 transition-colors ${
                    isComplete ? "border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-950/10" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isComplete ? "bg-green-100 dark:bg-green-900/30" : config.bgClass}`}>
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Icon className={`h-4 w-4 ${config.colorClass}`} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t(`featureGate.${cat}`)}</p>
                        {!isComplete && missingFields.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {missingFields.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    {!isComplete && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-8 text-xs gap-1"
                        onClick={() => navigate(config.route)}
                      >
                        {t("featureGate.completeNow")}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
