import { Badge } from "@/components/ui/badge";
import { useSlotRecommendations } from "@/hooks/useSlotRecommendations";
import { Sparkles, TrendingDown, Minus, TrendingUp, Loader2, Sun, Moon } from "lucide-react";
import { format, parseISO } from "date-fns";

interface SmartBookingAdvisorProps {
  doctorId: string;
  onSelectDate: (date: Date) => void;
}

const loadConfig = {
  low: {
    icon: TrendingDown,
    label: "Low traffic",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  },
  medium: {
    icon: Minus,
    label: "Moderate",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  },
  high: {
    icon: TrendingUp,
    label: "Busy",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  },
};

export function SmartBookingAdvisor({ doctorId, onSelectDate }: SmartBookingAdvisorProps) {
  const { data, isLoading } = useSlotRecommendations(doctorId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Analyzing best times...
      </div>
    );
  }

  if (!data?.suggested || data.suggested.length === 0) return null;

  const suggestedSlots = data.recommendations.filter((r) =>
    data.suggested.includes(r.date)
  );

  return (
    <div className="space-y-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        Best Days to Book
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestedSlots.map((slot) => {
          const config = loadConfig[slot.load];
          const LoadIcon = config.icon;
          return (
            <button
              key={slot.date}
              type="button"
              onClick={() => onSelectDate(parseISO(slot.date))}
              className={`flex flex-col gap-1 text-xs px-2.5 py-1.5 rounded-md border transition-all hover:ring-2 hover:ring-primary/20 cursor-pointer ${config.className}`}
            >
              <div className="flex items-center gap-1.5">
                <LoadIcon className="h-3 w-3" />
                <span className="font-medium">{slot.dayLabel}</span>
                <span className="opacity-70">· {slot.appointmentCount} appts</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] opacity-80">
                <span className="flex items-center gap-0.5">
                  <Sun className="h-2.5 w-2.5" />
                  AM: {slot.morningCount}
                </span>
                <span className="flex items-center gap-0.5">
                  <Moon className="h-2.5 w-2.5" />
                  PM: {slot.afternoonCount}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        These days have the fewest bookings — shorter wait times expected
      </p>
    </div>
  );
}

/**
 * Returns a load indicator for a specific date, for use on the Calendar.
 */
export function useDateLoadIndicator(
  doctorId: string | undefined,
  date: string
): "low" | "medium" | "high" | null {
  const { data } = useSlotRecommendations(doctorId);
  if (!data?.countByDate) return null;
  const rec = data.recommendations.find((r) => r.date === date);
  return rec?.load ?? null;
}
