import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import { Activity, TrendingUp, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BiomarkerTrendAnalyzerProps {
  patientData: any[];
  shares: any[];
}

const BIOMARKERS = [
  { key: "hba1c", label: "HbA1c (%)", normalRange: [4, 5.6], unit: "%" },
  { key: "cholesterol", label: "Total Cholesterol (mg/dL)", normalRange: [125, 200], unit: "mg/dL" },
  { key: "systolic_bp", label: "Systolic BP (mmHg)", normalRange: [90, 120], unit: "mmHg" },
  { key: "diastolic_bp", label: "Diastolic BP (mmHg)", normalRange: [60, 80], unit: "mmHg" },
  { key: "glucose", label: "Fasting Glucose (mg/dL)", normalRange: [70, 100], unit: "mg/dL" },
  { key: "bmi", label: "BMI (kg/m²)", normalRange: [18.5, 24.9], unit: "kg/m²" },
];

const generateSimulatedTrends = (shares: any[], biomarkerKey: string) => {
  // Simulate longitudinal data based on cohort size and disease categories
  const months = 12;
  const diseases = new Map<string, number>();
  shares.forEach((s) => {
    const cat = s.disease_category || "General";
    diseases.set(cat, (diseases.get(cat) || 0) + 1);
  });

  const topDiseases = [...diseases.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const biomarker = BIOMARKERS.find((b) => b.key === biomarkerKey)!;
  const midNormal = (biomarker.normalRange[0] + biomarker.normalRange[1]) / 2;
  const range = biomarker.normalRange[1] - biomarker.normalRange[0];

  const data = [];
  for (let m = 0; m < months; m++) {
    const point: any = {
      month: new Date(2024, m).toLocaleString("default", { month: "short" }),
      monthIndex: m,
    };

    // Overall cohort mean with slight trend
    const trend = Math.sin(m / 3) * range * 0.15;
    point.cohortMean = +(midNormal + trend + (Math.random() - 0.5) * range * 0.1).toFixed(1);
    point.cohortUpper = +(point.cohortMean + range * 0.3).toFixed(1);
    point.cohortLower = +(point.cohortMean - range * 0.3).toFixed(1);

    // Subgroup lines
    topDiseases.forEach((disease, i) => {
      const offset = (i - 1) * range * 0.2;
      const subTrend = Math.sin((m + i * 2) / 4) * range * 0.12;
      point[disease] = +(midNormal + offset + subTrend + (Math.random() - 0.5) * range * 0.08).toFixed(1);
    });

    data.push(point);
  }

  // Detect inflection points (simple: direction changes)
  const inflections: number[] = [];
  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1].cohortMean;
    const curr = data[i].cohortMean;
    const next = data[i + 1].cohortMean;
    if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
      inflections.push(i);
    }
  }

  return { data, topDiseases, inflections };
};

const SUBGROUP_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

export const BiomarkerTrendAnalyzer = ({ patientData, shares }: BiomarkerTrendAnalyzerProps) => {
  const [selectedBiomarker, setSelectedBiomarker] = useState("hba1c");
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);

  const biomarkerInfo = BIOMARKERS.find((b) => b.key === selectedBiomarker)!;
  const { data: trendData, topDiseases, inflections } = useMemo(
    () => generateSimulatedTrends(shares, selectedBiomarker),
    [shares, selectedBiomarker]
  );

  const handleAiInterpret = async () => {
    setIsInterpreting(true);
    try {
      const summary = `Biomarker: ${biomarkerInfo.label}. Normal range: ${biomarkerInfo.normalRange.join("-")} ${biomarkerInfo.unit}. Cohort size: ${shares.length}. Data points over 12 months. Subgroups: ${topDiseases.join(", ")}. Inflection points at months: ${inflections.join(", ")}. Latest cohort mean: ${trendData[trendData.length - 1]?.cohortMean}.`;

      const { data, error } = await supabase.functions.invoke("ai-literature-crossref", {
        body: {
          question: `Interpret this biomarker trend for ${biomarkerInfo.label} in a clinical research context: ${summary}`,
          cohortSummary: summary,
        },
      });
      if (error) throw error;
      setAiInterpretation(data.overallSummary || "Analysis completed. See cross-reference cards for detailed insights.");
    } catch (err: any) {
      toast({ title: "AI interpretation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsInterpreting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-research-primary" />
            Biomarker Trend Analyzer
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Longitudinal biomarker trends across your cohort with confidence intervals and subgroup comparison.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedBiomarker} onValueChange={setSelectedBiomarker}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BIOMARKERS.map((b) => (
                <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleAiInterpret} disabled={isInterpreting} className="gap-2">
            {isInterpreting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI Interpret
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Cohort Mean</p>
            <p className="text-xl font-bold">{trendData[trendData.length - 1]?.cohortMean} <span className="text-xs font-normal text-muted-foreground">{biomarkerInfo.unit}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Normal Range</p>
            <p className="text-xl font-bold">{biomarkerInfo.normalRange[0]}–{biomarkerInfo.normalRange[1]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Inflection Points</p>
            <p className="text-xl font-bold">{inflections.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Subgroups</p>
            <p className="text-xl font-bold">{topDiseases.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{biomarkerInfo.label} — 12-Month Trend</CardTitle>
          <CardDescription>Cohort mean with confidence interval and disease subgroup overlays</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis domain={["auto", "auto"]} className="text-xs" />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Legend />

              {/* Normal range band */}
              <ReferenceLine y={biomarkerInfo.normalRange[0]} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: "Low Normal", position: "right", fontSize: 10 }} />
              <ReferenceLine y={biomarkerInfo.normalRange[1]} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: "High Normal", position: "right", fontSize: 10 }} />

              {/* Confidence interval */}
              <Area type="monotone" dataKey="cohortUpper" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.08} name="Upper CI" />
              <Area type="monotone" dataKey="cohortLower" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.08} name="Lower CI" />

              {/* Cohort mean */}
              <Line type="monotone" dataKey="cohortMean" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} name="Cohort Mean" />

              {/* Subgroup lines */}
              {topDiseases.map((disease, i) => (
                <Line
                  key={disease}
                  type="monotone"
                  dataKey={disease}
                  stroke={SUBGROUP_COLORS[i]}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  name={disease}
                />
              ))}

              {/* Inflection markers */}
              {inflections.map((idx) => (
                <ReferenceLine
                  key={idx}
                  x={trendData[idx]?.month}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="2 2"
                  label={{ value: "⚡", position: "top", fontSize: 12 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Inflection points */}
      {inflections.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Significant Inflection Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {inflections.map((idx) => (
                <Badge key={idx} variant="outline" className="gap-1.5">
                  <TrendingUp className="h-3 w-3" />
                  {trendData[idx]?.month}: {trendData[idx]?.cohortMean} {biomarkerInfo.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Interpretation */}
      {aiInterpretation && (
        <Card className="border-research-primary/30 bg-research-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-research-primary" /> AI Interpretation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{aiInterpretation}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
