import { useMemo } from "react";
import { DoctorAvailability, DAYS_OF_WEEK } from "@/types/hospital";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AvailabilityWeeklyGridProps {
  availability: DoctorAvailability[];
  onDayClick?: (dayOfWeek: number) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM

export function AvailabilityWeeklyGrid({ availability, onDayClick }: AvailabilityWeeklyGridProps) {
  const availMap = useMemo(() => {
    const map: Record<number, DoctorAvailability> = {};
    availability.forEach((a) => { map[a.day_of_week] = a; });
    return map;
  }, [availability]);

  const parseHour = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h + m / 60;
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
          <div className="p-2 text-[10px] text-muted-foreground font-medium text-center">Time</div>
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day.value}
              onClick={() => onDayClick?.(day.value)}
              className={cn(
                "p-2 text-xs font-medium text-center border-l transition-colors hover:bg-muted/50",
                availMap[day.value] ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="hidden sm:inline">{day.label.slice(0, 3)}</span>
              <span className="sm:hidden">{day.label[0]}</span>
            </button>
          ))}
        </div>

        {/* Grid body */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="p-1 text-[10px] text-muted-foreground text-right pr-2 border-t h-8 flex items-center justify-end">
                {hour <= 12 ? hour : hour - 12}{hour < 12 ? "a" : "p"}
              </div>
              {DAYS_OF_WEEK.map((day) => {
                const avail = availMap[day.value];
                const isAvailable = avail && parseHour(avail.start_time) <= hour && parseHour(avail.end_time) > hour;

                return (
                  <Tooltip key={`${day.value}-${hour}`}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={() => onDayClick?.(day.value)}
                        className={cn(
                          "border-l border-t h-8 transition-colors cursor-pointer",
                          isAvailable
                            ? "bg-emerald-500/15 hover:bg-emerald-500/25 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"
                            : "bg-background hover:bg-muted/30"
                        )}
                      />
                    </TooltipTrigger>
                    {avail && isAvailable && (
                      <TooltipContent side="top" className="text-xs">
                        {day.label}: {avail.start_time.slice(0, 5)} - {avail.end_time.slice(0, 5)} ({avail.slot_duration_minutes}min slots)
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
