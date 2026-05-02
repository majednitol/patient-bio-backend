import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMedicationLogs } from "@/hooks/useMedicationLogs";
import { History, Check, X, Clock, TrendingUp, Pill } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface MedicationHistoryDialogProps {
  trigger?: React.ReactNode;
}

export const MedicationHistoryDialog = ({ trigger }: MedicationHistoryDialogProps) => {
  const { t } = useTranslation();
  const [daysBack, setDaysBack] = useState(7);
  const { historyLogs, isLoading, calculateAdherence, getLogsByDate } = useMedicationLogs(daysBack);

  const adherence = calculateAdherence();
  const logsByDate = getLogsByDate();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "taken":
        return <Check className="h-4 w-4 text-secondary" />;
      case "skipped":
        return <X className="h-4 w-4 text-accent-foreground" />;
      case "missed":
        return <Clock className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "taken":
        return <Badge className="bg-secondary/10 text-secondary border-secondary">{t("medications.takenStatus")}</Badge>;
      case "skipped":
        return <Badge className="bg-accent/30 border-accent">{t("medications.skippedStatus")}</Badge>;
      case "missed":
        return <Badge className="bg-destructive/10 text-destructive border-destructive">{t("medications.missedStatus")}</Badge>;
      case "pending":
      case "sent":
        return <Badge variant="outline">{t("medications.pendingStatus")}</Badge>;
      default:
        return null;
    }
  };

  const [open, setOpen] = useState(false);

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger || (
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            {t("medications.history")}
          </Button>
        )}
      </span>
      <ResponsiveDialog open={open} onOpenChange={setOpen}>
        <ResponsiveDialogContent className="sm:max-w-lg max-h-[85vh]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t("medications.historyTitle")}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t("medications.trackAdherence")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("medications.timeRange")}</span>
            <Select
              value={daysBack.toString()}
              onValueChange={(v) => setDaysBack(parseInt(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t("medications.last7Days")}</SelectItem>
                <SelectItem value="14">{t("medications.last14Days")}</SelectItem>
                <SelectItem value="30">{t("medications.last30Days")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-medium">{t("medications.adherenceRate")}</span>
              </div>
              <span className="text-2xl font-bold text-primary">
                {adherence.percentage}%
              </span>
            </div>
            <Progress value={adherence.percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-secondary" />
                {adherence.taken} {t("medications.taken")}
              </span>
              <span className="flex items-center gap-1">
                <X className="h-3 w-3 text-accent-foreground" />
                {adherence.skipped} {t("medications.skipped")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-destructive" />
                {adherence.missed} {t("medications.missed")}
              </span>
            </div>
          </div>

          <ScrollArea className="h-[300px] pr-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : Object.keys(logsByDate).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Pill className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>{t("medications.noHistoryYet")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(logsByDate).map(([date, logs]) => (
                  <div key={date}>
                    <div className="sticky top-0 bg-background/95 backdrop-blur py-1 mb-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        {format(parseISO(date), "EEEE, MMMM d")}
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            log.status === "taken"
                              ? "bg-secondary/5 border-secondary/20"
                              : log.status === "skipped"
                              ? "bg-accent/10 border-accent/30"
                              : log.status === "missed"
                              ? "bg-destructive/5 border-destructive/20"
                              : "bg-muted/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(log.status)}
                            <div>
                              <p className="font-medium text-sm">
                                {log.medication_reminders?.medication_name || t("medications.unknown")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("medications.scheduled", { time: format(new Date(log.scheduled_for), "h:mm a") })}
                                {log.taken_at && (
                                  <> • {t("medications.takenAt", { time: format(new Date(log.taken_at), "h:mm a") })}</>
                                )}
                              </p>
                              {log.skipped_reason && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t("medications.reason", { reason: log.skipped_reason })}
                                </p>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(log.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
    </>
  );
};