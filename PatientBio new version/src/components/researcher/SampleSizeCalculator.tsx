import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, Users, AlertTriangle, CheckCircle2 } from "lucide-react";

// Z-values for common significance levels (two-tailed)
const Z_ALPHA: Record<string, number> = {
  "0.01": 2.576,
  "0.05": 1.96,
  "0.10": 1.645,
};

// Z-values for power (one-tailed)
const Z_BETA: Record<string, number> = {
  "0.80": 0.842,
  "0.85": 1.036,
  "0.90": 1.282,
  "0.95": 1.645,
};

type StudyDesign = "two_sample" | "paired" | "one_proportion";

export const SampleSizeCalculator = ({ poolSize }: { poolSize: number }) => {
  const [effectSize, setEffectSize] = useState(0.5);
  const [alpha, setAlpha] = useState("0.05");
  const [power, setPower] = useState("0.80");
  const [design, setDesign] = useState<StudyDesign>("two_sample");

  const result = useMemo(() => {
    const zAlpha = Z_ALPHA[alpha] || 1.96;
    const zBeta = Z_BETA[power] || 0.842;

    let n: number;
    let perGroup: number;
    let total: number;

    if (design === "two_sample") {
      // Two-sample t-test: n = 2 * ((Zα + Zβ) / d)²
      perGroup = Math.ceil(2 * Math.pow((zAlpha + zBeta) / effectSize, 2));
      total = perGroup * 2;
      n = perGroup;
    } else if (design === "paired") {
      // Paired t-test: n = ((Zα + Zβ) / d)²
      perGroup = Math.ceil(Math.pow((zAlpha + zBeta) / effectSize, 2));
      total = perGroup;
      n = perGroup;
    } else {
      // One proportion: n = ((Zα + Zβ)² * p * (1-p)) / d² where p=0.5 (worst case)
      perGroup = Math.ceil((Math.pow(zAlpha + zBeta, 2) * 0.25) / Math.pow(effectSize, 2));
      total = perGroup;
      n = perGroup;
    }

    // Add 15% for attrition
    const withAttrition = Math.ceil(total * 1.15);
    const feasible = poolSize >= withAttrition;

    return { perGroup: n, total, withAttrition, feasible };
  }, [effectSize, alpha, power, design, poolSize]);

  const effectLabel = effectSize <= 0.3 ? "Small" : effectSize <= 0.6 ? "Medium" : "Large";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-5 w-5 text-primary" />
          Sample Size Calculator
        </CardTitle>
        <CardDescription>Power analysis for study planning</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Study Design */}
        <div className="space-y-2">
          <Label>Study Design</Label>
          <Select value={design} onValueChange={(v) => setDesign(v as StudyDesign)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="two_sample">Two-sample comparison</SelectItem>
              <SelectItem value="paired">Paired / before-after</SelectItem>
              <SelectItem value="one_proportion">Single proportion</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Effect Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Effect Size (Cohen's d)</Label>
            <Badge variant="outline" className="text-xs">{effectSize.toFixed(2)} — {effectLabel}</Badge>
          </div>
          <Slider
            value={[effectSize]}
            onValueChange={([v]) => setEffectSize(v)}
            min={0.1}
            max={1.2}
            step={0.05}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0.1 (tiny)</span>
            <span>0.5 (medium)</span>
            <span>1.2 (very large)</span>
          </div>
        </div>

        {/* Significance Level */}
        <div className="space-y-2">
          <Label>Significance Level (α)</Label>
          <Select value={alpha} onValueChange={setAlpha}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0.01">0.01 (most strict)</SelectItem>
              <SelectItem value="0.05">0.05 (standard)</SelectItem>
              <SelectItem value="0.10">0.10 (exploratory)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Power */}
        <div className="space-y-2">
          <Label>Statistical Power (1-β)</Label>
          <Select value={power} onValueChange={setPower}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0.80">80% (standard)</SelectItem>
              <SelectItem value="0.85">85%</SelectItem>
              <SelectItem value="0.90">90% (recommended)</SelectItem>
              <SelectItem value="0.95">95% (stringent)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Required Sample Size
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {design === "two_sample" && (
              <div>
                <p className="text-muted-foreground text-xs">Per Group</p>
                <p className="text-xl font-bold">{result.perGroup.toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs">Total Needed</p>
              <p className="text-xl font-bold">{result.total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">With 15% Attrition</p>
              <p className="text-xl font-bold">{result.withAttrition.toLocaleString()}</p>
            </div>
          </div>

          {/* Feasibility */}
          <div className={`flex items-center gap-2 text-sm rounded-md p-2 ${result.feasible ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
            {result.feasible ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Feasible — pool has {poolSize.toLocaleString()} contributors ({Math.round((poolSize / result.withAttrition) * 100)}% of needed)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>Pool has {poolSize.toLocaleString()} contributors — need {(result.withAttrition - poolSize).toLocaleString()} more</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
