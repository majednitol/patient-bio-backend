import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, AlertTriangle, Heart } from "lucide-react";

import { DoctorVisitPackButton } from "./DoctorVisitPackButton";
import { EmergencyAccessQRDialog } from "./EmergencyAccessQRDialog";
import { useHealthData } from "@/hooks/useHealthData";
import { usePatientPrescriptions } from "@/hooks/usePrescriptions";
import { differenceInMonths } from "date-fns";
import { useHealthRecords } from "@/hooks/useHealthRecords";
import { useMemo } from "react";

export const HealthSummaryBanner = () => {
  const { t } = useTranslation();
  const { healthData } = useHealthData();
  const { data: prescriptions = [] } = usePatientPrescriptions();
  const { records } = useHealthRecords();

  const activeMeds = useMemo(() => {
    return prescriptions.filter((p) => p.is_active);
  }, [prescriptions]);

  const totalMedCount = useMemo(() => {
    return activeMeds.reduce((sum, p) => sum + p.medications.length, 0);
  }, [activeMeds]);

  const allergies = healthData?.health_allergies;

  const labRenewalNeeded = useMemo(() => {
    const labRecords = records.filter((r) => r.category === "lab_result" && r.record_date);
    if (labRecords.length === 0) return null;
    const sorted = [...labRecords].sort(
      (a, b) => new Date(b.record_date!).getTime() - new Date(a.record_date!).getTime()
    );
    const latest = sorted[0];
    const monthsAgo = differenceInMonths(new Date(), new Date(latest.record_date!));
    return { date: latest.record_date!, monthsAgo, needsRenewal: monthsAgo >= 6 };
  }, [records]);


  // Don't render if no meaningful data
  if (!healthData && prescriptions.length === 0 && records.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardContent className="py-3 sm:py-4 px-3 sm:px-6">
        {/* Health stats - 3-col grid on mobile, flex row on desktop */}
        <div className="grid grid-cols-3 sm:flex sm:items-center sm:gap-6 gap-1">
          {/* Active Medications */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Pill className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{t("healthSummary.activeMedications")}</p>
              <p className="font-semibold text-xs sm:text-sm leading-tight">
                {t(totalMedCount !== 1 ? "healthSummary.medsCount_plural" : "healthSummary.medsCount", { count: totalMedCount })}{" "}
                <span className="text-[10px] sm:text-xs text-muted-foreground font-normal hidden sm:inline">
                  {t("healthSummary.across", { count: activeMeds.length })}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground font-normal sm:hidden leading-tight">
                {t("healthSummary.acrossPrescriptions", { count: activeMeds.length })}
              </p>
            </div>
          </div>

          {/* Lab Renewal */}
          {labRenewalNeeded ? (
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  labRenewalNeeded.needsRenewal
                    ? "bg-amber-100 dark:bg-amber-950/30"
                    : "bg-emerald-100 dark:bg-emerald-950/30"
                }`}
              >
                <AlertTriangle
                  className={`h-4 w-4 ${
                    labRenewalNeeded.needsRenewal
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{t("healthSummary.lastLabTest")}</p>
                <p className="font-semibold text-xs sm:text-sm leading-tight">
                  {t("healthSummary.monthsAgo", { count: labRenewalNeeded.monthsAgo })}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{t("healthSummary.lastLabTest")}</p>
                <p className="font-semibold text-xs sm:text-sm leading-tight">{t("healthSummary.na")}</p>
              </div>
            </div>
          )}

          {/* Allergies */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <Heart className="h-4 w-4 text-destructive" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{t("healthSummary.allergies")}</p>
              <p className="font-semibold text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[200px] leading-tight">
                {allergies || t("healthSummary.none")}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-2.5 sm:mt-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-border/40">
          <EmergencyAccessQRDialog />
          <DoctorVisitPackButton variant="default" size="sm" />
        </div>
      </CardContent>
    </Card>
  );
};
