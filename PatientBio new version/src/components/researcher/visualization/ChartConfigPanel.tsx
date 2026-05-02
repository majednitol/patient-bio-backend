import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRechartsComponents, ChartSkeleton } from "@/components/shared/LazyChart";
import { Download, Save, FileDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ChartConfigPanelProps {
  shares: any[];
  patientData: any[];
  onSaveChart: (chart: any) => void;
}

const COLOR_PALETTES: Record<string, string[]> = {
  default: ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"],
  warm: ["hsl(0 70% 55%)", "hsl(25 80% 55%)", "hsl(45 90% 50%)", "hsl(15 75% 60%)", "hsl(35 85% 45%)"],
  cool: ["hsl(200 70% 50%)", "hsl(220 65% 55%)", "hsl(180 60% 45%)", "hsl(240 55% 60%)", "hsl(260 50% 55%)"],
  mono: ["hsl(220 10% 30%)", "hsl(220 10% 45%)", "hsl(220 10% 55%)", "hsl(220 10% 65%)", "hsl(220 10% 75%)"],
  accessible: ["hsl(210 80% 50%)", "hsl(30 90% 55%)", "hsl(120 40% 45%)", "hsl(0 70% 55%)", "hsl(270 50% 55%)"],
};

export const ChartConfigPanel = ({ shares, patientData, onSaveChart }: ChartConfigPanelProps) => {
  const { t } = useTranslation();
  const [chartType, setChartType] = useState<"bar" | "pie" | "line" | "scatter">("bar");
  const [xAxis, setXAxis] = useState("disease_category");
  const [yAxis, setYAxis] = useState("share_count");
  const [chartName, setChartName] = useState(t("chartConfig.chartNamePlaceholder"));
  const [palette, setPalette] = useState("default");
  const [aggregation, setAggregation] = useState<"count" | "percentage">("count");

  const CHART_TYPES = [
    { value: "bar", label: t("chartConfig.barChart") },
    { value: "pie", label: t("chartConfig.pieChart") },
    { value: "line", label: t("chartConfig.lineChart") },
    { value: "scatter", label: t("chartConfig.scatterPlot") },
  ];

  const DATA_DIMENSIONS = [
    { value: "disease_category", label: t("chartConfig.diseaseCategory") },
    { value: "gender", label: t("chartConfig.gender") },
    { value: "age_group", label: t("chartConfig.ageGroup") },
    { value: "blood_group", label: t("chartConfig.bloodGroup") },
    { value: "share_count", label: t("chartConfig.dataSharesCount") },
    { value: "anonymization_status", label: "Anonymization Status" },
    { value: "share_month", label: "Share Month" },
  ];

  const { components: recharts, isLoading: rechartsLoading } = useRechartsComponents();

  const prepareChartData = () => {
    const dataMap: Record<string, number> = {};
    if (xAxis === "disease_category") {
      shares.forEach((s) => { const cat = s.disease_category || "General"; dataMap[cat] = (dataMap[cat] || 0) + 1; });
    } else if (xAxis === "gender") {
      patientData.forEach((p) => { const gender = p.gender || "Unknown"; dataMap[gender] = (dataMap[gender] || 0) + 1; });
    } else if (xAxis === "blood_group") {
      patientData.forEach((p) => { const bg = p.blood_group || "Unknown"; dataMap[bg] = (dataMap[bg] || 0) + 1; });
    } else if (xAxis === "anonymization_status") {
      shares.forEach((s) => { const key = s.is_anonymized ? "Anonymized" : "Identified"; dataMap[key] = (dataMap[key] || 0) + 1; });
    } else if (xAxis === "share_month") {
      shares.forEach((s) => {
        const key = s.shared_at ? format(new Date(s.shared_at), "yyyy-MM") : "Unknown";
        dataMap[key] = (dataMap[key] || 0) + 1;
      });
    }

    const total = Object.values(dataMap).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(dataMap)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "),
        value: aggregation === "percentage" ? Math.round((value / total) * 100 * 10) / 10 : value,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const chartData = prepareChartData();
  const COLORS = COLOR_PALETTES[palette] || COLOR_PALETTES.default;

  const renderChart = () => {
    if (rechartsLoading || !recharts) return <ChartSkeleton height={400} />;
    const { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = recharts;
    const yLabel = aggregation === "percentage" ? "%" : "Count";

    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: yLabel, angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={COLORS[0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name} (${entry.value}${aggregation === "percentage" ? "%" : ""})`} dataKey="value">
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: yLabel, angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" name="Category" />
              <YAxis dataKey="value" name={yLabel} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter name="Data" data={chartData} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const handleExportCSV = () => {
    if (chartData.length === 0) return;
    const header = "Category,Value\n";
    const rows = chartData.map((d) => `"${d.name}",${d.value}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${chartName}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "CSV exported" });
  };

  const handleExportPNG = async () => {
    try {
      const element = document.getElementById("chart-export-area");
      if (!element) return;
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(element, { backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${chartName}-${Date.now()}.png`;
      link.click();
      toast({ title: t("chartConfig.chartExported"), description: t("chartConfig.chartExportedDesc") });
    } catch (error) {
      toast({ title: t("chartConfig.exportFailed"), description: t("chartConfig.exportFailedDesc"), variant: "destructive" });
    }
  };

  const handleSave = () => {
    onSaveChart({
      name: chartName,
      type: chartType,
      config: { xAxis, yAxis, palette, aggregation },
    });
    setChartName(t("chartConfig.chartNamePlaceholder"));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">{t("chartConfig.chartConfiguration")}</CardTitle>
          <CardDescription>{t("chartConfig.customizeVisualization")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chart-name">{t("chartConfig.chartName")}</Label>
            <Input id="chart-name" value={chartName} onChange={(e) => setChartName(e.target.value)} placeholder={t("chartConfig.chartNamePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chart-type">{t("chartConfig.chartType")}</Label>
            <Select value={chartType} onValueChange={(v) => setChartType(v as any)}>
              <SelectTrigger id="chart-type"><SelectValue /></SelectTrigger>
              <SelectContent>{CHART_TYPES.map((ct) => (<SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="x-axis">{t("chartConfig.xAxisDimension")}</Label>
            <Select value={xAxis} onValueChange={setXAxis}>
              <SelectTrigger id="x-axis"><SelectValue /></SelectTrigger>
              <SelectContent>{DATA_DIMENSIONS.map((d) => (<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Color Palette</Label>
            <Select value={palette} onValueChange={setPalette}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cool">Cool</SelectItem>
                <SelectItem value="mono">Monochrome</SelectItem>
                <SelectItem value="accessible">Accessible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Aggregation</Label>
            <Select value={aggregation} onValueChange={(v) => setAggregation(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="count">Count</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-4 space-y-2">
            <Button onClick={handleSave} className="w-full" variant="default"><Save className="h-4 w-4 mr-2" />{t("chartConfig.saveChart")}</Button>
            <Button onClick={handleExportPNG} className="w-full" variant="outline"><Download className="h-4 w-4 mr-2" />{t("chartConfig.exportPng")}</Button>
            <Button onClick={handleExportCSV} className="w-full" variant="outline"><FileDown className="h-4 w-4 mr-2" />Export CSV</Button>
          </div>
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg">{chartName}</CardTitle>
          <CardDescription>{t("chartConfig.livePreview")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div id="chart-export-area" className="bg-white p-4 rounded-lg">
            {chartData.length > 0 ? renderChart() : (
              <div className="h-96 flex items-center justify-center bg-muted/50 rounded text-muted-foreground">{t("chartConfig.noData")}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
