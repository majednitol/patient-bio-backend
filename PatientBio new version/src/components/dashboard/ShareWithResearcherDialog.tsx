import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FlaskConical, Loader2, Check, ClipboardList, ChevronLeft, Eye, Database } from "lucide-react";
import { usePatientResearcherShares } from "@/hooks/usePatientResearcherShares";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { addHours } from "date-fns";

interface ShareWithResearcherDialogProps {
  trigger?: React.ReactNode;
}

const DISEASE_CATEGORIES = [
  { value: "cancer", labelKey: "shareDialogs.cancer" },
  { value: "covid19", labelKey: "shareDialogs.covid19" },
  { value: "diabetes", labelKey: "shareDialogs.diabetes" },
  { value: "heart_disease", labelKey: "shareDialogs.heartDisease" },
  { value: "hypertension", labelKey: "shareDialogs.hypertension" },
  { value: "asthma_respiratory", labelKey: "shareDialogs.asthmaRespiratory" },
  { value: "neurological", labelKey: "shareDialogs.neurological" },
  { value: "mental_health", labelKey: "shareDialogs.mentalHealth" },
  { value: "infectious_disease", labelKey: "shareDialogs.infectiousDisease" },
  { value: "autoimmune", labelKey: "shareDialogs.autoimmune" },
  { value: "gi_digestive", labelKey: "shareDialogs.giDigestive" },
  { value: "musculoskeletal", labelKey: "shareDialogs.musculoskeletal" },
  { value: "dermatological", labelKey: "shareDialogs.dermatological" },
  { value: "kidney_urological", labelKey: "shareDialogs.kidneyUrological" },
  { value: "liver_disease", labelKey: "shareDialogs.liverDisease" },
  { value: "womens_health", labelKey: "shareDialogs.womensHealth" },
  { value: "endocrine_metabolic", labelKey: "shareDialogs.endocrineMetabolic" },
  { value: "pediatric", labelKey: "shareDialogs.pediatric" },
  { value: "general", labelKey: "shareDialogs.general" },
];

const EXPIRY_OPTIONS = [
  { value: "168", labelKey: "shareDialogs.7days" },
  { value: "720", labelKey: "shareDialogs.30days" },
  { value: "2160", labelKey: "shareDialogs.90days" },
  { value: "8760", labelKey: "shareDialogs.1year" },
];

type DialogStep = "form" | "review" | "success";

