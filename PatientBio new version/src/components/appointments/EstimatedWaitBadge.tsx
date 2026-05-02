import { useEstimatedWait, useQueuePosition } from "@/hooks/useEstimatedWait";
import { Clock } from "lucide-react";
import { format, startOfDay } from "date-fns";

interface EstimatedWaitBadgeProps {
  doctorId: string;
  appointmentDate: string;
  startTime: string;
}

export function EstimatedWaitBadge({ doctorId, appointmentDate, startTime }: EstimatedWaitBadgeProps) {
  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  const isToday = appointmentDate === today;
  
  const { data: position } = useQueuePosition(isToday ? doctorId : undefined, startTime);
  const { data: wait } = useEstimatedWait(isToday ? doctorId : undefined, position || 0);

  if (!isToday || !wait || !position || position <= 0) return null;

  const mins = wait.estimatedMinutes;
  const label = mins < 60 ? `~${mins} min` : `~${Math.round(mins / 60)}h ${mins % 60}m`;

  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 rounded-md font-medium">
      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
      {label} wait · #{position}
    </span>
  );
}
