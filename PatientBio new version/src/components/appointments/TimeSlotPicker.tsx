import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TimeSlot } from "@/types/hospital";
import { useTimeSlots } from "@/hooks/useTimeSlots";
import { format, parse } from "date-fns";
import { Clock, Loader2, Sun, Moon, Sunset } from "lucide-react";

interface TimeSlotPickerProps {
  doctorId: string;
  hospitalId?: string;
  date: Date;
  selectedSlot?: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
}

type Period = "morning" | "afternoon" | "evening";

function getSlotPeriod(time: string): Period {
  const hour = parseInt(time.substring(0, 2), 10);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const periodConfig: Record<Period, { label: string; icon: typeof Sun; className: string }> = {
  morning: {
    label: "Morning",
    icon: Sun,
    className: "text-amber-600 dark:text-amber-400",
  },
  afternoon: {
    label: "Afternoon",
    icon: Sunset,
    className: "text-orange-600 dark:text-orange-400",
  },
  evening: {
    label: "Evening",
    icon: Moon,
    className: "text-indigo-600 dark:text-indigo-400",
  },
};

export function TimeSlotPicker({
  doctorId,
  hospitalId,
  date,
  selectedSlot,
  onSelectSlot,
}: TimeSlotPickerProps) {
  const { data: slots, isLoading, error } = useTimeSlots({ doctorId, hospitalId, date });

  const formatTime = (time: string) => {
    try {
      const parsed = parse(time, "HH:mm:ss", new Date());
      return format(parsed, "h:mm a");
    } catch {
      return time.substring(0, 5);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Failed to load available slots
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No availability on this date</p>
        <p className="text-sm">Please select another date</p>
      </div>
    );
  }

  const availableSlots = slots.filter((s) => s.is_available);

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>All slots are booked</p>
        <p className="text-sm">Please select another date or join the waitlist</p>
      </div>
    );
  }

  // Group slots by period
  const grouped = slots.reduce<Record<Period, TimeSlot[]>>((acc, slot) => {
    const period = getSlotPeriod(slot.start_time);
    if (!acc[period]) acc[period] = [];
    acc[period].push(slot);
    return acc;
  }, { morning: [], afternoon: [], evening: [] });

  const periods = (["morning", "afternoon", "evening"] as Period[]).filter(
    (p) => grouped[p].length > 0
  );

  const totalAvailable = availableSlots.length;
  const totalSlots = slots.length;
  const fillPercent = Math.round(((totalSlots - totalAvailable) / totalSlots) * 100);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{totalAvailable}</span> of {totalSlots} slot{totalSlots !== 1 ? "s" : ""} available
        </p>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-2",
            fillPercent > 75
              ? "border-red-300 text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800"
              : fillPercent > 40
              ? "border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800"
              : "border-green-300 text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800"
          )}
        >
          {fillPercent > 75 ? "Filling up" : fillPercent > 40 ? "Moderate" : "Wide open"}
        </Badge>
      </div>

      {/* Capacity bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            fillPercent > 75
              ? "bg-red-500"
              : fillPercent > 40
              ? "bg-amber-500"
              : "bg-green-500"
          )}
          style={{ width: `${fillPercent}%` }}
        />
      </div>

      {/* Grouped slots */}
      {periods.map((period) => {
        const config = periodConfig[period];
        const PeriodIcon = config.icon;
        const periodSlots = grouped[period];
        const periodAvailable = periodSlots.filter((s) => s.is_available).length;

        return (
          <div key={period} className="space-y-2">
            <div className="flex items-center gap-2">
              <PeriodIcon className={cn("h-3.5 w-3.5", config.className)} />
              <span className={cn("text-xs font-semibold uppercase tracking-wider", config.className)}>
                {config.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({periodAvailable} open)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {periodSlots.map((slot) => {
                const isSelected = selectedSlot?.start_time === slot.start_time;
                return (
                  <Button
                    key={slot.start_time}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    disabled={!slot.is_available}
                    onClick={() => onSelectSlot(slot)}
                    className={cn(
                      "font-medium text-xs h-9",
                      !slot.is_available
                        ? "opacity-30 cursor-not-allowed line-through border-muted"
                        : isSelected
                        ? "ring-2 ring-primary/30 shadow-md"
                        : "border-border text-foreground hover:bg-primary/10 hover:border-primary/40"
                    )}
                  >
                    {formatTime(slot.start_time)}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
