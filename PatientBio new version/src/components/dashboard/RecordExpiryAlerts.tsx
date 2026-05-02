import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CalendarCheck } from "lucide-react";
import { usePatientPrescriptions } from "@/hooks/usePrescriptions";
import { useHealthRecords } from "@/hooks/useHealthRecords";
import { differenceInMonths, differenceInDays, format } from "date-fns";

interface AlertItem {
  id: string;
  type: "lab_renewal" | "followup_overdue";
  title: string;
  detail: string;
  severity: "amber" | "red";
}

export const RecordExpiryAlerts = () => {
  const { t } = useTranslation();
  const { data: prescriptions = [] } = usePatientPrescriptions();
  const { records } = useHealthRecords();

  const alerts = useMemo(() => {
    const items: AlertItem[] = [];
    records.filter((r) => r.category === "lab_result" && r.record_date).forEach((r) => {
      const months = differenceInMonths(new Date(), new Date(r.record_date!));
      if (months >= 6) {
        items.push({
          id: `lab-${r.id}`, type: "lab_renewal", title: r.title,
          detail: t("records.monthsOld", { months }), severity: months >= 12 ? "red" : "amber",
        });
      }
    });
    prescriptions.filter((p) => p.is_active && p.follow_up_date).forEach((p) => {
      const daysOverdue = differenceInDays(new Date(), new Date(p.follow_up_date!));
      if (daysOverdue > 0) {
        items.push({
          id: `rx-${p.id}`, type: "followup_overdue", title: p.diagnosis || "Prescription",
          detail: t("records.followupOverdue", { date: format(new Date(p.follow_up_date!), "MMM d, yyyy"), days: daysOverdue }),
          severity: daysOverdue > 14 ? "red" : "amber",
        });
      }
    });
    return items;
  }, [records, prescriptions, t]);

  if (alerts.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/10">
      <CardContent className="py-3 px-4 sm:px-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h3 className="font-semibold text-sm text-amber-800 dark:text-amber-300">
            {t("records.itemsNeedAttention", { count: alerts.length })}
          </h3>
        </div>
        <div className="space-y-1.5">
          {alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="flex items-start gap-2 text-sm">
              {alert.type === "lab_renewal" ? (
                <Clock className="h-3.5 w-3.5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
              ) : (
                <CalendarCheck className="h-3.5 w-3.5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span className="text-foreground/80">
                <span className="font-medium">{alert.title}</span>{" — "}{alert.detail}
              </span>
              <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 ml-auto ${alert.severity === "red" ? "border-destructive/50 text-destructive" : "border-amber-400 text-amber-700 dark:text-amber-400"}`}>
                {alert.type === "lab_renewal" ? t("records.renew") : t("records.overdue")}
              </Badge>
            </div>
          ))}
          {alerts.length > 5 && <p className="text-xs text-muted-foreground">{t("records.moreItems", { count: alerts.length - 5 })}</p>}
        </div>
      </CardContent>
    </Card>
  );
};