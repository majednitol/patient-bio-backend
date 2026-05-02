import { useForm } from "react-hook-form";
import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useBackgroundInfo } from "@/hooks/useClinicalRecords";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { AutoPopulatedBadge } from "./AutoPopulatedBadge";

interface BackgroundFormProps {
  onSaved?: () => void;
}

export function BackgroundForm({ onSaved }: BackgroundFormProps) {
  const { t } = useTranslation();
  const { data, isLoading, save, saving } = useBackgroundInfo();
  const isMobile = useIsMobile();
  const form = useForm({ defaultValues: { education_level: "", occupation: "", occupational_health_note: "", family_history: "", lifestyle_notes: "", ward_address: "", ward_no: "" } });

  const EDUCATION_LEVELS = [
    { value: "no_school", label: t("clinicalRecords.background.noSchool") },
    { value: "primary", label: t("clinicalRecords.background.primary") },
    { value: "secondary", label: t("clinicalRecords.background.secondary") },
    { value: "higher_secondary", label: t("clinicalRecords.background.higherSecondary") },
    { value: "graduate", label: t("clinicalRecords.background.graduate") },
    { value: "postgrad", label: t("clinicalRecords.background.postgrad") },
  ];

  useEffect(() => {
    if (data) form.reset({
      education_level: data.education_level ?? "",
      occupation: data.occupation ?? "",
      occupational_health_note: data.occupational_health_note ?? "",
      family_history: data.family_history ?? "",
      lifestyle_notes: data.lifestyle_notes ?? "",
      ward_address: data.ward_address ?? "",
      ward_no: data.ward_no ?? "",
    });
  }, [data, form]);

  const handleSave = useCallback(async (v: any) => {
    await save(v);
    onSaved?.();
  }, [save, onSaved]);

  const { autoSaved } = useAutoSave({ form, save, enabled: !isLoading });

  const onSubmit = form.handleSubmit((v) => handleSave(v));

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card className="border-0 shadow-none sm:border sm:shadow-sm">
      <CardHeader className="px-0 py-2 sm:px-6 sm:pb-6">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base sm:text-lg">{t("clinicalRecords.background.title")}</CardTitle>
          <AutoPopulatedBadge source={data?.source} sourceRef={data?.source_ref} />
        </div>
        <CardDescription className="text-xs sm:text-sm">{t("clinicalRecords.background.description")}</CardDescription>
      </CardHeader>
      <CardContent className={`pt-0 px-0 sm:px-6 ${isMobile ? "pb-24" : ""}`}>
        <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t("clinicalRecords.background.educationLevel")}</Label>
              <p className="text-xs text-muted-foreground">{t("clinicalRecords.background.educationLevelDesc")}</p>
              <Select value={form.watch("education_level")} onValueChange={(v) => form.setValue("education_level", v)}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder={t("clinicalRecords.background.selectLevel")} /></SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t("clinicalRecords.background.occupation")}</Label>
              <p className="text-xs text-muted-foreground">{t("clinicalRecords.background.occupationDesc")}</p>
              <Input {...form.register("occupation")} placeholder={t("clinicalRecords.background.occupationPlaceholder")} className="min-h-[44px]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">{t("clinicalRecords.background.occupationalHealthNote")}</Label>
            <p className="text-xs text-muted-foreground">{t("clinicalRecords.background.occupationalHealthNoteDesc")}</p>
            <Textarea {...form.register("occupational_health_note")} placeholder={t("clinicalRecords.background.occupationalHealthNotePlaceholder")} rows={2} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t("clinicalRecords.background.wardAddress")}</Label>
              <Input {...form.register("ward_address")} placeholder={t("clinicalRecords.background.wardAddressPlaceholder")} className="min-h-[44px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t("clinicalRecords.background.wardNo")}</Label>
              <Input {...form.register("ward_no")} placeholder={t("clinicalRecords.background.wardNoPlaceholder")} className="min-h-[44px]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">{t("clinicalRecords.background.familyHistory")}</Label>
            <p className="text-xs text-muted-foreground">{t("clinicalRecords.background.familyHistoryDesc")}</p>
            <Textarea {...form.register("family_history")} placeholder={t("clinicalRecords.background.familyHistoryPlaceholder")} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">{t("clinicalRecords.background.lifestyleNotes")}</Label>
            <p className="text-xs text-muted-foreground">{t("clinicalRecords.background.lifestyleNotesDesc")}</p>
            <Textarea {...form.register("lifestyle_notes")} placeholder={t("clinicalRecords.background.lifestyleNotesPlaceholder")} rows={2} />
          </div>

          {!isMobile && (
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving} className="press-feedback">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("clinicalRecords.background.saveBackground")}
              </Button>
              {autoSaved && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t("clinicalRecords.autoSaved")}
                </span>
              )}
            </div>
          )}
        </form>

        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-20 px-4">
            <div className="flex items-center gap-2">
              <Button type="submit" onClick={onSubmit} disabled={saving} className="flex-1 min-h-[48px] press-feedback">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("clinicalRecords.background.saveBackground")}
              </Button>
              {autoSaved && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
