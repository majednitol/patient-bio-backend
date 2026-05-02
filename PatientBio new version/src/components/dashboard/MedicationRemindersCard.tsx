import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pill, Plus, Clock, Trash2, Loader2, Bell, History, Heart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useMedicationReminders, MedicationReminder, DAYS_OF_WEEK } from "@/hooks/useMedicationReminders";
import { useMedicationLogs } from "@/hooks/useMedicationLogs";
import { AddMedicationReminderDialog } from "./AddMedicationReminderDialog";
import { MedicationHistoryDialog } from "./MedicationHistoryDialog";
import { TodayMedicationsCard } from "./TodayMedicationsCard";
import { MedicationStreakCard } from "./MedicationStreakCard";
import { CaregiverSettingsDialog } from "./CaregiverSettingsDialog";
import { MedicationInteractionBanner } from "./MedicationInteractionBanner";
import { formatDistanceToNow } from "date-fns";

export const MedicationRemindersCard = () => {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const {
    reminders,
    isLoading,
    toggleReminder,
    deleteReminder,
    getNextReminderTime,
  } = useMedicationReminders();
  const { calculateAdherence } = useMedicationLogs();

  const formatReminderTimes = (times: string[]) => {
    return times.map(t => {
      const [h, m] = t.split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${m} ${ampm}`;
    }).join(", ");
  };

  const formatDays = (days: number[]) => {
    if (days.length === 7) return t("medications.everyDay");
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return t("medications.weekdays");
    if (days.length === 2 && days.includes(0) && days.includes(6)) return t("medications.weekends");
    return days.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(", ");
  };

  const adherence = calculateAdherence();

  return (
    <>
      <TodayMedicationsCard />
      <MedicationStreakCard />

      <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <CardHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Pill className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">{t("medications.reminders")}</CardTitle>
              <CardDescription>
                {adherence.total > 0 
                  ? t("medications.adherenceThisWeek", { percentage: adherence.percentage })
                  : t("medications.pushNotifications")}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <MedicationHistoryDialog
              trigger={
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <History className="h-4 w-4 mr-2" />
                  {t("medications.history")}
                </Button>
              }
            />
            <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("medications.add")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>{t("medications.noRemindersSet")}</p>
              <p className="text-sm">{t("medications.addRemindersPrompt")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <MedicationInteractionBanner
                medications={reminders.filter((r) => r.is_active).map((r) => ({
                  medication_name: r.medication_name,
                  dosage: r.dosage,
                }))}
              />
              {reminders.map((reminder) => {
                const nextTime = getNextReminderTime(reminder);
                return (
                  <div
                    key={reminder.id}
                    className={`p-3 sm:p-4 rounded-lg border ${
                      reminder.is_active ? "bg-background" : "bg-muted/30 opacity-60"
                    }`}
                  >
                    {/* Top row: name + dosage + actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <h4 className="font-medium text-sm sm:text-base truncate">{reminder.medication_name}</h4>
                        {reminder.dosage && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0 px-1.5 sm:px-2">
                            {reminder.dosage}
                          </Badge>
                        )}
                        {!reminder.is_active && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                            {t("medications.paused")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <CaregiverSettingsDialog
                          reminder={reminder}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              title={t("medications.caregiverAlert")}
                            >
                              <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${(reminder as any).caregiver_name ? "text-pink-500 fill-pink-500" : "text-muted-foreground"}`} />
                            </Button>
                          }
                        />
                        <Switch
                          checked={reminder.is_active ?? false}
                          onCheckedChange={(checked) =>
                            toggleReminder.mutate({ id: reminder.id, is_active: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8"
                          onClick={() => deleteReminder.mutate(reminder.id)}
                          disabled={deleteReminder.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {/* Details row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs sm:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatReminderTimes(reminder.reminder_times)}
                      </span>
                      <span>{formatDays(reminder.days_of_week)}</span>
                    </div>
                    {nextTime && reminder.is_active && (
                      <p className="text-[11px] sm:text-xs text-primary mt-1">
                        {t("medications.nextReminder", { time: formatDistanceToNow(nextTime, { addSuffix: true }) })}
                      </p>
                    )}
                    {reminder.notes && (
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">
                        {reminder.notes}
                      </p>
                    )}
                    {(reminder as any).caregiver_name && (
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                        <Heart className="h-3 w-3 inline mr-1 text-pink-500" />
                        {t("medications.caregiverNotified", { name: (reminder as any).caregiver_name, minutes: (reminder as any).caregiver_alert_after_minutes || 120 })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddMedicationReminderDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </>
  );
};