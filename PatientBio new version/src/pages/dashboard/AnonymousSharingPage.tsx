import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Globe, Shield, Activity, FileText, Heart, Microscope, Users, AlertTriangle, CheckCircle, Clock, XCircle, Loader2, Link2, X, RefreshCw, CalendarClock, Leaf, Timer, Search, Star, ClipboardList, RotateCw } from "lucide-react";
import { useAnonymousContributions } from "@/hooks/useAnonymousContributions";
import { ResearchDemandInsights } from "@/components/dashboard/ResearchDemandInsights";
import { ResearchPreferencesQuickCard } from "@/components/dashboard/ResearchPreferencesQuickCard";
import { ContributionAISummary } from "@/components/dashboard/ContributionAISummary";
import { ContributionUsageBreakdown } from "@/components/dashboard/ContributionUsageBreakdown";
import { DataProvenanceCertificate } from "@/components/dashboard/DataProvenanceCertificate";
import { AnonymizationPreview } from "@/components/dashboard/AnonymizationPreview";
import { ContributionImpactDashboard } from "@/components/dashboard/ContributionImpactDashboard";
import { ContributionActivityTimeline } from "@/components/dashboard/ContributionActivityTimeline";
import { ContributionCompareDialog } from "@/components/dashboard/ContributionCompareDialog";
import { ResearchFeedbackCard } from "@/components/dashboard/ResearchFeedbackCard";

import { format, formatDistanceToNow, addMonths, addYears } from "date-fns";

const getDataCategories = (t: any) => [
  { key: "prescriptions", label: t("anonymousSharingPage.prescriptions", "Prescriptions"), icon: FileText, description: t("anonymousSharingPage.prescriptionsDesc", "Medication classes, dosage ranges, duration") },
  { key: "diagnoses", label: t("anonymousSharingPage.diagnoses", "Diagnoses"), icon: Heart, description: t("anonymousSharingPage.diagnosesDesc", "ICD-10 codes, disease categories") },
  { key: "vitals", label: t("anonymousSharingPage.vitals", "Vitals"), icon: Activity, description: t("anonymousSharingPage.vitalsDesc", "BP ranges, weight ranges, heart rate ranges") },
  { key: "lab_results", label: t("anonymousSharingPage.labResults", "Lab Results"), icon: Microscope, description: t("anonymousSharingPage.labResultsDesc", "Test types, result ranges") },
  { key: "allergies", label: t("anonymousSharingPage.allergies", "Allergies"), icon: AlertTriangle, description: t("anonymousSharingPage.allergiesDesc", "Allergy classes, severity levels") },
  { key: "demographics", label: t("anonymousSharingPage.demographics", "Demographics"), icon: Users, description: t("anonymousSharingPage.demographicsDesc", "Age range, gender only") },
  { key: "clinical_records", label: t("anonymousSharingPage.clinicalRecords", "Clinical Records"), icon: ClipboardList, description: t("anonymousSharingPage.clinicalRecordsDesc", "Diagnoses, comorbidities, investigations, treatments, complications") },
];

const getStatusConfig = (t: any): Record<string, { icon: typeof CheckCircle; color: string; label: string }> => ({
  not_required: { icon: CheckCircle, color: "text-accent", label: t("anonymousSharingPage.notRequired", "Not Required") },
  pending: { icon: Clock, color: "text-muted-foreground", label: t("anonymousSharingPage.pendingApproval", "Pending Approval") },
  approved: { icon: CheckCircle, color: "text-accent", label: t("anonymousSharingPage.approved", "Approved") },
  rejected: { icon: XCircle, color: "text-destructive", label: t("anonymousSharingPage.rejected", "Rejected") },
});

const getExpiryOptions = (t: any) => [
  { label: t("anonymousSharingPage.noExpiry", "No expiry"), value: "none" },
  { label: t("anonymousSharingPage.sixMonths", "6 months"), value: "6m" },
  { label: t("anonymousSharingPage.oneYear", "1 year"), value: "1y" },
];

const getFreshnessConfig = (t: any) => ({
  fresh: { label: t("anonymousSharingPage.fresh", "Fresh"), color: "text-accent border-accent/30", icon: Leaf },
  aging: { label: t("anonymousSharingPage.aging", "Aging"), color: "text-amber-600 border-amber-500/30", icon: Timer },
  stale: { label: t("anonymousSharingPage.stale", "Stale"), color: "text-destructive border-destructive/30", icon: Clock },
});

