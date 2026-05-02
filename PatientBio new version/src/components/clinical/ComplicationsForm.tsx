import { useForm } from "react-hook-form";
import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useComplicationsStatus } from "@/hooks/useClinicalRecords";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { lookupICD10Code } from "@/lib/icd10CodeMapper";
import { AutoPopulatedBadge } from "./AutoPopulatedBadge";

const COMPLICATION_OPTIONS = [
  "neuropathy", "nephropathy", "retinopathy", "cardiovascular", "infection",
  "wound_healing", "amputation", "respiratory", "gastrointestinal", "other",
];

const RESPONSE_OPTION_KEYS = [
  { value: "controlled", key: "clinicalRecords.complications.controlled" },
  { value: "partially_controlled", key: "clinicalRecords.complications.partiallyControlled" },
  { value: "uncontrolled", key: "clinicalRecords.complications.uncontrolled" },
];

interface FormValues {
  current_complications: string[];
  complication_notes: string;
  treatment_response: string;
  follow_up_required: boolean;
  next_follow_up_date: string;
  notes: string;
}

interface ComplicationsFormProps {
  onSaved?: () => void;
}

export function ComplicationsForm({ onSaved }: ComplicationsFormProps) {
  const { t } = useTranslation();
  const { data, isLoading, save, saving } = useComplicationsStatus();
  const isMobile = useIsMobile();
  const form = useForm<FormValues>({
    defaultValues: { current_complications: [], complication_notes: "", treatment_response: "", follow_up_required: false, next_follow_up_date: "", notes: "" },
  });

  const complications = form.watch("current_complications");
  const followUp = form.watch("follow_up_required");

  useEffect(() => {
    if (data) form.reset({
      current_complications: (data.current_complications as string[]) ?? [],
      complication_notes: data.complication_notes ?? "",
      treatment_response: data.treatment_response ?? "",
      follow_up_required: data.follow_up_required ?? false,
      next_follow_up_date: data.next_follow_up_date ?? "",
      notes: data.notes ?? "",
    });
  }, [data, form]);

  const toggleComplication = (val: string) => {
    const current = form.getValues("current_complications");
    form.setValue("current_complications", current.includes(val) ? current.filter((c) => c !== val) : [...current, val]);
  };

  const transformBeforeSave = useCallback((v: FormValues) => {
    const icd10Mappings: Record<string, { code: string; description: string }> = {};
    v.current_complications.forEach((c) => {
      const result = lookupICD10Code(c.replace(/_/g, " "));
      if (result.code) {
        icd10Mappings[c] = { code: result.code, description: result.description };
      }
    });
    return {
      ...v,
      next_follow_up_date: v.next_follow_up_date || null,
      notes: v.notes || null,
      complication_notes: v.complication_notes || null,
      icd10_mappings: icd10Mappings,
    };
  }, []);

  const handleSave = useCallback(async (v: any) => {
    await save(v);
    onSaved?.();
  }, [save, onSaved]);

  const { autoSaved } = useAutoSave({ form, save, transformBeforeSave, enabled: !isLoading });

  const onSubmit = form.handleSubmit((v) => handleSave(transformBeforeSave(v)));

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card className="border-0 shadow-none sm:border sm:shadow-sm">
      <CardHeader className="px-0 py-2 sm:px-6 sm:pb-6">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base sm:text-lg">{t("clinicalRecords.complications.title")}</CardTitle>
          <AutoPopulatedBadge source={data?.source} sourceRef={data?.source_ref} />
        </div>
        <CardDescription className="text-xs sm:text-sm">{t("clinicalRecords.complications.description")}</CardDescription>
      </CardHeader>
      <CardContent className={`pt-0 px-0 sm:px-6 ${isMobile ? "pb-24" : ""}`}>
        <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label>{t("clinicalRecords.complications.currentComplications")}</Label>
            <p className="text-xs text-muted-foreground">{t("clinicalRecords.complications.currentComplicationsDesc")}</p>
            <div className="flex flex-wrap gap-2">
              {COMPLICATION_OPTIONS.map((c) => {
                const icd = lookupICD10Code(c.replace(/_/g, " "));
                const selected = complications.includes(c);
                return (
                  <Badge key={c} variant={selected ? "default" : "outline"} className="cursor-pointer capitalize gap-1 min-h-[44px] px-3 py-2 text-sm press-feedback" onClick={() => toggleComplication(c)}>
                    {c.replace(/_/g, " ")}
                    {icd.code && selected && (
                      <span className="font-mono text-[10px] opacity-70">{icd.code}</span>
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("clinicalRecords.complications.complicationNotes")}</Label>
            <p className="text-xs text-muted-foreground">{t("clinicalRecords.complications.complicationNotesDesc")}</p>
            <Textarea {...form.register("complication_notes")} placeholder={t("clinicalRecords.complications.complicationNotesPlaceholder")} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>{t("clinicalRecords.complications.treatmentResponse")}</Label>
            <p className="text-xs text-muted-foreground">{t("clinicalRecords.complications.treatmentResponseDesc")}</p>
            <RadioGroup value={form.watch("treatment_response")} onValueChange={(v) => form.setValue("treatment_response", v)} className="flex flex-wrap gap-2">
              {RESPONSE_OPTION_KEYS.map((r) => (
                <div key={r.value} className="flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-lg border cursor-pointer press-feedback has-[:checked]:bg-primary/10 has-[:checked]:border-primary/30">
                  <RadioGroupItem value={r.value} id={`resp-${r.value}`} />
                  <Label htmlFor={`resp-${r.value}`} className="font-normal cursor-pointer">{t(r.key)}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex items-center gap-3 min-h-[44px]">
            <Switch checked={followUp} onCheckedChange={(v) => form.setValue("follow_up_required", v)} />
            <Label>{t("clinicalRecords.complications.followUpRequired")}</Label>
          </div>

          {followUp && (
            <div className="space-y-2">
              <Label>{t("clinicalRecords.complications.nextFollowUpDate")}</Label>
              <Input type="date" {...form.register("next_follow_up_date")} className="max-w-[250px] min-h-[44px]" />
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("clinicalRecords.complications.additionalNotes")}</Label>
            <p className="text-xs text-muted-foreground">{t("clinicalRecords.complications.additionalNotesDesc")}</p>
            <Textarea {...form.register("notes")} placeholder={t("clinicalRecords.complications.additionalNotesPlaceholder")} rows={2} />
          </div>

          {!isMobile && (
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving} className="press-feedback">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("clinicalRecords.complications.saveStatus")}
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
                {t("clinicalRecords.complications.saveStatus")}
              </Button>
              {autoSaved && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
