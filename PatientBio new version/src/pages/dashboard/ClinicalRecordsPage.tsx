import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BackgroundForm } from "@/components/clinical/BackgroundForm";
import { ComorbidityForm } from "@/components/clinical/ComorbidityForm";
import { InvestigationForm } from "@/components/clinical/InvestigationForm";
import { TreatmentForm } from "@/components/clinical/TreatmentForm";
import { CareTeamForm } from "@/components/clinical/CareTeamForm";
import { ComplicationsForm } from "@/components/clinical/ComplicationsForm";
import { ClinicalCompletenessRing, useClinicalCompleteness } from "@/components/clinical/ClinicalCompletenessRing";
import { ClinicalFHIRExport } from "@/components/clinical/ClinicalFHIRExport";
import { useIsMobile } from "@/hooks/use-mobile";
import { useClinicalRealtimeNotifications } from "@/hooks/useClinicalRealtimeNotifications";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, User, HeartPulse, FlaskConical, Pill, Users, AlertTriangle, ChevronRight, ArrowLeft, CheckCircle2, Bot, Sparkles, Filter, ScanSearch, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TFunction } from "i18next";

const TAB_CONFIGS = [
  { value: "background", labelKey: "clinicalRecords.tabs.background", subtitleKey: "clinicalRecords.tabs.backgroundSubtitle", icon: User },
  { value: "comorbidities", labelKey: "clinicalRecords.tabs.comorbidities", subtitleKey: "clinicalRecords.tabs.comorbiditiesSubtitle", icon: HeartPulse },
  { value: "investigations", labelKey: "clinicalRecords.tabs.investigations", subtitleKey: "clinicalRecords.tabs.investigationsSubtitle", icon: FlaskConical },
  { value: "treatments", labelKey: "clinicalRecords.tabs.treatments", subtitleKey: "clinicalRecords.tabs.treatmentsSubtitle", icon: Pill },
  { value: "care-team", labelKey: "clinicalRecords.tabs.careTeam", subtitleKey: "clinicalRecords.tabs.careTeamSubtitle", icon: Users },
  { value: "complications", labelKey: "clinicalRecords.tabs.complications", subtitleKey: "clinicalRecords.tabs.complicationsSubtitle", icon: AlertTriangle },
];

