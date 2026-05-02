import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Eye, EyeOff, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AnonymizationPreviewProps {
  categories: string[];
}

const PREVIEW_EXAMPLES: Record<string, { raw: string; anonymized: string }[]> = {
  prescriptions: [
    { raw: "Metformin 500mg twice daily", anonymized: "Medication Class: Biguanides, Dosage: Standard, Frequency: Twice daily" },
    { raw: "Amlodipine 5mg once daily", anonymized: "Medication Class: Calcium Channel Blockers, Dosage: Standard, Frequency: Once daily" },
  ],
  diagnoses: [
    { raw: "Type 2 Diabetes Mellitus diagnosed on 15 Jan 2024", anonymized: "Disease Category: Diabetes, ICD-10: E11" },
    { raw: "Essential Hypertension", anonymized: "Disease Category: Hypertension, ICD-10: I10" },
  ],
  vitals: [
    { raw: "BP: 138/88 mmHg on 10 Feb 2025", anonymized: "BP Range: 130-140/80-90 mmHg" },
    { raw: "Weight: 78.5 kg", anonymized: "Weight Range: 75-80 kg" },
  ],
  demographics: [
    { raw: "John Doe, Age 34, Male, DOB: 1991-05-15", anonymized: "Age Range: 30-40, Gender: Male" },
  ],
  allergies: [
    { raw: "Allergic to Penicillin (severe reaction)", anonymized: "Allergy Class: Beta-Lactam Antibiotics, Severity: Severe" },
  ],
  lab_results: [
    { raw: "HbA1c: 7.2% on 20 Jan 2025", anonymized: "Test Type: HbA1c, Result Range: 7.0-7.5%" },
  ],
  clinical_records: [
    { raw: "Type 2 Diabetes, ECOG 1, Metformin 500mg, Dr. Rahman (Endocrinology)", anonymized: "ICD-10: E11, Functional Status: ECOG 1, Treatment: Biguanides, Specialty: Endocrinology" },
    { raw: "CCI Score 4, Hypertension, CKD Stage 3, Dialysis active", anonymized: "Charlson Index: 4, Comorbidities: I10, N18.3, Dialysis: Active" },
  ],
};

const STRIPPED_FIELDS = ["Full Name", "Date of Birth", "Address", "Phone Number", "Email", "Exact Dates", "Hospital Name", "Doctor Name"];

// Privacy scoring logic based on k-anonymity principles
function computePrivacyScore(categories: string[]): { score: number; level: string; color: string; description: string } {
  if (categories.length === 0) return { score: 0, level: "None", color: "bg-muted", description: "" };

  let score = 0;
  const count = categories.length;
  const hasDemographics = categories.includes("demographics");
  const hasClinical = categories.some(c => ["prescriptions", "diagnoses", "lab_results", "clinical_records"].includes(c));

  // Base score from category count (more = higher k-anonymity through generalization)
  score += Math.min(count * 15, 60);

  // Penalty if demographics alone (low k-anonymity, quasi-identifiers)
  if (hasDemographics && count === 1) {
    score = 20;
  } else if (hasDemographics && hasClinical && count >= 3) {
    // Combining demographics with multiple clinical = good generalization
    score += 20;
  } else if (!hasDemographics) {
    // No demographics at all = very high privacy
    score += 15;
  }

  // Bonus for diverse clinical data (better utility + privacy through aggregation)
  if (count >= 4) score += 10;

  score = Math.min(score, 100);

  if (score >= 80) return { score, level: "Very High", color: "bg-accent", description: "Excellent k-anonymity. Data is highly generalized with minimal re-identification risk." };
  if (score >= 55) return { score, level: "High", color: "bg-primary", description: "Strong privacy protection. Low re-identification risk through data generalization." };
  if (score >= 35) return { score, level: "Medium", color: "bg-amber-500", description: "Moderate privacy. Consider adding more categories to increase anonymity set size." };
  return { score, level: "Low", color: "bg-destructive", description: "Low k-anonymity. Adding more categories reduces re-identification risk significantly." };
}

export const AnonymizationPreview = ({ categories }: AnonymizationPreviewProps) => {
  const privacy = useMemo(() => computePrivacyScore(categories), [categories]);

  if (categories.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Anonymization Preview
        </CardTitle>
        <p className="text-xs text-muted-foreground">See exactly how your data is transformed before sharing</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Privacy Strength Meter */}
        <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Privacy Strength</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px]">
                  <p className="text-xs">
                    <strong>k-Anonymity</strong> measures how well your data blends into a crowd. Higher scores mean your records are harder to distinguish from others in the research pool.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0 ${
                privacy.level === "Very High" ? "text-accent border-accent/40" :
                privacy.level === "High" ? "text-primary border-primary/40" :
                privacy.level === "Medium" ? "text-amber-600 border-amber-500/40" :
                "text-destructive border-destructive/40"
              }`}
            >
              {privacy.level}
            </Badge>
          </div>
          <Progress value={privacy.score} className="h-2" />
          <p className="text-[10px] text-muted-foreground">{privacy.description}</p>
          {categories.includes("demographics") && categories.length === 1 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              ⚠ Sharing demographics alone has low k-anonymity. Add clinical data to improve privacy.
            </p>
          )}
        </div>

        {/* Category previews */}
        {categories.map(cat => {
          const examples = PREVIEW_EXAMPLES[cat];
          if (!examples) return null;
          return (
            <div key={cat} className="space-y-2">
              <h4 className="text-sm font-medium capitalize">{cat.replace('_', ' ')}</h4>
              {examples.map((ex, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-md bg-destructive/5 border border-destructive/20">
                    <div className="flex items-center gap-1 mb-1 text-destructive">
                      <EyeOff className="h-3 w-3" />
                      <span className="font-medium">Raw (stripped)</span>
                    </div>
                    <span className="line-through text-muted-foreground">{ex.raw}</span>
                  </div>
                  <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-1 mb-1 text-primary">
                      <Eye className="h-3 w-3" />
                      <span className="font-medium">Anonymized (shared)</span>
                    </div>
                    <span>{ex.anonymized}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        <div className="pt-2 border-t">
          <p className="text-xs font-medium text-destructive mb-2">Always stripped from shared data:</p>
          <div className="flex flex-wrap gap-1">
            {STRIPPED_FIELDS.map(f => (
              <Badge key={f} variant="outline" className="text-xs border-destructive/30 text-destructive">
                {f}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
