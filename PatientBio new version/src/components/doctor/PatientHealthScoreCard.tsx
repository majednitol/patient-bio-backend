import React from "react";
import { usePatientHealthScore } from "@/hooks/usePatientHealthScore";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface PatientHealthScoreCardProps {
  patientId: string;
  className?: string;
}

const BREAKDOWN_ITEMS = [
  { key: "coverage" as const, label: "Coverage", max: 25 },
  { key: "inRange" as const, label: "In Range", max: 35 },
  { key: "trend" as const, label: "Trend", max: 25 },
  { key: "consistency" as const, label: "Consistency", max: 15 },
];

export const PatientHealthScoreCard = React.memo(({ patientId, className }: PatientHealthScoreCardProps) => {
  const { data, isLoading } = usePatientHealthScore(patientId);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
        <div className="space-y-1">
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          <div className="h-2.5 w-12 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Activity className="h-4 w-4" />
        <span className="text-xs">No health score data</span>
      </div>
    );
  }

  const { score, breakdown, label, color, scoreChange, trackedTypes } = data;

  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const gradientColors =
    score >= 80
      ? ["hsl(142 76% 36%)", "hsl(160 60% 45%)"]
      : score >= 60
        ? ["hsl(217 91% 60%)", "hsl(199 89% 48%)"]
        : score >= 40
          ? ["hsl(45 93% 47%)", "hsl(36 100% 50%)"]
          : ["hsl(0 72% 51%)", "hsl(15 75% 55%)"];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                <defs>
                  <linearGradient id="patientGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={gradientColors[0]} />
                    <stop offset="100%" stopColor={gradientColors[1]} />
                  </linearGradient>
                </defs>
                <circle
                  cx={size / 2} cy={size / 2} r={radius}
                  fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth}
                />
                <circle
                  cx={size / 2} cy={size / 2} r={radius}
                  fill="none" stroke="url(#patientGaugeGrad)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold">{score}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className={`text-xs font-medium ${color}`}>{label}</span>
                {scoreChange !== null && scoreChange !== 0 && (
                  <Badge
                    variant={scoreChange > 0 ? "default" : "destructive"}
                    className="text-[9px] gap-0.5 px-1 py-0 h-4"
                  >
                    {scoreChange > 0 ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
                    {scoreChange > 0 ? "+" : ""}{scoreChange}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">{trackedTypes} metrics tracked</p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-52">
          <p className="font-semibold mb-2 text-xs">Patient Health Score Breakdown</p>
          {BREAKDOWN_ITEMS.map((item) => (
            <div key={item.key} className="mb-1.5">
              <div className="flex justify-between text-[11px] mb-0.5">
                <span>{item.label}</span>
                <span className="font-medium">{breakdown[item.key]}/{item.max}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1">
                <div
                  className="h-1 rounded-full bg-primary transition-all"
                  style={{ width: `${(breakdown[item.key] / item.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
