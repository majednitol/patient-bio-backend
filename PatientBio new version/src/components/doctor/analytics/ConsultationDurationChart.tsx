import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from "recharts";
import { Timer } from "lucide-react";
import { tooltipStyle } from "./AnalyticsChartTypes";

interface Props {
  data: { date: string; duration: number }[];
  avgDuration: number;
}

export function ConsultationDurationChart({ data, avgDuration }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="animate-fade-in" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Consultation Duration Trend
            <Badge variant="secondary" className="ml-auto text-xs">
              Avg: {avgDuration}min
            </Badge>
          </CardTitle>
          <CardDescription>Duration of recent consultations (minutes)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} unit="m" />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} min`, "Duration"]} />
              <Area type="monotone" dataKey="duration" stroke="hsl(var(--chart-3))" fill="url(#durationGradient)" strokeWidth={2} dot={{ fill: "hsl(var(--chart-3))", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
