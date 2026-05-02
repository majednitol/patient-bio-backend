import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, TrendingUp, MapPin, BarChart3, RefreshCw, Sparkles, FileText, Heart, Activity, Microscope, AlertTriangle, Users, Search, Star } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { cn } from "@/lib/utils";
import type { NewRecordsInfo } from "@/hooks/useAnonymousContributions";

interface Contribution {
  id: string;
  data_categories: string[];
  disease_categories: string[];
  is_active: boolean;
  source_jurisdiction: string;
  contributed_at: string;
  quality_score?: number | null;
}

interface ContributionImpactDashboardProps {
  contributions: Contribution[];
  onRefreshContribution?: () => void;
  hasNewRecords?: boolean;
  lastRecordDate?: string | null;
  newRecordsInfo?: NewRecordsInfo | null;
  totalUsageCount?: number;
}

const ALL_CATEGORIES = [
  { key: "prescriptions", label: "Prescriptions", icon: FileText },
  { key: "diagnoses", label: "Diagnoses", icon: Heart },
  { key: "vitals", label: "Vitals", icon: Activity },
  { key: "lab_results", label: "Lab Results", icon: Microscope },
  { key: "allergies", label: "Allergies", icon: AlertTriangle },
  { key: "demographics", label: "Demographics", icon: Users },
  { key: "clinical_records", label: "Clinical Records", icon: FileText },
];

const JURISDICTION_LABELS: Record<string, string> = {
  BD: "Bangladesh",
  IN: "India",
  US: "United States",
  EU: "European Union",
  UK: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  JP: "Japan",
  SG: "Singapore",
};

