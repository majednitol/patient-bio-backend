import { useForm } from "react-hook-form";
import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useComorbidities } from "@/hooks/useClinicalRecords";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { lookupICD10Code } from "@/lib/icd10CodeMapper";
import { AutoPopulatedBadge } from "./AutoPopulatedBadge";

const COMORBIDITY_OPTIONS = [
  "obesity", "diabetes", "hypertension", "kidney_disease", "cancer",
  "chronic_pain", "asthma", "copd", "heart_disease", "stroke",
  "liver_disease", "thyroid_disorder", "depression", "anxiety",
];

const SMOKING_OPTIONS = ["never", "former", "current"];
const ALCOHOL_OPTIONS = ["none", "occasional", "regular"];

interface FormValues {
  comorbidity_list: string[];
  smoking_status: string;
  pack_years: string;
  alcohol_consumption: string;
  units_per_week: string;
  other_risk_factors: string;
}

interface ComorbidityFormProps {
  onSaved?: () => void;
}

export function ComorbidityForm({ onSaved }: ComorbidityFormProps) {
  const { t } = useTranslation();
  const { data, isLoading, save, saving } = useComorbidities();
  const isMobile = useIsMobile();
  const form = useForm<FormValues>({
    defaultValues: { comorbidity_list: [], smoking_status: "", pack_years: "", alcohol_consumption: "", units_per_week: "", other_risk_factors: "" },
  });

  const smokingStatus = form.watch("smoking_status");
  const alcoholConsumption = form.watch("alcohol_consumption");
  const selectedComorbidities = form.watch("comorbidity_list");

  useEffect(() => {
    if (data) form.reset({
      comorbidity_list: (data.comorbidity_list as string[]) ?? [],
      smoking_status: data.smoking_status ?? "",
      pack_years: data.pack_years?.toString() ?? "",
      alcohol_consumption: data.alcohol_consumption ?? "",
      units_per_week: data.units_per_week?.toString() ?? "",
      other_risk_factors: data.other_risk_factors ?? "",
    });
  }, [data, form]);

  const toggleComorbidity = (val: string) => {
    const current = form.getValues("comorbidity_list");
    form.setValue("comorbidity_list", current.includes(val) ? current.filter((c) => c !== val) : [...current, val]);
  };

  const transformBeforeSave = useCallback((v: FormValues) => {
    const icd10Mappings: Record<string, { code: string; description: string }> = {};
    v.comorbidity_list.forEach((c) => {
      const result = lookupICD10Code(c.replace(/_/g, " "));
      if (result.code) {
        icd10Mappings[c] = { code: result.code, description: result.description };
      }
    });
    return {
      ...v,
      pack_years: v.pack_years ? Number(v.pack_years) : null,
      units_per_week: v.units_per_week ? Number(v.units_per_week) : null,
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
          <CardTitle className="text-base sm:text-lg">{t("clinicalRecords.comorbidities.title")}</CardTitle>
          <AutoPopulatedBadge source={data?.source} sourceRef={data?.source_ref} />
        </div>
        <CardDescription className="text-xs sm:text-sm">{t("clinicalRecords.comorbidities.description")}</CardDescription>
      </CardHeader>
      <CardContent className={`pt-0 px-0 sm:px-6 ${isMobile ? "pb-24" : ""}`}>
        <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label>{t("clinicalRecords.comorbidities.conditions")}</Label>
            <p className="text-xs text-muted-foreground">{t("clinicalRecords.comorbidities.conditionsDesc")}</p>
            <div className="flex flex-wrap gap-2">
              {COMORBIDITY_OPTIONS.map((c) => {
                const icd = lookupICD10Code(c.replace(/_/g, " "));
                const selected = selectedComorbidities.includes(c);
                return (
                  <Badge
                    key={c}
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer capitalize gap-1 min-h-[44px] px-3 py-2 text-sm press-feedback"
                    onClick={() => toggleComorbidity(c)}
                  >
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
            <Label>{t("clinicalRecords.comorbidities.smokingStatus")}</Label>
            <p className="text-xs text-muted-foreground">{t("clinicalRecords.comorbidities.smokingStatusDesc")}</p>
            <RadioGroup value={smokingStatus} onValueChange={(v) => form.setValue("smoking_status", v)} className="flex flex-wrap gap-2">
              {SMOKING_OPTIONS.map((s) => (
                <div key={s} className="flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-lg border cursor-pointer press-feedback has-[:checked]:bg-primary/10 has-[:checked]:border-primary/30">
                  <RadioGroupItem value={s} id={`smoke-${s}`} />
                  <Label htmlFor={`smoke-${s}`} className="font-normal cursor-pointer">{t(`clinicalRecords.comorbidities.${s}`)}</Label>
                </div>
              ))}
            </RadioGroup>
            {(smokingStatus === "current" || smokingStatus === "former") && (
              <div className="space-y-1 mt-2">
                <Label className="text-xs text-muted-foreground">{t("clinicalRecords.comorbidities.packYears")}</Label>
                <Input {...form.register("pack_years")} type="number" step="0.1" placeholder="e.g. 10" className="max-w-[200px] min-h-[44px]" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("clinicalRecords.comorbidities.alcoholConsumption")}</Label>
            <p className="text-xs text-muted-foreground">{t("clinicalRecords.comorbidities.alcoholConsumptionDesc")}</p>
            <RadioGroup value={alcoholConsumption} onValueChange={(v) => form.setValue("alcohol_consumption", v)} className="flex flex-wrap gap-2">
              {ALCOHOL_OPTIONS.map((a) => (
                <div key={a} className="flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-lg border cursor-pointer press-feedback has-[:checked]:bg-primary/10 has-[:checked]:border-primary/30">
                  <RadioGroupItem value={a} id={`alc-${a}`} />
                  <Label htmlFor={`alc-${a}`} className="font-normal cursor-pointer">{t(`clinicalRecords.comorbidities.${a}`)}</Label>
                </div>
              ))}
            </RadioGroup>
            {alcoholConsumption === "regular" && (
              <div className="space-y-1 mt-2">
                <Label className="text-xs text-muted-foreground">{t("clinicalRecords.comorbidities.unitsPerWeek")}</Label>
                <Input {...form.register("units_per_week")} type="number" placeholder="e.g. 14" className="max-w-[200px] min-h-[44px]" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("clinicalRecords.comorbidities.otherRiskFactors")}</Label>
            <p className="text-xs text-muted-foreground">{t("clinicalRecords.comorbidities.otherRiskFactorsDesc")}</p>
            <Textarea {...form.register("other_risk_factors")} placeholder={t("clinicalRecords.comorbidities.otherRiskFactorsPlaceholder")} rows={2} />
          </div>

          {!isMobile && (
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving} className="press-feedback">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("clinicalRecords.comorbidities.saveComorbidities")}
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
                {t("clinicalRecords.comorbidities.saveComorbidities")}
              </Button>
              {autoSaved && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
