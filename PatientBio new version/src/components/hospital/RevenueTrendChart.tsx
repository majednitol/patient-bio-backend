import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSkeleton, useRechartsComponents } from "@/components/shared/LazyChart";
import { DollarSign, TrendingUp } from "lucide-react";
import { format, subDays, eachDayOfInterval } from "date-fns";

interface Props {
  hospitalId: string;
}

export default function RevenueTrendChart({ hospitalId }: Props) {
  const { components, isLoading: chartsLoading } = useRechartsComponents();

  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["revenue-trend-dashboard", hospitalId],
    queryFn: async () => {
      const startDate = subDays(new Date(), 30);

      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("invoice_date, total_amount, amount_paid, status")
        .eq("hospital_id", hospitalId)
        .gte("invoice_date", startDate.toISOString());

      if (error) throw error;

      const interval = eachDayOfInterval({
        start: startDate,
        end: new Date(),
      });

      let cumCollected = 0;
      let cumPending = 0;

      const trend = interval.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayInvoices = (invoices || []).filter(
          (inv) => format(new Date(inv.invoice_date), "yyyy-MM-dd") === dayStr
        );

        const collected = dayInvoices.reduce((s, inv) => s + (inv.amount_paid || 0), 0);
        const pending = dayInvoices.reduce(
          (s, inv) => s + ((inv.total_amount || 0) - (inv.amount_paid || 0)),
          0
        );

        cumCollected += collected;
        cumPending += pending;

        return {
          date: format(day, "MMM d"),
          collected,
          pending,
          cumCollected,
          cumPending,
        };
      });

      const totalCollected = (invoices || []).reduce((s, inv) => s + (inv.amount_paid || 0), 0);
      const totalPending = (invoices || []).reduce(
        (s, inv) => s + ((inv.total_amount || 0) - (inv.amount_paid || 0)),
        0
      );

      return { trend, totalCollected, totalPending };
    },
    enabled: !!hospitalId,
  });

  if (isLoading || chartsLoading) {
    return <ChartSkeleton height={320} />;
  }

  if (!revenueData || !components) return null;

  const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } = components;
  const { trend, totalCollected, totalPending } = revenueData;

  const formatCurrency = (v: number) => `৳${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}K`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Trend
            </CardTitle>
            <CardDescription>30-day cumulative revenue breakdown</CardDescription>
          </div>
          <div className="text-right flex gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="text-lg font-bold text-green-600">
                ৳{totalCollected.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold text-amber-600">
                ৳{totalPending.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCurrency} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  `৳${value.toLocaleString()}`,
                  name === "cumCollected" ? "Collected" : "Pending",
                ]}
              />
              <Legend
                formatter={(value: string) =>
                  value === "cumCollected" ? "Collected" : "Pending"
                }
              />
              <Area
                type="monotone"
                dataKey="cumCollected"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#collectedGrad)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="cumPending"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#pendingGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
