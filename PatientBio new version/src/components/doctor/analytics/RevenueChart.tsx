import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Area, Bar } from "recharts";
import { DollarSign } from "lucide-react";
import { tooltipStyle } from "./AnalyticsChartTypes";

interface Props {
  data: { date: string; daily: number; cumulative: number }[];
  consultationFee: number;
}

export function RevenueChart({ data, consultationFee }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Revenue Trend (Last 30 Days)
          {consultationFee > 0 && (
            <Badge variant="outline" className="ml-auto text-xs">
              ৳{consultationFee}/visit
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {consultationFee > 0
            ? `Estimated from completed appointments × ৳${consultationFee} consultation fee`
            : "Set your consultation fee in Profile to track revenue"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {consultationFee > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v) => `৳${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`৳${value.toLocaleString()}`, ""]} />
              <Legend />
              <Area type="monotone" dataKey="cumulative" name="Cumulative" stroke="hsl(var(--primary))" fill="url(#revenueGradient)" strokeWidth={2} />
              <Bar dataKey="daily" name="Daily" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} opacity={0.7} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
            <DollarSign className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Set your consultation fee in your Profile</p>
            <p className="text-xs">to start tracking revenue estimates</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
