import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, BarChart, Bar, ReferenceLine
} from "recharts";
import { Brain, TrendingUp, Loader2, AlertTriangle, Beaker, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientResearcherShares } from "@/hooks/usePatientResearcherShares";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PREDICTOR_VARIABLES = [
  { key: "age", label: "Age" },
  { key: "gender", label: "Gender" },
  { key: "disease_category", label: "Disease Category" },
  { key: "medications", label: "Medications" },
  { key: "lab_values", label: "Lab Values" },
  { key: "bmi", label: "BMI" },
  { key: "blood_pressure", label: "Blood Pressure" },
  { key: "smoking_status", label: "Smoking Status" },
];

interface Subgroup {
  name: string;
  risk: number;
  sampleSize: number;
  confidenceInterval: [number, number];
}

interface Prediction {
  id: string;
  outcomeLabel: string;
  overallRisk: number;
  subgroups: Subgroup[];
  keyDrivers: string[];
  interpretation: string;
}

interface ForestPlotEntry {
  variable: string;
  oddsRatio: number;
  lower: number;
  upper: number;
  pValue: number;
}

interface WhatIfComparison {
  scenarioLabel: string;
  baselineRisk: number;
  scenarioRisk: number;
  riskReduction: number;
  interpretation: string;
}

interface PredictionResult {
  predictions: Prediction[];
  riskCurve: { year: number; cumulativeRisk: number; lower: number; upper: number }[];
  forestPlot: ForestPlotEntry[];
  whatIfComparison: WhatIfComparison | null;
  modelConfidence: string;
  limitations: string[];
  clinicalNote: string;
}

const OutcomePredictorPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { researcherShares } = usePatientResearcherShares();
  const [selectedVars, setSelectedVars] = useState<string[]>(["age", "disease_category", "medications"]);
  const [whatIfScenario, setWhatIfScenario] = useState("");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const toggleVariable = (key: string) => {
    setSelectedVars((prev) => prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]);
  };

  const buildCohortSummary = () => {
    const total = researcherShares.length;
    const diseases: Record<string, number> = {};
    researcherShares.forEach((s) => {
      const cat = s.disease_category || "Unspecified";
      diseases[cat] = (diseases[cat] || 0) + 1;
    });
    const anonymized = researcherShares.filter((s) => s.is_anonymized).length;
    return `Total patients: ${total}. Disease distribution: ${JSON.stringify(diseases)}. Anonymized: ${anonymized}/${total}.`;
  };

  const handlePredict = async () => {
    if (selectedVars.length === 0) {
      toast({ title: "Select at least one predictor variable", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-outcome-predictor", {
        body: {
          cohortSummary: buildCohortSummary(),
          selectedVariables: selectedVars,
          whatIfScenario: whatIfScenario.trim() || undefined,
        },
      });
      if (error) throw error;
      setResult(data as PredictionResult);
    } catch (err: any) {
      toast({ title: "Prediction failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const riskColor = (risk: number) => {
    if (risk >= 0.6) return "text-destructive";
    if (risk >= 0.3) return "text-amber-600 dark:text-amber-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Brain className="h-8 w-8 text-research-primary" />
          Cohort Outcome Predictor
        </h1>
        <p className="text-muted-foreground mt-2">
          AI-powered predictive modeling for clinical outcomes with "what-if" scenario simulation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Configuration Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Configuration</CardTitle>
            <CardDescription>Select predictor variables and optional scenario.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Predictor Variables</label>
              <div className="space-y-2">
                {PREDICTOR_VARIABLES.map((v) => (
                  <div key={v.key} className="flex items-center gap-2">
                    <Checkbox
                      id={v.key}
                      checked={selectedVars.includes(v.key)}
                      onCheckedChange={() => toggleVariable(v.key)}
                    />
                    <label htmlFor={v.key} className="text-sm cursor-pointer">{v.label}</label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                <Beaker className="h-4 w-4" /> What-If Scenario
              </label>
              <Input
                placeholder='e.g., "Exclude patients over 60"'
                value={whatIfScenario}
                onChange={(e) => setWhatIfScenario(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Optional: compare baseline vs. scenario outcomes.</p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <p className="font-medium">Cohort:</p>
              <p>{researcherShares.length} patients across {new Set(researcherShares.map((s) => s.disease_category || "General")).size} disease categories</p>
            </div>

            <Button onClick={handlePredict} disabled={isLoading || selectedVars.length === 0} className="w-full gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              {isLoading ? "Predicting..." : "Generate Predictions"}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-3 space-y-5">
          {!result && !isLoading && (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="py-16 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground text-lg">Configure predictors and run the outcome model</p>
                <p className="text-muted-foreground/60 text-sm mt-1">AI will generate risk curves, forest plots, and subgroup analysis.</p>
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <Card>
              <CardContent className="py-16 text-center">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-research-primary mb-4" />
                <p className="text-muted-foreground">Running predictive models on your cohort...</p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              {/* Confidence & Clinical Note */}
              <div className="flex items-center gap-3">
                <Badge variant={result.modelConfidence === "high" ? "default" : "secondary"}>
                  Model Confidence: {result.modelConfidence}
                </Badge>
                {result.clinicalNote && (
                  <p className="text-sm text-muted-foreground flex-1">{result.clinicalNote}</p>
                )}
              </div>

              {/* Prediction Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.predictions.map((pred) => (
                  <Card key={pred.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{pred.outcomeLabel}</CardTitle>
                        <span className={`text-2xl font-bold ${riskColor(pred.overallRisk)}`}>
                          {Math.round(pred.overallRisk * 100)}%
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Subgroup bars */}
                      {pred.subgroups.map((sg) => (
                        <div key={sg.name}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="truncate">{sg.name}</span>
                            <span className={`font-medium ${riskColor(sg.risk)}`}>{Math.round(sg.risk * 100)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${sg.risk * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            n={sg.sampleSize} · CI: {Math.round(sg.confidenceInterval[0] * 100)}–{Math.round(sg.confidenceInterval[1] * 100)}%
                          </p>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex flex-wrap gap-1">
                        {pred.keyDrivers.map((d) => (
                          <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{pred.interpretation}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Risk Curve */}
              {result.riskCurve?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Cumulative Risk Curve</CardTitle>
                    <CardDescription>Predicted outcome probability over time with confidence intervals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={result.riskCurve}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="year" label={{ value: "Years", position: "bottom", offset: -5 }} />
                        <YAxis tickFormatter={(v: number) => `${Math.round(v * 100)}%`} />
                        <Tooltip formatter={(v: number) => `${Math.round(v * 100)}%`} />
                        <Area type="monotone" dataKey="upper" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.1} name="Upper CI" />
                        <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.1} name="Lower CI" />
                        <Line type="monotone" dataKey="cumulativeRisk" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} name="Cumulative Risk" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Forest Plot */}
              {result.forestPlot?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Forest Plot — Odds Ratios</CardTitle>
                    <CardDescription>Effect size of each predictor variable on outcome</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(200, result.forestPlot.length * 50)}>
                      <BarChart data={result.forestPlot} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" domain={[0, "auto"]} />
                        <YAxis type="category" dataKey="variable" width={120} className="text-xs" />
                        <Tooltip formatter={(v: number) => v.toFixed(2)} />
                        <ReferenceLine x={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label="OR=1" />
                        <Bar dataKey="oddsRatio" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Odds Ratio" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1">
                      {result.forestPlot.map((fp) => (
                        <p key={fp.variable} className="text-xs text-muted-foreground">
                          <span className="font-medium">{fp.variable}:</span> OR {fp.oddsRatio.toFixed(2)} (CI: {fp.lower.toFixed(2)}–{fp.upper.toFixed(2)}), p={fp.pValue < 0.001 ? "<0.001" : fp.pValue.toFixed(3)}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* What-If Comparison */}
              {result.whatIfComparison && (
                <Card className="border-research-primary/30 bg-research-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ArrowRightLeft className="h-5 w-5" /> What-If Scenario Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{result.whatIfComparison.scenarioLabel}</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Baseline Risk</p>
                        <p className="text-2xl font-bold">{Math.round(result.whatIfComparison.baselineRisk * 100)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Scenario Risk</p>
                        <p className="text-2xl font-bold text-research-primary">{Math.round(result.whatIfComparison.scenarioRisk * 100)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Risk Reduction</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          -{Math.round(result.whatIfComparison.riskReduction * 100)}%
                        </p>
                      </div>
                    </div>
                    <p className="text-sm">{result.whatIfComparison.interpretation}</p>
                  </CardContent>
                </Card>
              )}

              {/* Limitations */}
              {result.limitations?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" /> Model Limitations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {result.limitations.map((lim, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">•</span> {lim}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutcomePredictorPage;
