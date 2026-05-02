import { useState } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date;
  to: Date;
}

type PresetKey = "today" | "7d" | "30d" | "90d" | "custom";

interface Preset {
  key: PresetKey;
  label: string;
  getRange: () => DateRange;
}

const PRESETS: Preset[] = [
  { key: "today", label: "Today", getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { key: "7d", label: "7 days", getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { key: "30d", label: "30 days", getRange: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { key: "90d", label: "90 days", getRange: () => ({ from: startOfDay(subDays(new Date(), 89)), to: endOfDay(new Date()) }) },
];

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function useDateRangeFilter(defaultPreset: PresetKey = "30d") {
  const preset = PRESETS.find((p) => p.key === defaultPreset) || PRESETS[2];
  const [dateRange, setDateRange] = useState<DateRange>(preset.getRange());
  return { dateRange, setDateRange };
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>("30d");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePreset = (preset: Preset) => {
    setActivePreset(preset.key);
    onChange(preset.getRange());
  };

  const handleCustomSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from) {
      const newRange: DateRange = {
        from: startOfDay(range.from),
        to: range.to ? endOfDay(range.to) : endOfDay(range.from),
      };
      setActivePreset("custom");
      onChange(newRange);
      if (range.to) setCalendarOpen(false);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {PRESETS.map((preset) => (
        <Button
          key={preset.key}
          variant={activePreset === preset.key ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs px-2.5"
          onClick={() => handlePreset(preset)}
        >
          {preset.label}
        </Button>
      ))}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={activePreset === "custom" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-2.5 gap-1.5"
          >
            <CalendarIcon className="h-3 w-3" />
            {activePreset === "custom"
              ? `${format(value.from, "MMM d")} – ${format(value.to, "MMM d")}`
              : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: value.from, to: value.to }}
            onSelect={handleCustomSelect as any}
            numberOfMonths={2}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