const AnonymousSharingPage = () => {
  const { t } = useTranslation();
  const {
    contributions, isLoading, submitContribution, withdrawContribution, updateContribution,
    updateGovtReference, updateContributionCategories, toggleAutoRenew,
    bulkWithdraw, bulkExtendExpiry, bulkToggleAutoRenew,
    activeCount, totalCategories, hasNewRecords, lastContributionDate, newRecordsInfo,
    usageCounts, totalUsageCount,
  } = useAnonymousContributions();
  const DATA_CATEGORIES = getDataCategories(t);
  const STATUS_CONFIG = getStatusConfig(t);
  const EXPIRY_OPTIONS = getExpiryOptions(t);
  const FRESHNESS_CONFIG = getFreshnessConfig(t);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [jurisdiction] = useState("BD");
  const [govtRef, setGovtRef] = useState("");
  const [expiryOption, setExpiryOption] = useState("none");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const addCategory = (key: string) => {
    setSelectedCategories(prev => prev.includes(key) ? prev : [...prev, key]);
  };

  const getExpiresAt = () => {
    const now = new Date();
    if (expiryOption === "6m") return addMonths(now, 6).toISOString();
    if (expiryOption === "1y") return addYears(now, 1).toISOString();
    return null;
  };

  const handleSubmit = () => {
    if (selectedCategories.length === 0) return;
    submitContribution.mutate({ categories: selectedCategories, jurisdiction, expiresAt: getExpiresAt() });
    setSelectedCategories([]);
  };

  const handleRemoveCategory = (contributionId: string, categoryToRemove: string, currentCategories: string[]) => {
    const remaining = currentCategories.filter(c => c !== categoryToRemove);
    updateContributionCategories.mutate({ id: contributionId, categories: remaining });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const activeContributions = contributions.filter(c => c.is_active);
  const selectAll = () => setSelectedIds(new Set(activeContributions.map(c => c.id)));
  const clearSelection = () => setSelectedIds(new Set());

  return (
    <div className="space-y-6 sm:space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          {t("anonymousSharing.title", "Anonymous Health Data Sharing")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
          {t("anonymousSharing.subtitle", "Contribute your anonymized health records to advance global medical research")}
        </p>
      </div>

      {/* Status Banner */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="py-3 sm:py-4">
          <div className="flex sm:hidden items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 bg-card">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs font-bold">{activeCount}</span>
                <span className="text-[10px] text-muted-foreground">{t("anonymousSharingPage.active", "Active")}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 bg-card">
                <span className="h-2 w-2 rounded-full bg-accent" />
                <span className="text-xs font-bold">{totalCategories}</span>
                <span className="text-[10px] text-muted-foreground">{t("anonymousSharingPage.categories", "Categories")}</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-primary border-primary/30">
              <Shield className="h-2.5 w-2.5 mr-1" />
              {t("anonymousSharingPage.protected", "Protected")}
            </Badge>
          </div>
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{t("anonymousSharingPage.activeContributions", { count: activeCount, defaultValue: `${activeCount} Active Contribution${activeCount !== 1 ? 's' : ''}` })}</p>
                <p className="text-sm text-muted-foreground">{t("anonymousSharingPage.categoriesShared", { count: totalCategories, defaultValue: `${totalCategories} data categories shared globally` })}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-primary border-primary/30">
              Privacy Protected
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* AI Contribution Summary */}
      <ContributionAISummary hasActiveContributions={activeCount > 0} />

      {/* Contribution Impact Dashboard */}
      <ContributionImpactDashboard
        contributions={contributions}
        hasNewRecords={hasNewRecords}
        lastRecordDate={lastContributionDate ? format(new Date(lastContributionDate), 'PP') : null}
        onRefreshContribution={() => window.scrollTo({ top: document.querySelector('#data-selection')?.getBoundingClientRect().top, behavior: 'smooth' })}
        newRecordsInfo={newRecordsInfo}
        totalUsageCount={totalUsageCount}
      />

      {/* Data Selection */}
      <Card id="data-selection">
        <CardHeader className="pb-2 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">{t("anonymousSharingPage.selectDataToShare", "Select Data to Share")}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t("anonymousSharingPage.chooseCategories", "Choose which categories to anonymize and contribute")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3">
          {DATA_CATEGORIES.map(cat => {
            const isSelected = selectedCategories.includes(cat.key);
            return (
              <div
                key={cat.key}
                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
                onClick={() => toggleCategory(cat.key)}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                    <cat.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm">{cat.label}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{cat.description}</p>
                  </div>
                </div>
                <Switch checked={isSelected} onCheckedChange={() => toggleCategory(cat.key)} className="shrink-0 ml-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Research Demand Insights */}
      <ResearchDemandInsights selectedCategories={selectedCategories} onAddCategory={addCategory} />

      {/* Anonymization Preview */}
      <AnonymizationPreview categories={selectedCategories} />

      {/* Jurisdiction & Government Approval */}
      {jurisdiction !== "BD" && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              International Sharing — Government Approval Required
            </CardTitle>
            <CardDescription>Cross-border data sharing requires government permission per regulatory compliance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Government Reference / Approval Number</Label>
              <Input
                placeholder="Enter approval reference number"
                value={govtRef}
                onChange={e => setGovtRef(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expiry Selector */}
      <Card className="overflow-hidden">
        <CardHeader className="px-3 py-2.5 sm:px-6 sm:pb-4">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            {t("anonymousSharingPage.contributionExpiry", "Contribution Expiry")}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t("anonymousSharingPage.setExpiry", "Set how long your contribution stays active")}</CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          <div className="grid grid-cols-3 gap-2">
            {EXPIRY_OPTIONS.map(opt => (
              <Button
                key={opt.value}
                variant={expiryOption === opt.value ? "default" : "outline"}
                size="sm"
                className="w-full text-xs sm:text-sm"
                onClick={() => setExpiryOption(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={selectedCategories.length === 0 || submitContribution.isPending}
        className="w-full"
        size="sm"
      >
        {submitContribution.isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("anonymousSharingPage.anonymizingSubmitting", "Anonymizing & Submitting...")}</>
        ) : (
          <><Globe className="h-4 w-4 mr-2" /> {t("anonymousSharingPage.contributeToPool", "Contribute to Global Research Pool")}</>
        )}
      </Button>


      {/* Research Feedback */}
      <ResearchFeedbackCard />

      {/* Research Preferences Quick Card */}
      <ResearchPreferencesQuickCard />

      {/* Contribution Usage Breakdown */}
      <ContributionUsageBreakdown activeContributionIds={activeContributions.map(c => c.id)} />

      {/* Contribution History */}
      <Card className="overflow-hidden">
        <CardHeader className="px-3 py-2.5 sm:px-6 sm:pb-6">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm sm:text-lg whitespace-nowrap">{t("anonymousSharingPage.contributionHistory", "Contribution History")}</CardTitle>
            <div className="flex items-center gap-1 shrink-0">
              {contributions.length >= 2 && (
                <ContributionCompareDialog contributions={contributions} />
              )}
              {activeContributions.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] sm:text-xs h-7 px-2"
                  onClick={selectedIds.size > 0 ? clearSelection : selectAll}
                >
                  {selectedIds.size > 0 ? t("anonymousSharingPage.clear", "Clear") : t("anonymousSharingPage.selectAll", "Select All")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contributions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No contributions yet</p>
              <p className="text-xs">Select data categories above to make your first contribution</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {contributions.map(c => {
                const statusCfg = STATUS_CONFIG[c.govt_approval_status] || STATUS_CONFIG.not_required;
                const StatusIcon = statusCfg.icon;
                const hasExpiry = !!c.expires_at;
                const isExpired = hasExpiry && new Date(c.expires_at!) < new Date();
                const expiryText = hasExpiry
                  ? isExpired
                    ? "Expired"
                    : `Expires ${formatDistanceToNow(new Date(c.expires_at!), { addSuffix: true })}`
                  : null;
                const freshCfg = c.freshness ? FRESHNESS_CONFIG[c.freshness] : null;
                const FreshIcon = freshCfg?.icon;
                const usage = usageCounts[c.id] || 0;
                const isSelected = selectedIds.has(c.id);

                return (
                   <div key={c.id} className={`p-2.5 sm:p-3 rounded-lg border ${c.is_active ? "" : "opacity-50"} ${isSelected ? "border-primary/50 bg-primary/5" : ""}`}>
                    {/* Mobile: stacked layout */}
                    <div className="sm:hidden space-y-1.5">
                      {/* Row 1: Status badges + date */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                          {c.is_active && activeContributions.length > 1 && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelection(c.id)}
                              className="mr-0.5"
                            />
                          )}
                          <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                            {c.is_active ? "Active" : "Withdrawn"}
                          </Badge>
                          <span className={`flex items-center gap-0.5 text-[10px] ${statusCfg.color}`}>
                            <StatusIcon className="h-2.5 w-2.5" />
                            {statusCfg.label}
                          </span>
                          {freshCfg && FreshIcon && c.is_active && (
                            <Badge variant="outline" className={`text-[10px] px-1 py-0 ${freshCfg.color}`}>
                              <FreshIcon className="h-2 w-2 mr-0.5" />
                              {freshCfg.label}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                          {format(new Date(c.contributed_at), 'dd MMM yyyy')}
                        </span>
                      </div>

                      {/* Row 2: Quality + Usage + Expiry inline */}
                      {(c.quality_score != null || usage > 0 || expiryText) && (
                        <div className="flex items-center gap-1 flex-wrap text-[10px]">
                          {c.quality_score != null && c.is_active && (
                            <span className={`flex items-center gap-0.5 ${c.quality_score >= 80 ? 'text-accent' : c.quality_score >= 55 ? 'text-primary' : c.quality_score >= 30 ? 'text-amber-600' : 'text-destructive'}`}>
                              <Star className="h-2.5 w-2.5" />
                              Q:{c.quality_score}
                            </span>
                          )}
                          {usage > 0 && c.is_active && (
                            <span className="text-primary flex items-center gap-0.5">
                              <Search className="h-2.5 w-2.5" />
                              {usage} quer{usage === 1 ? 'y' : 'ies'}
                            </span>
                          )}
                          {expiryText && (
                            <span className={`flex items-center gap-0.5 ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                              <Clock className="h-2.5 w-2.5" />
                              {expiryText}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Row 3: Category chips — compact scrollable */}
                      <div className="flex flex-wrap gap-1">
                        {c.data_categories.map(dc => (
                          <Badge key={dc} variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                            {dc}
                            {c.is_active && c.data_categories.length > 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveCategory(c.id, dc, c.data_categories); }}
                                className="ml-0.5 hover:text-destructive"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>

                      {/* Row 4: Disease + demographics — single line */}
                      <p className="text-[10px] text-muted-foreground truncate">
                        {c.disease_categories.join(', ') || 'No diseases'} • {c.age_range || 'unknown'} • {c.gender || 'unknown'}
                      </p>

                      {/* Blockchain hash */}
                      {c.blockchainHash && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono truncate">
                          <Link2 className="h-2.5 w-2.5 shrink-0" />
                          {c.blockchainHash.slice(0, 16)}…
                        </p>
                      )}

                      {/* Stale prompt */}
                      {c.freshness === "stale" && c.is_active && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                          ↻ Data may have changed. Consider updating.
                        </p>
                      )}

                      {/* Auto-renew */}
                      {c.is_active && hasExpiry && (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Auto-renew</span>
                          <Switch
                            checked={c.auto_renew}
                            onCheckedChange={(checked) => toggleAutoRenew.mutate({ id: c.id, autoRenew: checked })}
                            className="scale-75"
                          />
                        </div>
                      )}

                      {/* Actions row — compact grid */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <DataProvenanceCertificate contribution={c} verifyUrl={`${window.location.origin}/verify-contribution/${c.contribution_hash}`} />
                        {c.is_active && c.requires_govt_approval && !c.govt_reference_number && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            onClick={() => {
                              const ref = prompt("Enter government reference number:");
                              if (ref) updateGovtReference.mutate({ id: c.id, referenceNumber: ref });
                            }}
                          >
                            Add Ref #
                          </Button>
                        )}
                        {c.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            onClick={() => updateContribution.mutate(c.id)}
                            disabled={updateContribution.isPending}
                          >
                            <RotateCw className="h-2.5 w-2.5 mr-1" />
                            Update
                          </Button>
                        )}
                        {c.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] px-2 text-destructive hover:text-destructive ml-auto"
                            onClick={() => withdrawContribution.mutate(c.id)}
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* Desktop: side-by-side layout */}
                    <div className="hidden sm:flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {c.is_active && activeContributions.length > 1 && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelection(c.id)}
                              className="mr-1"
                            />
                          )}
                          <Badge variant={c.is_active ? "default" : "secondary"}>
                            {c.is_active ? "Active" : "Withdrawn"}
                          </Badge>
                          <span className={`flex items-center gap-1 text-xs ${statusCfg.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusCfg.label}
                          </span>
                          {freshCfg && FreshIcon && c.is_active && (
                            <Badge variant="outline" className={`text-xs ${freshCfg.color}`}>
                              <FreshIcon className="h-3 w-3 mr-1" />
                              {freshCfg.label}
                            </Badge>
                          )}
                          {expiryText && (
                            <Badge variant="outline" className={`text-xs ${isExpired ? 'text-destructive border-destructive/30' : 'text-muted-foreground'}`}>
                              <Clock className="h-3 w-3 mr-1" />
                              {expiryText}
                            </Badge>
                          )}
                          {usage > 0 && c.is_active && (
                            <Badge variant="outline" className="text-xs text-primary border-primary/30">
                              <Search className="h-3 w-3 mr-1" />
                              Used in {usage} research quer{usage === 1 ? 'y' : 'ies'}
                            </Badge>
                          )}
                          {c.is_active && hasExpiry && (
                            <div className="flex items-center gap-1.5 ml-2">
                              <RefreshCw className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Auto-renew</span>
                              <Switch
                                checked={c.auto_renew}
                                onCheckedChange={(checked) => toggleAutoRenew.mutate({ id: c.id, autoRenew: checked })}
                                className="scale-90"
                              />
                            </div>
                          )}
                          {c.quality_score != null && c.is_active && (
                            <Badge variant="outline" className={`text-xs ${c.quality_score >= 80 ? 'text-accent border-accent/30' : c.quality_score >= 55 ? 'text-primary border-primary/30' : c.quality_score >= 30 ? 'text-amber-600 border-amber-500/30' : 'text-destructive border-destructive/30'}`}>
                              <Star className="h-3 w-3 mr-1" />
                              Quality: {c.quality_score}/100
                            </Badge>
                          )}
                        </div>
                        {/* Removable category chips */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.data_categories.map(dc => (
                            <Badge key={dc} variant="outline" className="text-xs gap-1">
                              {dc}
                              {c.is_active && c.data_categories.length > 1 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemoveCategory(c.id, dc, c.data_categories); }}
                                  className="ml-0.5 hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.disease_categories.join(', ') || 'No disease categories'} • {c.age_range || '?'} • {c.gender || '?'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Contributed: {format(new Date(c.contributed_at), 'PPp')}
                        </p>
                        {c.blockchainHash && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                            <Link2 className="h-3 w-3" />
                            {c.blockchainHash.slice(0, 16)}…
                          </p>
                        )}
                        {c.freshness === "stale" && c.is_active && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            ↻ Health data may have changed since this contribution. Consider re-contributing.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <DataProvenanceCertificate contribution={c} verifyUrl={`${window.location.origin}/verify-contribution/${c.contribution_hash}`} />
                        {c.is_active && c.requires_govt_approval && !c.govt_reference_number && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const ref = prompt("Enter government reference number:");
                              if (ref) updateGovtReference.mutate({ id: c.id, referenceNumber: ref });
                            }}
                          >
                            Add Ref #
                          </Button>
                        )}
                        {c.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateContribution.mutate(c.id)}
                            disabled={updateContribution.isPending}
                          >
                            <RotateCw className="h-3 w-3 mr-1" />
                            Update Data
                          </Button>
                        )}
                        {c.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => withdrawContribution.mutate(c.id)}
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size >= 2 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-lg rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { bulkWithdraw.mutate([...selectedIds]); clearSelection(); }}
            disabled={bulkWithdraw.isPending}
          >
            Withdraw Selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { bulkExtendExpiry.mutate([...selectedIds]); clearSelection(); }}
            disabled={bulkExtendExpiry.isPending}
          >
            Extend 6 Months
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { bulkToggleAutoRenew.mutate([...selectedIds]); clearSelection(); }}
            disabled={bulkToggleAutoRenew.isPending}
          >
            Enable Auto-Renew
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Cancel
          </Button>
        </div>
      )}

      {/* Activity Timeline */}
      <ContributionActivityTimeline />
    </div>
  );
};

export default AnonymousSharingPage;
