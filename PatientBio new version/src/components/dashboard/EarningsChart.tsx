import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, subMonths, startOfMonth } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import type { DataTransaction } from "@/hooks/usePatientWallet";

interface EarningsChartProps {
  transactions: DataTransaction[];
  isLoading?: boolean;
}

export const EarningsChart = ({ transactions, isLoading }: EarningsChartProps) => {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; earned: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      months.push({ key: format(monthStart, "yyyy-MM"), label: format(monthStart, "MMM"), earned: 0 });
    }
    transactions.forEach((tx) => {
      const key = format(new Date(tx.created_at), "yyyy-MM");
      const month = months.find((m) => m.key === key);
      if (month) month.earned += Number(tx.tokens_earned);
    });
    return months.map((m) => ({ name: m.label, earned: parseFloat(m.earned.toFixed(2)) }));
  }, [transactions]);

  if (isLoading) return (<Card><CardHeader className="pb-2"><Skeleton className="h-5 w-40" /></CardHeader><CardContent><Skeleton className="h-[180px] w-full" /></CardContent></Card>);
  if (!chartData.some((d) => d.earned > 0)) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />{t("walletDetails.earningsTrend")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs><linearGradient id="earnedGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
            <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: "0.875rem" }} formatter={(value: number) => [`${value} PBIO`, t("walletDetails.earned")]} />
            <Area type="monotone" dataKey="earned" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#earnedGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};