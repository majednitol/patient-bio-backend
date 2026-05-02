import React from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock } from "lucide-react";

interface DayProgressBarProps {
  completed: number;
  total: number;
}

export const DayProgressBar = React.memo(function DayProgressBar({ completed, total }: DayProgressBarProps) {
  if (total === 0) return null;

  const percentage = Math.round((completed / total) * 100);

  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
        <CheckCircle2 className="h-3 w-3 text-green-500" />
        <span>{completed}/{total}</span>
      </div>
      <Progress value={percentage} className="h-1.5 flex-1" />
      <span className="text-[10px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap">
        {percentage}%
      </span>
    </div>
  );
});
