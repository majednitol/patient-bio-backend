import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Timer, TrendingUp, TrendingDown, Minus } from "lucide-react";

// Specialty average durations (minutes) — industry benchmarks
const SPECIALTY_BENCHMARKS: Record<string, number> = {
  "General Medicine": 15,
  "Internal Medicine": 20,
  "Cardiology": 20,
  "Dermatology": 12,
  "Pediatrics": 15,
  "Orthopedics": 18,
  "Gynecology": 18,
  "Psychiatry": 30,
  "Neurology": 22,
  "ENT": 14,
  "Ophthalmology": 12,
  "Pulmonology": 18,
  "Gastroenterology": 18,
  "Endocrinology": 20,
  "Nephrology": 18,
  "Urology": 15,
  "Oncology": 25,
};

const DEFAULT_BENCHMARK = 15;

interface DurationBenchmarkCardProps {
  avgDuration: number; // doctor's avg in minutes
  specialty?: string | null;
}

export function DurationBenchmarkCard({ avgDuration, specialty }: DurationBenchmarkCardProps) {
  if (!avgDuration) return null;

  const benchmarkKey = specialty
    ? Object.keys(SPECIALTY_BENCHMARKS).find(
        (k) => k.toLowerCase() === specialty.toLowerCase()
      )
    : undefined;
  const benchmark = benchmarkKey
    ? SPECIALTY_BENCHMARKS[benchmarkKey]
    : DEFAULT_BENCHMARK;

  const diff = avgDuration - benchmark;
  const diffPct = Math.round((diff / benchmark) * 100);
  const ratio = Math.min(100, Math.round((avgDuration / (benchmark * 2)) * 100));

  const isEfficient = diff < -2;
  const isOver = diff > 2;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          Duration Benchmark
          {specialty && (
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {specialty}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Your Average
            </p>
            <p className="text-2xl font-bold">{avgDuration}m</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Specialty Avg
            </p>
            <p className="text-2xl font-bold text-muted-foreground">{benchmark}m</p>
          </div>
        </div>

        {/* Visual gauge */}
        <div className="space-y-1.5">
          <div className="relative">
            <Progress value={ratio} className="h-2.5" />
            {/* Benchmark marker */}
            <div
              className="absolute top-0 h-2.5 w-0.5 bg-foreground/60 rounded"
              style={{ left: `${Math.min(100, Math.round((benchmark / (benchmark * 2)) * 100))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>0m</span>
            <span>{benchmark * 2}m</span>
          </div>
        </div>

        {/* Verdict */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium ${
            isEfficient
              ? "bg-primary/10 text-primary"
              : isOver
              ? "bg-amber-500/10 text-amber-600"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isEfficient ? (
            <TrendingDown className="h-3 w-3" />
          ) : isOver ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {isEfficient
            ? `${Math.abs(diffPct)}% faster than specialty average`
            : isOver
            ? `${diffPct}% longer than specialty average`
            : "On par with specialty average"}
        </div>
      </CardContent>
    </Card>
  );
}
