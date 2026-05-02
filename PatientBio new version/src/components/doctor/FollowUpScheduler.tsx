import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFollowUpBooking, FollowUpInterval } from "@/hooks/useFollowUpBooking";
import { useSlotRecommendations } from "@/hooks/useSlotRecommendations";
import { CalendarPlus, Check, Loader2, Sparkles, TrendingDown, TrendingUp, Minus, Heart } from "lucide-react";
import { format, addWeeks, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  detectChronicConditions,
  CONDITION_FOLLOWUP_WEEKS,
  CONDITION_LABELS,
} from "@/constants/chronicCareTemplates";

interface FollowUpSchedulerProps {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  hospitalId?: string | null;
  defaultStartTime?: string;
  defaultEndTime?: string;
  diagnosis?: string | null;
  chronicConditions?: string | null;
}

const INTERVALS: { value: FollowUpInterval; label: string }[] = [
  { value: "1_week", label: "1 Week" },
  { value: "2_weeks", label: "2 Weeks" },
  { value: "1_month", label: "1 Month" },
  { value: "3_months", label: "3 Months" },
  { value: "custom", label: "Custom" },
];

function getPreviewDate(interval: FollowUpInterval, customDate?: Date): Date {
  const now = new Date();
  switch (interval) {
    case "1_week": return addWeeks(now, 1);
    case "2_weeks": return addWeeks(now, 2);
    case "1_month": return addMonths(now, 1);
    case "3_months": return addMonths(now, 3);
    case "custom": return customDate || addWeeks(now, 1);
  }
}