const ShareWithResearcherDialog = ({ trigger }: ShareWithResearcherDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { createShare, isCreating } = usePatientResearcherShares();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>("form");
  const [researcherId, setResearcherId] = useState("");
  const [diseaseCategory, setDiseaseCategory] = useState("");
  const [researchPurpose, setResearchPurpose] = useState("");
  const [isAnonymized, setIsAnonymized] = useState(true);
  const [includeClinicalRecords, setIncludeClinicalRecords] = useState(false);
  const [expiryHours, setExpiryHours] = useState("720");

  // Data preview query
  const { data: previewData } = useQuery({
    queryKey: ["share-data-preview", user?.id],
    queryFn: async () => {
      if (!user?.id) return { recordsCount: 0, hasClinical: false };

      const [recordsRes, prescriptionsRes] = await Promise.all([
        supabase
          .from("health_records")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("prescriptions")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", user.id),
      ]);

      return {
        recordsCount: recordsRes.count ?? 0,
        hasClinical: (prescriptionsRes.count ?? 0) > 0,
      };
    },
    enabled: !!user?.id && open && step !== "success",
    staleTime: 60_000,
  });

  const resetDialog = () => {
    setResearcherId("");
    setDiseaseCategory("");
    setResearchPurpose("");
    setIsAnonymized(true);
    setIncludeClinicalRecords(false);
    setExpiryHours("720");
    setStep("form");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetDialog();
  };

  const handleShare = () => {
    if (!researcherId.trim()) return;
    const expiresAt = addHours(new Date(), parseInt(expiryHours)).toISOString();
    createShare(
      {
        researcher_id: researcherId.trim(),
        disease_category: diseaseCategory || undefined,
        research_purpose: researchPurpose || undefined,
        is_anonymized: isAnonymized,
        expires_at: expiresAt,
        include_clinical_records: includeClinicalRecords,
      },
      { onSuccess: () => setStep("success") }
    );
  };

  const selectedCategoryLabel = DISEASE_CATEGORIES.find(c => c.value === diseaseCategory);
  const selectedExpiryLabel = EXPIRY_OPTIONS.find(o => o.value === expiryHours);

  return (
    <>
      <span onClick={() => handleOpenChange(true)}>
        {trigger || (
          <Button variant="outline" className="w-full h-auto py-3 justify-start gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <FlaskConical className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">{t("shareDialogs.shareForResearch")}</span>
          </Button>
        )}
      </span>
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2 text-foreground">
              <FlaskConical className="h-5 w-5 text-primary" />
              {t("shareDialogs.shareDataForResearch")}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t("shareDialogs.researcherDesc")}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {step === "success" ? (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium mb-1">{t("shareDialogs.dataSharedSuccess")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("shareDialogs.researcherNotified", { anon: isAnonymized ? t("shareDialogs.anonymized") : "" })}
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>{t("common.close")}</Button>
            </div>
          ) : step === "review" ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  {t("shareDialogs.reviewSummary", "Review Summary")}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("shareDialogs.researcherId")}</span>
                    <span className="font-mono text-xs truncate max-w-[180px]">{researcherId}</span>
                  </div>
                  {diseaseCategory && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("shareDialogs.diseaseCategory", "Category")}</span>
                      <span>{selectedCategoryLabel ? t(selectedCategoryLabel.labelKey, selectedCategoryLabel.value) : diseaseCategory}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("shareDialogs.anonymizeData")}</span>
                    <span>{isAnonymized ? t("common.yes", "Yes") : t("common.no", "No")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("shareDialogs.includeClinicalRecords", "Clinical Records")}</span>
                    <span>{includeClinicalRecords ? t("common.yes", "Yes") : t("common.no", "No")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("shareDialogs.accessExpiresIn")}</span>
                    <span>{selectedExpiryLabel ? t(selectedExpiryLabel.labelKey) : expiryHours + "h"}</span>
                  </div>
                </div>
              </div>

              {/* Data Preview Banner */}
              {previewData && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
                  <Database className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{previewData.recordsCount}</span>{" "}
                    {t("shareDialogs.healthRecords", "health records")}
                    {includeClinicalRecords && (
                      <>
                        {" + "}
                        <span className="font-medium text-foreground">
                          {t("shareDialogs.clinicalData", "Clinical data")}
                        </span>
                        {previewData.hasClinical
                          ? ` (${t("shareDialogs.available", "available")})`
                          : ` (${t("shareDialogs.notYetAdded", "not yet added")})`}
                      </>
                    )}
                  </p>
                </div>
              )}

              <ResponsiveDialogFooter className="pt-2 flex gap-2">
                <Button variant="outline" onClick={() => setStep("form")} className="flex-1">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t("common.back", "Back")}
                </Button>
                <Button onClick={handleShare} disabled={isCreating} className="flex-1 bg-primary hover:bg-primary/90">
                  {isCreating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("shareDialogs.sharing")}</>
                  ) : (
                    <><FlaskConical className="mr-2 h-4 w-4" />{t("shareDialogs.confirmShare", "Confirm & Share")}</>
                  )}
                </Button>
              </ResponsiveDialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="researcher-id">{t("shareDialogs.researcherId")}</Label>
                <Input id="researcher-id" placeholder={t("shareDialogs.enterResearcherId")} value={researcherId} onChange={(e) => setResearcherId(e.target.value)} />
                <p className="text-xs text-muted-foreground">{t("shareDialogs.getResearcherIdQR")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="disease-category">{t("shareDialogs.diseaseCategoryOptional")}</Label>
                <Select value={diseaseCategory} onValueChange={setDiseaseCategory}>
                  <SelectTrigger><SelectValue placeholder={t("shareDialogs.selectCategory")} /></SelectTrigger>
                  <SelectContent>
                    {DISEASE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{t(cat.labelKey, cat.value)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="research-purpose">{t("shareDialogs.researchPurposeOptional")}</Label>
                <Textarea id="research-purpose" placeholder={t("shareDialogs.describePurpose")} value={researchPurpose} onChange={(e) => setResearchPurpose(e.target.value)} rows={2} />
              </div>

              <div className="space-y-2">
                <Label>{t("shareDialogs.accessExpiresIn")}</Label>
                <Select value={expiryHours} onValueChange={setExpiryHours}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="anonymized" className="cursor-pointer">{t("shareDialogs.anonymizeData")}</Label>
                  <p className="text-xs text-muted-foreground">{t("shareDialogs.hidePersonalFromResearcher")}</p>
                </div>
                <Switch id="anonymized" checked={isAnonymized} onCheckedChange={setIsAnonymized} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="clinical-records" className="cursor-pointer flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-primary" />
                    {t("shareDialogs.includeClinicalRecords", "Include Clinical Records")}
                  </Label>
                  <p className="text-xs text-muted-foreground">{t("shareDialogs.clinicalRecordsNote", "ICD-10 coded diagnoses, LOINC-coded investigations, and treatment protocols")}</p>
                </div>
                <Switch id="clinical-records" checked={includeClinicalRecords} onCheckedChange={setIncludeClinicalRecords} />
              </div>

              {/* Data Preview Banner */}
              {previewData && previewData.recordsCount > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
                  <Database className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{previewData.recordsCount}</span>{" "}
                    {t("shareDialogs.recordsWillBeShared", "records will be shared")}
                    {includeClinicalRecords && previewData.hasClinical && (
                      <> + {t("shareDialogs.clinicalData", "clinical data")}</>
                    )}
                  </p>
                </div>
              )}

              <ResponsiveDialogFooter className="pt-2">
                <Button onClick={() => setStep("review")} disabled={!researcherId.trim()} className="w-full bg-primary hover:bg-primary/90">
                  <Eye className="mr-2 h-4 w-4" />
                  {t("shareDialogs.reviewAndShare", "Review & Share")}
                </Button>
              </ResponsiveDialogFooter>
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
};

export default ShareWithResearcherDialog;