function MobileClinicalRecords() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const { tabs: completeness } = useClinicalCompleteness();

  const activeConfig = TAB_CONFIGS.find((tc) => tc.value === activeTab);

  const handleSaved = (labelKey: string) => {
    setActiveTab(null);
    toast({ title: t("clinicalRecords.savedToast", { label: t(labelKey) }), duration: 2000 });
  };

  if (activeTab && activeConfig) {
    const Icon = activeConfig.icon;
    return (
      <div className="space-y-2 pb-20">
        <button
          onClick={() => setActiveTab(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground press-feedback py-1"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("clinicalRecords.back")}
        </button>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold">{t(activeConfig.labelKey)}</h3>
        </div>
        {activeTab === "background" && <BackgroundForm onSaved={() => handleSaved("clinicalRecords.tabs.background")} />}
        {activeTab === "comorbidities" && <ComorbidityForm onSaved={() => handleSaved("clinicalRecords.tabs.comorbidities")} />}
        {activeTab === "investigations" && <InvestigationForm />}
        {activeTab === "treatments" && <TreatmentForm />}
        {activeTab === "care-team" && <CareTeamForm />}
        {activeTab === "complications" && <ComplicationsForm onSaved={() => handleSaved("clinicalRecords.tabs.complications")} />}
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-20">
      <ClinicalCompletenessRing />
      <div className="space-y-1.5">
        {TAB_CONFIGS.map((tc) => {
          const Icon = tc.icon;
          const filled = completeness.find((c) => c.value === tc.value)?.filled;
          return (
            <button
              key={tc.value}
              onClick={() => setActiveTab(tc.value)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card press-feedback text-left transition-colors active:bg-muted/50"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block">{t(tc.labelKey)}</span>
                <span className="text-xs text-muted-foreground block">{t(tc.subtitleKey)}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {filled ? (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-medium px-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-accent text-accent-foreground text-xs font-medium px-1.5">
                    0%
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DesktopTabsWithBadges() {
  const { t } = useTranslation();
  const { tabs: completeness } = useClinicalCompleteness();
  return (
    <Tabs defaultValue="background">
      <TabsList className="w-full overflow-x-auto h-auto flex-nowrap gap-0.5 hide-scrollbar">
        {TAB_CONFIGS.map((tc) => {
          const filled = completeness.find((c) => c.value === tc.value)?.filled;
          return (
            <TabsTrigger key={tc.value} value={tc.value} className="text-sm flex-shrink-0 min-w-fit gap-1.5">
              {t(tc.labelKey)}
              {filled ? (
                <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
              ) : (
                <span className="inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-accent text-accent-foreground text-[10px] font-medium px-1">0%</span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
      <TabsContent value="background"><BackgroundForm /></TabsContent>
      <TabsContent value="comorbidities"><ComorbidityForm /></TabsContent>
      <TabsContent value="investigations"><InvestigationForm /></TabsContent>
      <TabsContent value="treatments"><TreatmentForm /></TabsContent>
      <TabsContent value="care-team"><CareTeamForm /></TabsContent>
      <TabsContent value="complications"><ComplicationsForm /></TabsContent>
    </Tabs>
  );
}

export default function ClinicalRecordsPage() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "auto">("all");
  const [batchScanning, setBatchScanning] = useState(false);
  const [batchResult, setBatchResult] = useState<{ success: number; failed: number; remaining: number } | null>(null);

  // Enable realtime notifications for auto-populated clinical records
  useClinicalRealtimeNotifications();

  const handleBatchOCR = async () => {
    setBatchScanning(true);
    setBatchResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("batch-ocr-records", {
        body: { limit: 10, auto_save: true },
      });
      if (error) throw error;
      setBatchResult({
        success: data.success || 0,
        failed: data.failed || 0,
        remaining: data.remaining_pending || 0,
      });
      if (data.success > 0) {
        toast({
          title: `${data.success} ${t("clinicalRecords.auto.recordsScanned", "records scanned & data extracted")}`,
          description: data.remaining_pending > 0
            ? `${data.remaining_pending} ${t("clinicalRecords.auto.moreRemaining", "more records remaining")}`
            : t("clinicalRecords.auto.allProcessed", "All records processed!"),
        });
      } else {
        toast({ title: t("clinicalRecords.auto.noUnprocessed", "No unprocessed records found") });
      }
    } catch (e) {
      console.error("Batch OCR error:", e);
      toast({ title: t("clinicalRecords.auto.batchError", "Failed to scan records"), variant: "destructive" });
    } finally {
      setBatchScanning(false);
    }
  };

  return (
    <div className="space-y-2 sm:space-y-6 max-w-4xl mx-auto pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex h-10 w-10 rounded-xl bg-primary/10 items-center justify-center">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold">{t("clinicalRecords.pageTitle")}</h2>
            <p className="hidden sm:block text-sm text-muted-foreground">{t("clinicalRecords.pageSubtitle")}</p>
          </div>
        </div>
        <ClinicalFHIRExport />
      </div>

      {/* Auto-populated banner with Batch OCR */}
      <div className="flex items-center gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary/5 text-sm">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <p className="text-xs text-muted-foreground flex-1">
          {t("clinicalRecords.auto.banner", "Your clinical records are automatically updated from doctor visits, prescriptions, and uploaded documents.")}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleBatchOCR}
          disabled={batchScanning}
          className="shrink-0 text-xs h-7 gap-1.5"
        >
          {batchScanning ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ScanSearch className="h-3 w-3" />
          )}
          {batchScanning
            ? t("clinicalRecords.auto.scanning", "Scanning...")
            : t("clinicalRecords.auto.scanAll", "Scan Uploads")}
        </Button>
      </div>

      {/* Batch scan result */}
      {batchResult && (
        <div className="flex items-center gap-2 text-xs p-2.5 rounded-lg border bg-card">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span>
            {batchResult.success} {t("clinicalRecords.auto.extracted", "extracted")}
            {batchResult.failed > 0 && `, ${batchResult.failed} ${t("clinicalRecords.auto.failed", "failed")}`}
            {batchResult.remaining > 0 && ` — ${batchResult.remaining} ${t("clinicalRecords.auto.remaining", "remaining")}`}
          </span>
          {batchResult.remaining > 0 && (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleBatchOCR} disabled={batchScanning}>
              {t("clinicalRecords.auto.scanMore", "Scan more")}
            </Button>
          )}
        </div>
      )}

      {/* Source filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex gap-1">
          {([
            { value: "all" as const, label: t("clinicalRecords.filter.all", "All") },
            { value: "manual" as const, label: t("clinicalRecords.filter.manual", "Manual") },
            { value: "auto" as const, label: t("clinicalRecords.filter.auto", "Auto-populated") },
          ]).map((f) => (
            <Badge
              key={f.value}
              variant={sourceFilter === f.value ? "default" : "outline"}
              className="cursor-pointer text-xs press-feedback"
              onClick={() => setSourceFilter(f.value)}
            >
              {f.label}
            </Badge>
          ))}
        </div>
      </div>

      {isMobile ? (
        <MobileClinicalRecords />
      ) : (
        <>
          <ClinicalCompletenessRing />
          <DesktopTabsWithBadges />
        </>
      )}
    </div>
  );
}