export const ContributionImpactDashboard = ({
  contributions,
  onRefreshContribution,
  hasNewRecords = false,
  lastRecordDate,
  newRecordsInfo,
  totalUsageCount = 0,
}: ContributionImpactDashboardProps) => {
  const activeContributions = useMemo(
    () => contributions.filter(c => c.is_active),
    [contributions]
  );

  const sharedCategories = useMemo(
    () => [...new Set(activeContributions.flatMap(c => c.data_categories))],
    [activeContributions]
  );
  const completenessPercent = Math.round((sharedCategories.length / ALL_CATEGORIES.length) * 100);
  const missingCategories = ALL_CATEGORIES.filter(c => !sharedCategories.includes(c.key));
  const nextCategoryBoost = missingCategories.length > 0
    ? Math.round(((sharedCategories.length + 1) / ALL_CATEGORIES.length) * 100) - completenessPercent
    : 0;

  const uniqueDiseases = useMemo(
    () => [...new Set(activeContributions.flatMap(c => c.disease_categories))],
    [activeContributions]
  );
  const impactScore = Math.min(
    100,
    Math.round(
      (completenessPercent * 0.4) +
      (Math.min(uniqueDiseases.length, 10) * 4) +
      (Math.min(activeContributions.length, 5) * 4)
    )
  );

  const jurisdictions = useMemo(
    () => [...new Set(activeContributions.map(c => c.source_jurisdiction))],
    [activeContributions]
  );

  const avgQualityScore = useMemo(() => {
    const scored = activeContributions.filter(c => c.quality_score != null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, c) => sum + (c.quality_score || 0), 0) / scored.length);
  }, [activeContributions]);

  if (activeContributions.length === 0 && !hasNewRecords) return null;

  // Build per-category diff summary
  const diffParts: string[] = [];
  if (newRecordsInfo) {
    if (newRecordsInfo.prescriptionCount > 0) diffParts.push(`${newRecordsInfo.prescriptionCount} new prescription${newRecordsInfo.prescriptionCount !== 1 ? 's' : ''}`);
    if (newRecordsInfo.healthRecordCount > 0) diffParts.push(`${newRecordsInfo.healthRecordCount} new health record${newRecordsInfo.healthRecordCount !== 1 ? 's' : ''}`);
  }
  const diffSummary = diffParts.length > 0 ? diffParts.join(', ') : null;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Re-contribution Prompt with per-category diff */}
      {hasNewRecords && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
          <CardContent className="py-3 sm:py-4">
            {/* Mobile */}
            <div className="flex sm:hidden items-center gap-2.5">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
                <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs">New records detected</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {diffSummary || "Update your contribution to keep data current"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 h-7 text-[10px] px-2 border-amber-500/40 text-amber-700 dark:text-amber-400"
                onClick={onRefreshContribution}
              >
                Update
              </Button>
            </div>
            {/* Desktop */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">New health records detected</p>
                  <p className="text-xs text-muted-foreground">
                    {diffSummary
                      ? `${diffSummary} since your last contribution`
                      : "You have new prescriptions or diagnoses since your last contribution"}
                    {lastRecordDate && ` (last updated ${lastRecordDate})`}.
                    {' '}Update your contribution to keep research data current.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
                onClick={onRefreshContribution}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Update Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Impact Dashboard Grid */}
      {activeContributions.length > 0 && (
        <>
          {/* Mobile: horizontal scroll compact cards */}
          <div className="sm:hidden overflow-x-auto hide-scrollbar scroll-fade-right -mx-1 px-1">
            <div className="flex gap-2.5 pb-1" style={{ minWidth: 'max-content' }}>
              <div className="w-[140px] shrink-0 p-3 rounded-xl border border-primary/20 bg-card">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5">
                  <Sparkles className="h-3 w-3" />
                  Impact Score
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary"><AnimatedCounter value={impactScore} /></span>
                  <span className="text-[10px] text-muted-foreground">/100</span>
                </div>
                <Progress value={impactScore} className="h-1 mt-2" />
                <p className="text-[10px] text-muted-foreground mt-1.5">{sharedCategories.length} categories</p>
              </div>

              <div className="w-[140px] shrink-0 p-3 rounded-xl border border-primary/20 bg-card">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5">
                  <Globe className="h-3 w-3" />
                  Global Reach
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary"><AnimatedCounter value={jurisdictions.length} /></span>
                  <span className="text-[10px] text-muted-foreground">region{jurisdictions.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {jurisdictions.slice(0, 2).map(j => (
                    <span key={j} className="text-[10px] text-muted-foreground">{JURISDICTION_LABELS[j] || j}</span>
                  ))}
                  {jurisdictions.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">+{jurisdictions.length - 2}</span>
                  )}
                </div>
              </div>

              <div className="w-[140px] shrink-0 p-3 rounded-xl border border-primary/20 bg-card">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5">
                  <BarChart3 className="h-3 w-3" />
                  Completeness
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary"><AnimatedCounter value={completenessPercent} /></span>
                  <span className="text-[10px] text-muted-foreground">%</span>
                </div>
                <Progress value={completenessPercent} className="h-1 mt-2" />
                <p className="text-[10px] text-muted-foreground mt-1.5">{sharedCategories.length}/{ALL_CATEGORIES.length} types</p>
              <div className="w-[140px] shrink-0 p-3 rounded-xl border border-primary/20 bg-card">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5">
                  <Search className="h-3 w-3" />
                  Research Usage
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary"><AnimatedCounter value={totalUsageCount} /></span>
                  <span className="text-[10px] text-muted-foreground">quer{totalUsageCount !== 1 ? 'ies' : 'y'}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Times accessed</p>
              </div>
            </div>
          </div>
          </div>

          {/* Desktop: original grid */}
          <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Research Impact Score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-primary"><AnimatedCounter value={impactScore} /></span>
                  <span className="text-sm text-muted-foreground mb-1">/ 100</span>
                </div>
                <Progress value={impactScore} className="h-1.5 mt-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  Based on {sharedCategories.length} categories & {uniqueDiseases.length} disease area{uniqueDiseases.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <Globe className="h-3.5 w-3.5" />
                  Global Reach
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-primary"><AnimatedCounter value={jurisdictions.length} /></span>
                  <span className="text-sm text-muted-foreground mb-1">jurisdiction{jurisdictions.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {jurisdictions.map(j => (
                    <Badge key={j} variant="outline" className="text-xs gap-1">
                      <MapPin className="h-2.5 w-2.5" />
                      {JURISDICTION_LABELS[j] || j}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Your data is accessible to verified researchers worldwide
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Contribution Completeness
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-primary"><AnimatedCounter value={completenessPercent} /></span>
                  <span className="text-sm text-muted-foreground mb-1">%</span>
                </div>
                <Progress value={completenessPercent} className="h-1.5 mt-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  {sharedCategories.length} of {ALL_CATEGORIES.length} categories shared
                </p>
                {missingCategories.length > 0 && (
                  <div className="mt-3 p-2 rounded-md bg-muted/50 border border-border">
                    <p className="text-xs font-medium flex items-center gap-1 mb-1.5">
                      <TrendingUp className="h-3 w-3 text-primary" />
                      Boost your impact
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Adding <span className="font-medium text-foreground">{missingCategories[0].label}</span> would increase completeness by {nextCategoryBoost}%
                    </p>
                    {missingCategories.length > 1 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {missingCategories.slice(0, 3).map(mc => {
                          const Icon = mc.icon;
                          return (
                            <Badge key={mc.key} variant="outline" className="text-xs gap-1 text-muted-foreground">
                              <Icon className="h-2.5 w-2.5" />
                              {mc.label}
                            </Badge>
                          );
                        })}
                        {missingCategories.length > 3 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            +{missingCategories.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <Search className="h-3.5 w-3.5" />
                  Research Usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-primary"><AnimatedCounter value={totalUsageCount} /></span>
                  <span className="text-sm text-muted-foreground mb-1">quer{totalUsageCount !== 1 ? 'ies' : 'y'}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Times your anonymized data was accessed by researchers
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
