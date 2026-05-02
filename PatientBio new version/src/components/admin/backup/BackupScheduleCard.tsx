import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, Database, Trash2, Play, Settings } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { BackupSchedule } from "@/hooks/useBackupSchedules";
import { useUpdateSchedule, useDeleteSchedule, useRetryBackupRun } from "@/hooks/useBackupSchedules";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const FREQUENCY_LABELS: Record<string, string> = {
  "6h": "Every 6 hours",
  "12h": "Every 12 hours",
  daily: "Daily",
  weekly: "Weekly",
};

interface BackupScheduleCardProps {
  schedule: BackupSchedule;
  onEdit: (schedule: BackupSchedule) => void;
}

export function BackupScheduleCard({ schedule, onEdit }: BackupScheduleCardProps) {
  const updateMutation = useUpdateSchedule();
  const deleteMutation = useDeleteSchedule();
  const retryMutation = useRetryBackupRun();

  const handleToggle = (enabled: boolean) => {
    updateMutation.mutate({ id: schedule.id, is_enabled: enabled });
  };

  return (
    <Card className={!schedule.is_enabled ? "opacity-60" : ""}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{schedule.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {FREQUENCY_LABELS[schedule.frequency] ?? schedule.frequency}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {schedule.export_format.toUpperCase()}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                {schedule.tables.length} tables
              </Badge>
            </div>
          </div>
          <Switch checked={schedule.is_enabled} onCheckedChange={handleToggle} />
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          {schedule.last_run_at && (
            <p className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Last run: {formatDistanceToNow(new Date(schedule.last_run_at), { addSuffix: true })}
            </p>
          )}
          {schedule.next_run_at && schedule.is_enabled && (
            <p className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Next run: {format(new Date(schedule.next_run_at), "MMM d, HH:mm")}
            </p>
          )}
          <p>Retention: {schedule.retention_days} days</p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => retryMutation.mutate(schedule.id)}
            disabled={retryMutation.isPending || !schedule.is_enabled}
            className="gap-1 text-xs"
          >
            <Play className="h-3 w-3" />
            Run Now
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(schedule)} className="gap-1 text-xs">
            <Settings className="h-3 w-3" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive hover:text-destructive ml-auto">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the schedule "{schedule.name}" and all associated run history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate(schedule.id)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
