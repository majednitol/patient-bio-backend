import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isSameDay } from "date-fns";
import { Appointment } from "@/types/hospital";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MiniCalendarHeatmapProps {
  appointments: Appointment[];
  currentMonth: Date;
  onDateClick?: (date: Date) => void;
  selectedDate?: Date | null;
}

export function MiniCalendarHeatmap({ appointments, currentMonth, onDateClick, selectedDate }: MiniCalendarHeatmapProps) {
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const result: Date[][] = [];
    let day = calStart;
    let week: Date[] = [];

    while (day <= calEnd) {
      week.push(day);
      if (week.length === 7) {
        result.push(week);
        week = [];
      }
      day = addDays(day, 1);
    }
    return result;
  }, [currentMonth]);

  const densityMap = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach((a) => {
      const key = a.appointment_date;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [appointments]);

  const maxDensity = useMemo(() => Math.max(1, ...Object.values(densityMap)), [densityMap]);

  const getHeatColor = (count: number) => {
    if (count === 0) return "bg-muted/30";
    const ratio = count / maxDensity;
    if (ratio <= 0.25) return "bg-emerald-500/20 dark:bg-emerald-500/15";
    if (ratio <= 0.5) return "bg-emerald-500/40 dark:bg-emerald-500/30";
    if (ratio <= 0.75) return "bg-amber-500/40 dark:bg-amber-500/30";
    return "bg-red-500/40 dark:bg-red-500/30";
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-1.5">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i} className="text-[10px] text-muted-foreground font-medium">{d}</span>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const count = densityMap[dateStr] || 0;
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <Tooltip key={dateStr}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onDateClick?.(day)}
                      className={cn(
                        "h-7 w-full rounded-md text-[11px] font-medium transition-all relative",
                        inMonth ? "text-foreground" : "text-muted-foreground/40",
                        getHeatColor(inMonth ? count : 0),
                        today && "ring-1 ring-primary",
                        isSelected && "ring-2 ring-primary bg-primary/20",
                        inMonth && "hover:ring-1 hover:ring-primary/50 cursor-pointer"
                      )}
                    >
                      {format(day, "d")}
                      {count > 0 && inMonth && (
                        <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  </TooltipTrigger>
                  {inMonth && count > 0 && (
                    <TooltipContent side="top" className="text-xs">
                      {count} appointment{count !== 1 ? "s" : ""} on {format(day, "MMM d")}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-1.5 pt-1 justify-center">
          <span className="text-[10px] text-muted-foreground">Less</span>
          {["bg-muted/30", "bg-emerald-500/20", "bg-emerald-500/40", "bg-amber-500/40", "bg-red-500/40"].map((c, i) => (
            <div key={i} className={cn("h-3 w-3 rounded-sm", c)} />
          ))}
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
