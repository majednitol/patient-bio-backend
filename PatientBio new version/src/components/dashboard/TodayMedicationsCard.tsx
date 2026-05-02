import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMedicationLogs, MedicationLog } from "@/hooks/useMedicationLogs";
import { Pill, Clock, Check, X, Loader2, AlarmClock } from "lucide-react";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { SnoozeReminderDialog } from "./SnoozeReminderDialog";

export const TodayMedicationsCard = () => {
  const { t } = useTranslation();
  const { todayLogs, isLoading, markTaken, markSkipped, getPendingCount } = useMedicationLogs();
  const [skipDialogLog, setSkipDialogLog] = useState<MedicationLog | null>(null);
  const [skipReason, setSkipReason] = useState("");
  const [snoozeLog, setSnoozeLog] = useState<MedicationLog | null>(null);

  const pendingCount = getPendingCount();

  const handleMarkTaken = (logId: string) => {
    markTaken.mutate(logId);
  };

  const handleSkipConfirm = () => {
    if (skipDialogLog) {
      markSkipped.mutate({ logId: skipDialogLog.id, reason: skipReason });
      setSkipDialogLog(null);
      setSkipReason("");
    }
  };

  const getStatusColor = (log: MedicationLog) => {
    switch (log.status) {
      case "taken":
        return "bg-secondary/10 border-secondary text-secondary";
      case "skipped":
        return "bg-accent/30 border-accent";
      case "missed":
        return "bg-destructive/10 border-destructive text-destructive";
      default:
        const isDue = isPast(new Date(log.scheduled_for));
        return isDue
          ? "bg-primary/10 border-primary"
          : "bg-muted/50 border-border";
    }
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), "h:mm a");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Pill className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{t("medications.todayTitle")}</CardTitle>
                <CardDescription>
                  {todayLogs.length === 0
                    ? t("medications.noScheduledToday")
                    : pendingCount > 0
                    ? t("medications.medicationsDue", { count: pendingCount })
                    : t("medications.allCaughtUp")}
                </CardDescription>
              </div>
            </div>
            {pendingCount > 0 && (
              <Badge variant="default" className="bg-primary">
                {t("medications.due", { count: pendingCount })}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {todayLogs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Pill className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("medications.noScheduledToday")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayLogs.map((log) => {
                const isDue = isPast(new Date(log.scheduled_for));
                const isCompleted = log.status === "taken" || log.status === "skipped";

                  return (
                    <div
                      key={log.id}
                      className={cn(
                        "flex flex-col gap-2 p-3 rounded-lg border transition-all",
                        getStatusColor(log)
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          {isCompleted ? (
                            <div className="flex items-center justify-center w-5 h-5 shrink-0">
                              {log.status === "taken" ? (
                                <Check className="h-5 w-5 text-secondary" />
                              ) : (
                                <X className="h-5 w-5 text-accent-foreground" />
                              )}
                            </div>
                          ) : (
                            <Checkbox
                              checked={false}
                              onCheckedChange={() => handleMarkTaken(log.id)}
                              disabled={markTaken.isPending}
                              className="shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "font-medium text-sm truncate",
                                isCompleted && "line-through opacity-60"
                              )}
                            >
                              {log.medication_reminders?.medication_name || t("medications.unknown")}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>{formatTime(log.scheduled_for)}</span>
                              {log.medication_reminders?.dosage && (
                                <>
                                  <span>•</span>
                                  <span>{log.medication_reminders.dosage}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {log.status === "taken" && log.taken_at && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {t("medications.takenAtTime", { time: format(new Date(log.taken_at), "h:mm a") })}
                          </Badge>
                        )}

                        {log.status === "skipped" && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {t("medications.skippedStatus")}
                          </Badge>
                        )}
                      </div>

                      {!isCompleted && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSnoozeLog(log)}
                            className="h-8 px-2"
                            title={t("medications.snooze")}
                          >
                            <AlarmClock className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSkipDialogLog(log)}
                            disabled={markSkipped.isPending}
                            className="h-8 px-2"
                          >
                            {t("medications.skip")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleMarkTaken(log.id)}
                            disabled={markTaken.isPending}
                            className="h-8 px-3"
                          >
                            {markTaken.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                <span>{t("medications.take")}</span>
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!skipDialogLog} onOpenChange={() => setSkipDialogLog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("medications.skipMedication")}</DialogTitle>
            <DialogDescription>
              {t("medications.skipConfirm", { name: skipDialogLog?.medication_reminders?.medication_name })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t("medications.skipReasonPlaceholder")}
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipDialogLog(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSkipConfirm}
              disabled={markSkipped.isPending}
              variant="destructive"
            >
              {markSkipped.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t("medications.skip")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SnoozeReminderDialog
        log={snoozeLog}
        open={!!snoozeLog}
        onOpenChange={(open) => !open && setSnoozeLog(null)}
      />
    </>
  );
};