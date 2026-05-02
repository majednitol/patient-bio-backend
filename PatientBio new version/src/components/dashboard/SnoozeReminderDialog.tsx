import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlarmClock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { MedicationLog } from "@/hooks/useMedicationLogs";

interface SnoozeReminderDialogProps {
  log: MedicationLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SNOOZE_OPTIONS = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
];

export const SnoozeReminderDialog = ({ log, open, onOpenChange }: SnoozeReminderDialogProps) => {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSnooze = async (minutes: number) => {
    if (!log) return;
    setLoading(true);

    try {
      const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      const currentSnoozeCount = (log as any).snooze_count || 0;

      const { error } = await supabase
        .from("medication_reminder_logs")
        .update({
          snoozed_until: snoozedUntil,
          snooze_count: currentSnoozeCount + 1,
          status: "pending", // Reset to pending so it fires again
        })
        .eq("id", log.id);

      if (error) throw error;

      toast.success(`Snoozed for ${minutes} minutes ⏰`);
      queryClient.invalidateQueries({ queryKey: ["medication-logs-today"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to snooze: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentSnoozeCount = (log as any)?.snooze_count || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlarmClock className="h-5 w-5" />
            Snooze Reminder
          </DialogTitle>
          <DialogDescription>
            Remind me about{" "}
            <strong>{log?.medication_reminders?.medication_name}</strong> again in:
          </DialogDescription>
        </DialogHeader>

        {currentSnoozeCount >= 3 && (
          <div className="bg-destructive/10 text-destructive text-xs p-2 rounded-md">
            You've snoozed this {currentSnoozeCount} times. Consider taking it now.
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 py-2">
          {SNOOZE_OPTIONS.map((opt) => (
            <Button
              key={opt.minutes}
              variant="outline"
              onClick={() => handleSnooze(opt.minutes)}
              disabled={loading}
              className="flex flex-col gap-1 h-auto py-3"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <AlarmClock className="h-4 w-4" />
                  <span className="text-xs">{opt.label}</span>
                </>
              )}
            </Button>
          ))}
        </div>

        {currentSnoozeCount > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Snoozed {currentSnoozeCount} time{currentSnoozeCount !== 1 ? "s" : ""}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
