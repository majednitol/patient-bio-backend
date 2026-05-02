import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSlotRecommendations } from "@/hooks/useSlotRecommendations";
import { Sparkles, TrendingDown, Minus, TrendingUp, Loader2, Sun, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SlotRecommendationsCardProps {
  doctorId: string;
}

const loadConfig = {
  low: {
    icon: TrendingDown,
    label: "Low",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  medium: {
    icon: Minus,
    label: "Moderate",
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  high: {
    icon: TrendingUp,
    label: "Busy",
    bg: "bg-red-500/10 dark:bg-red-500/20",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
};

export function SlotRecommendationsCard({ doctorId }: SlotRecommendationsCardProps) {
  const { data, isLoading } = useSlotRecommendations(doctorId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing schedule...
        </CardContent>
      </Card>
    );
  }

  if (!data?.recommendations || data.recommendations.length === 0) return null;

  const topSlots = data.recommendations.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          Suggested Slots
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {topSlots.map((slot) => {
          const config = loadConfig[slot.load];
          return (
            <div
              key={slot.date}
              className={`flex items-center justify-between rounded-lg px-2.5 py-2 ${config.bg}`}
            >
              <div className="space-y-0.5">
                <p className={`text-xs font-semibold ${config.text}`}>
                  {slot.dayLabel}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Sun className="h-2.5 w-2.5" /> {slot.morningCount}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Moon className="h-2.5 w-2.5" /> {slot.afternoonCount}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                <span className={`text-[10px] font-medium ${config.text}`}>{config.label}</span>
              </div>
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground pt-1">
          Lowest-load days for shorter patient wait times
        </p>
      </CardContent>
    </Card>
  );
}
