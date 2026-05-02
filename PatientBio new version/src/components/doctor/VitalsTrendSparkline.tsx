import { usePatientVitalsHistory, PatientVitals } from "@/hooks/usePatientVitals";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Tooltip,
  YAxis,
} from "recharts";
import { format } from "date-fns";

interface VitalConfig {
  key: keyof PatientVitals;
  label: string;
  unit: string;
  color: string;
  normalMin?: number;
  normalMax?: number;
}

const VITALS_CONFIG: VitalConfig[] = [
  { key: "bp_systolic", label: "Systolic BP", unit: "mmHg", color: "hsl(var(--destructive))", normalMin: 90, normalMax: 140 },
  { key: "bp_diastolic", label: "Diastolic BP", unit: "mmHg", color: "hsl(var(--primary))", normalMin: 60, normalMax: 90 },
  { key: "heart_rate", label: "Heart Rate", unit: "bpm", color: "hsl(var(--destructive))", normalMin: 60, normalMax: 100 },
  { key: "spo2", label: "SpO₂", unit: "%", color: "hsl(var(--primary))", normalMin: 95, normalMax: 100 },
  { key: "temperature", label: "Temp", unit: "°F", color: "#f59e0b", normalMin: 97, normalMax: 99.5 },
  { key: "weight", label: "Weight", unit: "kg", color: "hsl(var(--muted-foreground))" },
];

function getStatusColor(value: number, config: VitalConfig): string {
  if (config.normalMin === undefined || config.normalMax === undefined) return "";
  if (value < config.normalMin || value > config.normalMax) return "text-destructive";
  return "text-green-600";
}

function SparklineChart({
  data,
  config,
}: {
  data: { value: number; date: string }[];
  config: VitalConfig;
}) {
  if (data.length === 0) return null;

  const latest = data[0];
  const statusColor = getStatusColor(latest.value, config);

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border bg-background hover:bg-muted/30 transition-colors">
      <div className="min-w-[80px]">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
          {config.label}
        </p>
        <p className={`text-sm font-bold ${statusColor}`}>
          {latest.value} <span className="text-[10px] font-normal text-muted-foreground">{config.unit}</span>
        </p>
      </div>
      <div className="flex-1 h-8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={[...data].reverse()}>
            <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
            {config.normalMax !== undefined && (
              <ReferenceLine y={config.normalMax} stroke="hsl(var(--destructive))" strokeDasharray="2 2" strokeOpacity={0.3} />
            )}
            {config.normalMin !== undefined && (
              <ReferenceLine y={config.normalMin} stroke="hsl(var(--destructive))" strokeDasharray="2 2" strokeOpacity={0.3} />
            )}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload;
                return (
                  <div className="bg-popover border rounded px-2 py-1 text-xs shadow-md">
                    <p className="font-medium">{p.value} {config.unit}</p>
                    <p className="text-muted-foreground">{p.date}</p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={1.5}
              dot={{ r: 2, fill: config.color }}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Badge variant="outline" className="text-[10px] px-1.5 h-5 shrink-0">
        {data.length}
      </Badge>
    </div>
  );
}

interface VitalsTrendSparklineProps {
  patientId: string | null | undefined;
  limit?: number;
  compact?: boolean;
}

export function VitalsTrendSparkline({ patientId, limit = 10, compact = false }: VitalsTrendSparklineProps) {
  const { data: vitals, isLoading } = usePatientVitalsHistory(patientId, limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vitals || vitals.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        No vitals history available
      </p>
    );
  }

  // Transform vitals into per-metric arrays
  const chartData = VITALS_CONFIG.map((config) => {
    const points = vitals
      .filter((v) => v[config.key] !== null && v[config.key] !== undefined)
      .map((v) => ({
        value: v[config.key] as number,
        date: format(new Date(v.recorded_at), "MMM d, HH:mm"),
      }));
    return { config, points };
  }).filter((d) => d.points.length > 0);

  if (chartData.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        No vitals data recorded
      </p>
    );
  }

  if (compact) {
    return (
      <div className="space-y-1.5">
        {chartData.slice(0, 4).map(({ config, points }) => (
          <SparklineChart key={config.key} data={points} config={config} />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4" />
          Vitals Trends
          <span className="text-xs font-normal text-muted-foreground">
            (last {vitals.length} readings)
          </span>
        </p>
        <div className="space-y-1.5">
          {chartData.map(({ config, points }) => (
            <SparklineChart key={config.key} data={points} config={config} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
