import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useRechartsComponents, ChartSkeleton } from "@/components/shared/LazyChart";
import { Save, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CorrelationMatrix } from "./CorrelationMatrix";

interface CorrelationAnalysisProps {
  patientData: any[];
  onSaveChart: (chart: any) => void;
}

function calcPValue(r: number, n: number): number {
  if (n < 3 || Math.abs(r) >= 1) return 0;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;
  // Approximation using beta incomplete function simplification
  const x = df / (df + t * t);
  // Simple p-value approximation
  const p = Math.exp(-0.5 * t * t) * Math.sqrt(2 / (Math.PI * df));
  return Math.min(1, Math.max(0, p * 2)); // two-tailed
}

function linearRegression(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { slope: 0, intercept: 0 };
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    den += (x[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

export const CorrelationAnalysis = ({ patientData, onSaveChart }: CorrelationAnalysisProps) => {
  const { t } = useTranslation();
  const [variable1, setVariable1] = useState("age");
  const [variable2, setVariable2] = useState("blood_pressure_systolic");
  const [chartName, setChartName] = useState(t("correlationAnalysis.analysisNamePlaceholder"));

  const NUMERIC_VARIABLES = [
    { value: "age", label: t("correlationAnalysis.age") },
    { value: "blood_pressure_systolic", label: t("correlationAnalysis.bpSystolic") },
    { value: "blood_pressure_diastolic", label: t("correlationAnalysis.bpDiastolic") },
    { value: "weight", label: t("correlationAnalysis.weight") },
    { value: "height", label: t("correlationAnalysis.height") },
  ];

  const { components: recharts, isLoading: rechartsLoading } = useRechartsComponents();

  const getValues = (variable: string) =>
    patientData.map((p) => parseFloat(p[variable])).filter((v) => !isNaN(v));

  const calculateCorrelation = () => {
    const values1 = getValues(variable1);
    const values2 = getValues(variable2);
    if (values1.length < 2 || values1.length !== values2.length) return 0;
    const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
    const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;
    const numerator = values1.reduce((sum, v1, i) => sum + (v1 - mean1) * (values2[i] - mean2), 0);
    const denominator = Math.sqrt(
      values1.reduce((sum, v1) => sum + (v1 - mean1) ** 2, 0) *
      values2.reduce((sum, v2) => sum + (v2 - mean2) ** 2, 0)
    );
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const prepareScatterData = () => {
    return patientData
      .map((p) => ({ x: parseFloat(p[variable1]) || 0, y: parseFloat(p[variable2]) || 0 }))
      .filter((d) => !isNaN(d.x) && !isNaN(d.y))
      .slice(0, 200);
  };

  const correlation = calculateCorrelation();
  const scatterData = prepareScatterData();
  const pValue = calcPValue(correlation, scatterData.length);
  const regression = linearRegression(
    scatterData.map((d) => d.x),
    scatterData.map((d) => d.y)
  );

  // Generate regression line points
  const xVals = scatterData.map((d) => d.x);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);
  const regressionLine = [
    { x: xMin, y: regression.slope * xMin + regression.intercept },
    { x: xMax, y: regression.slope * xMax + regression.intercept },
  ];

  const getCorrelationStrength = (r: number) => {
    const abs = Math.abs(r);
    if (abs < 0.3) return { label: t("correlationAnalysis.weak"), color: "text-orange-500" };
    if (abs < 0.7) return { label: t("correlationAnalysis.moderate"), color: "text-blue-500" };
    return { label: t("correlationAnalysis.strong"), color: "text-green-500" };
  };

  const strength = getCorrelationStrength(correlation);

  const handleExportPNG = async () => {
    try {
      const element = document.getElementById("correlation-export-area");
      if (!element) return;
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(element, { backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${chartName}-${Date.now()}.png`;
      link.click();
      toast({ title: t("correlationAnalysis.chartExported"), description: t("correlationAnalysis.correlationExported") });
    } catch (error) {
      toast({ title: t("correlationAnalysis.exportFailed"), description: t("correlationAnalysis.exportFailedDesc"), variant: "destructive" });
    }
  };

  const handleSave = () => {
    onSaveChart({
      name: chartName,
      type: "scatter",
      config: { variable1, variable2 },
    });
    setChartName(t("correlationAnalysis.analysisNamePlaceholder"));
  };

  const handleSelectPair = (v1: string, v2: string) => {
    setVariable1(v1);
    setVariable2(v2);
  };

  const renderScatterChart = () => {
    if (rechartsLoading || !recharts) return <ChartSkeleton height={400} />;
    const { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } = recharts;
    return (
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" name={variable1} type="number" />
          <YAxis dataKey="y" name={variable2} type="number" />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Legend />
          <Scatter name="Data Points" data={scatterData} fill="hsl(var(--primary))" />
          <Line
            name="Trend Line"
            data={regressionLine}
            dataKey="y"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            legendType="line"
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      {/* Correlation Matrix */}
      <CorrelationMatrix
        patientData={patientData}
        variables={NUMERIC_VARIABLES}
        onSelectPair={handleSelectPair}
      />

      {/* Detailed scatter view */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">{t("correlationAnalysis.correlationSetup")}</CardTitle>
            <CardDescription>{t("correlationAnalysis.selectVariables")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="analysis-name">{t("correlationAnalysis.analysisName")}</Label>
              <Input id="analysis-name" value={chartName} onChange={(e) => setChartName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="var1">{t("correlationAnalysis.variable1")}</Label>
              <Select value={variable1} onValueChange={setVariable1}>
                <SelectTrigger id="var1"><SelectValue /></SelectTrigger>
                <SelectContent>{NUMERIC_VARIABLES.map((v) => (<SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="var2">{t("correlationAnalysis.variable2")}</Label>
              <Select value={variable2} onValueChange={setVariable2}>
                <SelectTrigger id="var2"><SelectValue /></SelectTrigger>
                <SelectContent>{NUMERIC_VARIABLES.map((v) => (<SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="pt-4 space-y-2">
              <Button onClick={handleSave} className="w-full" variant="default"><Save className="h-4 w-4 mr-2" />{t("correlationAnalysis.saveAnalysis")}</Button>
              <Button onClick={handleExportPNG} className="w-full" variant="outline"><Download className="h-4 w-4 mr-2" />{t("correlationAnalysis.exportPng")}</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">{chartName}</CardTitle>
            <CardDescription>{t("correlationAnalysis.correlationDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">{t("correlationAnalysis.correlationR")}</p>
                  <p className="text-2xl font-bold">{correlation.toFixed(3)}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">{t("correlationAnalysis.rSquared")}</p>
                  <p className="text-2xl font-bold">{(correlation ** 2).toFixed(3)}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">p-value</p>
                  <p className="text-2xl font-bold">{pValue < 0.001 ? "< 0.001" : pValue.toFixed(3)}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">{t("correlationAnalysis.strength")}</p>
                  <p className={`text-lg font-bold ${strength.color}`}>{strength.label}</p>
                </CardContent>
              </Card>
            </div>

            <div id="correlation-export-area" className="bg-white p-4 rounded-lg">
              {scatterData.length > 0 ? renderScatterChart() : (
                <div className="h-96 flex items-center justify-center bg-muted/50 rounded text-muted-foreground">{t("correlationAnalysis.noCorrelationData")}</div>
              )}
            </div>

            {correlation !== 0 && (
              <div className="p-4 bg-muted/50 rounded-lg text-sm">
                <p className="font-semibold mb-2">{t("correlationAnalysis.interpretation")}</p>
                <p className="text-muted-foreground">
                  {Math.abs(correlation) < 0.3
                    ? t("correlationAnalysis.weakInterp")
                    : Math.abs(correlation) < 0.7
                      ? t("correlationAnalysis.moderateInterp")
                      : t("correlationAnalysis.strongInterp")}
                  {" "}Regression: y = {regression.slope.toFixed(3)}x + {regression.intercept.toFixed(3)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