export function FollowUpScheduler({
  appointmentId,
  patientId,
  doctorId,
  hospitalId,
  defaultStartTime = "09:00:00",
  defaultEndTime = "09:30:00",
  diagnosis,
  chronicConditions,
}: FollowUpSchedulerProps) {
  const [selected, setSelected] = useState<FollowUpInterval | null>(null);
  const [customDate, setCustomDate] = useState<Date | undefined>();
  const [booked, setBooked] = useState(false);
  const followUp = useFollowUpBooking();
  const { data: slotData } = useSlotRecommendations(doctorId);

  const handleBook = () => {
    if (!selected) return;
      const followUpDate = getPreviewDate(selected, customDate);
      followUp.mutate(
      {
        parentAppointmentId: appointmentId,
        patientId,
        doctorId,
        hospitalId,
        interval: selected,
        customDate,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        reason: "Follow-up",
      },
      {
        onSuccess: async () => {
          setBooked(true);
          // Write follow_up_date to parent appointment
          try {
            await supabase
              .from("appointments")
              .update({ follow_up_date: format(followUpDate, "yyyy-MM-dd") } as any)
              .eq("id", appointmentId);
          } catch (err) {
            console.error("Failed to set follow_up_date on parent appointment:", err);
          }
        },
      }
    );
  };

  if (booked) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <Check className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          Follow-up scheduled for{" "}
          {format(getPreviewDate(selected!, customDate), "MMM d, yyyy")}
        </span>
      </div>
    );
  }

  // Get load level for a specific date from recommendations
  const getLoadForDate = (date: Date) => {
    if (!slotData?.recommendations) return null;
    const dateStr = format(date, "yyyy-MM-dd");
    return slotData.recommendations.find((r) => r.date === dateStr);
  };

  // Get load indicator for the preview date of a preset interval
  const getIntervalLoad = (interval: FollowUpInterval) => {
    if (interval === "custom") return null;
    const previewDate = getPreviewDate(interval);
    return getLoadForDate(previewDate);
  };

  const LoadIndicator = ({ load }: { load: "low" | "medium" | "high" }) => {
    if (load === "low") return <TrendingDown className="h-3 w-3 text-emerald-500" />;
    if (load === "high") return <TrendingUp className="h-3 w-3 text-destructive" />;
    return <Minus className="h-3 w-3 text-amber-500" />;
  };

  // Detect chronic conditions for smart suggestion
  const detectedConditions = detectChronicConditions(chronicConditions || diagnosis);
  const suggestedCondition = detectedConditions[0];
  const suggestedWeeks = suggestedCondition ? CONDITION_FOLLOWUP_WEEKS[suggestedCondition] : null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <CalendarPlus className="h-3.5 w-3.5" />
        Schedule Follow-Up
      </p>

      {/* Condition-aware suggestion */}
      {suggestedCondition && suggestedWeeks && (
        <div className="flex items-center gap-1.5 text-[10px] text-primary bg-primary/5 rounded-md px-2 py-1">
          <Heart className="h-3 w-3" />
          <span>
            Suggested: <strong>{suggestedWeeks >= 4 ? `${Math.round(suggestedWeeks / 4)} month${suggestedWeeks >= 8 ? "s" : ""}` : `${suggestedWeeks} weeks`}</strong> for {CONDITION_LABELS[suggestedCondition]}
          </span>
          <Badge
            variant="outline"
            className="cursor-pointer text-[10px] px-1.5 py-0 h-4 ml-auto border-primary/30"
            onClick={() => {
              setSelected("custom");
              setCustomDate(addWeeks(new Date(), suggestedWeeks));
            }}
          >
            Apply
          </Badge>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {INTERVALS.map((i) => {
          const intervalLoad = getIntervalLoad(i.value);
          return (
            <Badge
              key={i.value}
              variant={selected === i.value ? "default" : "outline"}
              className="cursor-pointer text-xs px-2.5 py-1 gap-1"
              onClick={() => setSelected(i.value)}
            >
              {i.label}
              {intervalLoad && <LoadIndicator load={intervalLoad.load} />}
            </Badge>
          );
        })}
      </div>

      {/* Smart Slot Recommendations -- shown for all modes */}
      {slotData?.suggested && slotData.suggested.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            Suggested days (least busy)
          </p>
          <div className="flex flex-wrap gap-1">
            {slotData.suggested.map((dateStr) => {
              const rec = slotData.recommendations.find((r) => r.date === dateStr);
              return (
                <Badge
                  key={dateStr}
                  variant="outline"
                  className="cursor-pointer text-[10px] px-2 py-0.5 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                  onClick={() => {
                    setSelected("custom");
                    setCustomDate(new Date(dateStr));
                  }}
                >
                  {format(new Date(dateStr), "EEE, MMM d")}
                  {rec && <span className="ml-1 opacity-60">({rec.appointmentCount})</span>}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {selected === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              {customDate ? format(customDate, "MMM d, yyyy") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={customDate}
              onSelect={setCustomDate}
              disabled={(date) => date < new Date()}
              className={cn("p-3 pointer-events-auto")}
              modifiers={slotData?.recommendations ? {
                low: slotData.recommendations
                  .filter((r) => r.load === "low")
                  .map((r) => new Date(r.date)),
                medium: slotData.recommendations
                  .filter((r) => r.load === "medium")
                  .map((r) => new Date(r.date)),
                high: slotData.recommendations
                  .filter((r) => r.load === "high")
                  .map((r) => new Date(r.date)),
              } : undefined}
              modifiersStyles={{
                low: { backgroundColor: "hsl(142 76% 36% / 0.15)", borderRadius: "50%" },
                medium: { backgroundColor: "hsl(38 92% 50% / 0.15)", borderRadius: "50%" },
                high: { backgroundColor: "hsl(0 84% 60% / 0.15)", borderRadius: "50%" },
              }}
            />
          </PopoverContent>
        </Popover>
      )}

      {selected && (selected !== "custom" || customDate) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            → {format(getPreviewDate(selected, customDate), "EEEE, MMM d, yyyy")}
          </span>
          <Button
            size="sm"
            onClick={handleBook}
            disabled={followUp.isPending}
            className="h-7 text-xs"
          >
            {followUp.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <CalendarPlus className="h-3 w-3 mr-1" />
            )}
            Book Follow-Up
          </Button>
        </div>
      )}
    </div>
  );
}
