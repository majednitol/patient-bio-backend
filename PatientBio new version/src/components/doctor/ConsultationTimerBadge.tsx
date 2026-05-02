import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConsultationTimerBadgeProps {
  startedAt: string | null;
  endedAt?: string | null;
  /** Average consultation duration in minutes. Enables color transitions. */
  averageDurationMinutes?: number;
  className?: string;
}

/**
 * Live consultation timer badge with optional duration-aware color cues.
 * Green = under average, Amber = 10-50% over, Red = 50%+ over.
 */
export function ConsultationTimerBadge({
  startedAt,
  endedAt,
  averageDurationMinutes,
  className,
}: ConsultationTimerBadgeProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!startedAt) return;

    const startTime = new Date(startedAt).getTime();

    if (endedAt) {
      setElapsedMs(new Date(endedAt).getTime() - startTime);
      return;
    }

    const update = () => setElapsedMs(Date.now() - startTime);
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt, endedAt]);

  const phase = useMemo(() => {
    if (!averageDurationMinutes || endedAt) return "default";
    const avgMs = averageDurationMinutes * 60 * 1000;
    if (elapsedMs <= avgMs) return "green";
    if (elapsedMs <= avgMs * 1.5) return "amber";
    return "red";
  }, [elapsedMs, averageDurationMinutes, endedAt]);

  if (!startedAt) return null;

  const isLive = !endedAt;
  const elapsed = formatDuration(elapsedMs);

  const colorClasses = isLive
    ? {
        default: "bg-primary/10 text-primary border-primary/30 animate-pulse",
        green: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
        amber: "bg-amber-500/10 text-amber-600 border-amber-500/30 animate-pulse",
        red: "bg-destructive/10 text-destructive border-destructive/30 animate-pulse",
      }[phase]
    : "bg-muted text-muted-foreground";

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] px-1.5 py-0 h-5 font-mono gap-1 transition-colors duration-700",
        colorClasses,
        className
      )}
    >
      <Timer className="h-3 w-3" />
      {elapsed}
    </Badge>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
