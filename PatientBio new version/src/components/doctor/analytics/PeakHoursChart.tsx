import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell } from "recharts";
import { Zap } from "lucide-react";
import { tooltipStyle } from "./AnalyticsChartTypes";

interface PeakHourEntry {
  hour: string;
  appointments: number;
}

interface Props {
  data: PeakHourEntry[];
  peakHour: PeakHourEntry | null;
}

export function PeakHoursChart({ data, peakHour }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Peak Hours
          {peakHour && peakHour.appointments > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              Busiest: {peakHour.hour}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Appointment distribution by hour of day</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="appointments" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry === peakHour ? "hsl(var(--primary))" : "hsl(var(--chart-2))"}
                  opacity={entry === peakHour ? 1 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
