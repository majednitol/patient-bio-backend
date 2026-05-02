import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, TrendingUp, Receipt, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useCostEstimation } from "@/hooks/useCostEstimation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { generateSpendingReportPDF } from "@/utils/generateSpendingReportPDF";
import { format, parse } from "date-fns";
import { SpendingAlertBanner } from "./SpendingAlertBanner";

export function PatientSpendingOverview() {
  const { t } = useTranslation();
  const { useSpendingHistory } = useCostEstimation();
  const { data, isLoading } = useSpendingHistory();
  const { profile } = useUserProfile();

  if (isLoading) return (<Card><CardHeader><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-56 mt-1" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>);
  if (!data || data.invoiceCount === 0) return null;

  const chartData = data.byMonth.slice(-6).map((m) => ({ ...m, label: format(parse(m.month, "yyyy-MM", new Date()), "MMM yy") }));

  const handleDownloadPDF = () => {
    generateSpendingReportPDF({ totalSpent: data.totalSpent, byMonth: data.byMonth, invoiceCount: data.invoiceCount, patientName: profile?.display_name || "Patient" });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10"><Receipt className="h-4 w-4 text-primary" /></div>
            <div>
              <CardTitle className="text-base">{t("walletDetails.mySpending")}</CardTitle>
              <CardDescription className="text-xs">{t("walletDetails.healthcareCosts")}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 text-xs"><Banknote className="h-3 w-3" />৳{data.totalSpent.toLocaleString("en-BD")} {t("walletDetails.total")}</Badge>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleDownloadPDF} title={t("walletDetails.downloadReport")}><Download className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="mt-2"><SpendingAlertBanner /></div>
      </CardHeader>
      <CardContent>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={50} tickFormatter={(v) => `৳${v}`} />
              <Tooltip formatter={(value: number, name: string) => [`৳${value.toLocaleString("en-BD")}`, name]} contentStyle={{ fontSize: 12 }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="consultation" stackId="a" fill="hsl(var(--primary))" name={t("walletDetails.consultation")} radius={[0, 0, 0, 0]} />
              <Bar dataKey="medication" stackId="a" fill="hsl(var(--secondary))" name={t("walletDetails.medication")} />
              <Bar dataKey="lab_test" stackId="a" fill="hsl(var(--accent))" name={t("walletDetails.labTests")} />
              <Bar dataKey="other" stackId="a" fill="hsl(var(--muted))" name={t("records.other")} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">৳{data.totalSpent.toLocaleString("en-BD")}</p>
              <p className="text-xs text-muted-foreground">{t("walletDetails.invoicesOnRecord", { count: data.invoiceCount })}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}