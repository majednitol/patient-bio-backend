import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, ChevronRight } from "lucide-react";

export interface InsightTemplate {
  id: string;
  domain: string;
  name: string;
  prompt: string;
  description: string;
}

const DOMAIN_TEMPLATES: InsightTemplate[] = [
  // Oncology
  { id: "onc-1", domain: "oncology", name: "Survival Curve Analysis", description: "Estimate survival probabilities across treatment groups", prompt: "Analyze this cohort as an oncology dataset. Generate Kaplan-Meier-style survival analysis comparing treatment response across disease subtypes. Identify significant prognostic factors, treatment response rates, and highlight any statistically notable subgroup differences." },
  { id: "onc-2", domain: "oncology", name: "Tumor Marker Correlation", description: "Correlate biomarkers with disease outcomes", prompt: "For this oncology cohort, analyze tumor marker and biomarker data. Identify correlations between marker levels and disease progression, treatment response, and survival outcomes. Suggest markers that could serve as predictive indicators." },
  { id: "onc-3", domain: "oncology", name: "Treatment Response Comparison", description: "Compare efficacy across treatment protocols", prompt: "Compare treatment protocols in this oncology cohort. Analyze response rates, time to progression, and adverse event profiles across different treatment regimens. Identify which patient subgroups benefit most from each approach." },

  // Cardiology
  { id: "card-1", domain: "cardiology", name: "CV Risk Factor Clustering", description: "Identify cardiovascular risk clusters", prompt: "Analyze this cohort for cardiovascular risk factor clustering. Group patients by risk profiles (hypertension, lipids, BMI, smoking, diabetes). Calculate composite risk scores and identify high-risk clusters that may benefit from targeted intervention." },
  { id: "card-2", domain: "cardiology", name: "BP Trend Anomaly Detection", description: "Detect blood pressure pattern anomalies", prompt: "Analyze blood pressure trends in this cardiovascular cohort. Identify patients with anomalous BP patterns, treatment-resistant hypertension, or concerning variability. Flag cases requiring clinical attention and suggest monitoring strategies." },
  { id: "card-3", domain: "cardiology", name: "Medication Adherence Impact", description: "Assess medication adherence on outcomes", prompt: "Evaluate the impact of medication adherence on cardiovascular outcomes in this cohort. Analyze prescription patterns, refill rates, and correlate with clinical endpoints. Identify factors associated with poor adherence." },

  // Epidemiology
  { id: "epi-1", domain: "epidemiology", name: "Incidence Rate Calculation", description: "Calculate disease incidence rates", prompt: "Calculate disease incidence rates for this population cohort. Stratify by age, gender, geography, and time period. Compare with published population benchmarks and identify any unusual patterns or emerging trends." },
  { id: "epi-2", domain: "epidemiology", name: "Geographic Cluster Detection", description: "Detect geographic disease clusters", prompt: "Analyze the geographic distribution of disease cases in this cohort. Identify spatial clusters, regional hotspots, and jurisdictional variations. Suggest potential environmental or demographic factors driving geographic patterns." },
  { id: "epi-3", domain: "epidemiology", name: "Outbreak Pattern Analysis", description: "Detect outbreak-like patterns", prompt: "Examine temporal patterns in this cohort for potential outbreak indicators. Analyze case clustering over time, identify acceleration points, and compare with expected baseline rates. Provide early warning indicators." },

  // Genomics
  { id: "gen-1", domain: "genomics", name: "Biomarker Frequency Analysis", description: "Analyze biomarker prevalence", prompt: "Analyze biomarker frequencies across this cohort. Calculate prevalence rates for key genetic markers, compare across demographic subgroups, and identify markers with potential diagnostic or prognostic value for the represented conditions." },
  { id: "gen-2", domain: "genomics", name: "Variant-Phenotype Correlation", description: "Correlate genetic variants with phenotypes", prompt: "Examine relationships between genetic variant data and clinical phenotypes in this cohort. Identify significant genotype-phenotype associations, calculate effect sizes, and compare with published GWAS findings." },

  // Pharmacology
  { id: "pharm-1", domain: "pharmacology", name: "Drug Interaction Network", description: "Map drug interaction patterns", prompt: "Analyze medication data in this cohort to identify drug interaction patterns. Build an interaction network showing frequency and severity of co-prescriptions. Highlight potentially dangerous combinations and suggest alternatives." },
  { id: "pharm-2", domain: "pharmacology", name: "Dose-Response Modeling", description: "Model dose-response relationships", prompt: "Analyze dose-response relationships for key medications in this cohort. Identify optimal dosing ranges, therapeutic windows, and patient factors influencing drug response. Compare with published pharmacokinetic data." },
  { id: "pharm-3", domain: "pharmacology", name: "Adverse Event Clustering", description: "Cluster adverse drug events", prompt: "Identify patterns in adverse drug events across this cohort. Cluster events by drug class, patient demographics, and temporal patterns. Calculate adverse event rates and identify risk factors for drug-related complications." },
];

interface DomainInsightTemplatesProps {
  onSelectTemplate: (template: InsightTemplate) => void;
  activeDomain?: string | null;
}

export const DomainInsightTemplates = ({ onSelectTemplate, activeDomain }: DomainInsightTemplatesProps) => {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(activeDomain || null);

  const domains = [...new Set(DOMAIN_TEMPLATES.map((t) => t.domain))];
  
  const filteredDomains = activeDomain
    ? domains.filter((d) => d === activeDomain)
    : domains;

  const domainLabels: Record<string, string> = {
    oncology: "Oncology",
    cardiology: "Cardiology",
    epidemiology: "Epidemiology",
    genomics: "Genomics",
    pharmacology: "Pharmacology",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Domain-Specific Templates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-80">
          <div className="space-y-2">
            {filteredDomains.map((domain) => {
              const templates = DOMAIN_TEMPLATES.filter((t) => t.domain === domain);
              const isExpanded = expandedDomain === domain;
              return (
                <div key={domain}>
                  <button
                    onClick={() => setExpandedDomain(isExpanded ? null : domain)}
                    className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted text-sm font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{domainLabels[domain] || domain}</Badge>
                      <span className="text-xs text-muted-foreground">{templates.length} templates</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => onSelectTemplate(template)}
                          className="flex items-start gap-2 w-full p-2 rounded-md hover:bg-primary/5 text-left group"
                        >
                          <Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary/60 group-hover:text-primary" />
                          <div>
                            <p className="text-sm font-medium">{template.name}</p>
                            <p className="text-xs text-muted-foreground">{template.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
