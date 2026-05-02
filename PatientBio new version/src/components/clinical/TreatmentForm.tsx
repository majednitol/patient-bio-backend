import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AutoPopulatedBadge } from "./AutoPopulatedBadge";
import { useTreatments } from "@/hooks/useClinicalRecords";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Pill, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

const TREATMENT_TYPE_OPTIONS = ["medication", "therapy", "dialysis", "surgery", "dietary_intervention"];
const DIALYSIS_OPTIONS = ["no", "outpatient", "peritoneal", "hemodialysis"];

const EMPTY_FORM = {
  treatment_start_date: format(new Date(), "yyyy-MM-dd"),
  treatment_end_date: "",
  treatment_types: [] as string[],
  medication_name: "", medication_dose: "", medication_frequency: "",
  therapy_type: "", therapy_frequency: "", therapy_provider: "",
  dietary_intervention: false, dietary_notes: "",
  dialysis_status: "no", dialysis_frequency: "",
  notes: "", is_active: true,
};

export function TreatmentForm() {
  const { t } = useTranslation();
  const { data: treatments, isLoading, add, update, remove, adding } = useTreatments();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const toggleType = (tt: string) => setForm((p) => ({
    ...p,
    treatment_types: p.treatment_types.includes(tt) ? p.treatment_types.filter((x) => x !== tt) : [...p.treatment_types, tt],
  }));

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setShowAdd(false); setEditId(null); };

  const startEdit = (tr: any) => {
    setEditId(tr.id);
    setForm({
      treatment_start_date: tr.treatment_start_date ?? format(new Date(), "yyyy-MM-dd"),
      treatment_end_date: tr.treatment_end_date ?? "",
      treatment_types: (tr.treatment_types as string[]) ?? [],
      medication_name: tr.medication_name ?? "",
      medication_dose: tr.medication_dose ?? "",
      medication_frequency: tr.medication_frequency ?? "",
      therapy_type: tr.therapy_type ?? "",
      therapy_frequency: tr.therapy_frequency ?? "",
      therapy_provider: tr.therapy_provider ?? "",
      dietary_intervention: tr.dietary_intervention ?? false,
      dietary_notes: tr.dietary_notes ?? "",
      dialysis_status: tr.dialysis_status ?? "no",
      dialysis_frequency: tr.dialysis_frequency ?? "",
      notes: tr.notes ?? "",
      is_active: tr.is_active ?? true,
    });
    setShowAdd(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      treatment_end_date: form.treatment_end_date || null,
      notes: form.notes || null,
    };
    if (editId) {
      await update({ id: editId, ...payload });
    } else {
      await add(payload);
    }
    resetForm();
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const hasType = (tt: string) => form.treatment_types.includes(tt);

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between px-0 py-2 sm:px-6 sm:pb-6">
          <div>
            <CardTitle className="text-base sm:text-lg">{t("clinicalRecords.treatments.title")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t("clinicalRecords.treatments.description")}</CardDescription>
          </div>
          {!showAdd && <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> {t("clinicalRecords.add")}</Button>}
        </CardHeader>
        {showAdd && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("clinicalRecords.treatments.startDate")}</Label>
                  <Input type="date" value={form.treatment_start_date} onChange={(e) => setForm((p) => ({ ...p, treatment_start_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("clinicalRecords.treatments.endDate")}</Label>
                  <Input type="date" value={form.treatment_end_date} onChange={(e) => setForm((p) => ({ ...p, treatment_end_date: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("clinicalRecords.treatments.treatmentTypes")}</Label>
                <div className="flex flex-wrap gap-2">
                  {TREATMENT_TYPE_OPTIONS.map((tt) => (
                    <Badge key={tt} variant={hasType(tt) ? "default" : "outline"} className="cursor-pointer capitalize min-h-[44px] px-3 py-2 text-sm press-feedback" onClick={() => toggleType(tt)}>
                      {t(`clinicalRecords.treatments.${tt === "dietary_intervention" ? "dietaryIntervention" : tt}`)}
                    </Badge>
                  ))}
                </div>
              </div>

              {hasType("medication") && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 border rounded-lg">
                  <div className="space-y-1"><Label className="text-xs">{t("clinicalRecords.treatments.medicationName")}</Label><Input value={form.medication_name} onChange={(e) => setForm((p) => ({ ...p, medication_name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">{t("clinicalRecords.treatments.dose")}</Label><Input value={form.medication_dose} onChange={(e) => setForm((p) => ({ ...p, medication_dose: e.target.value }))} placeholder={t("clinicalRecords.treatments.dosePlaceholder")} /></div>
                  <div className="space-y-1"><Label className="text-xs">{t("clinicalRecords.treatments.frequency")}</Label><Input value={form.medication_frequency} onChange={(e) => setForm((p) => ({ ...p, medication_frequency: e.target.value }))} placeholder={t("clinicalRecords.treatments.frequencyPlaceholder")} /></div>
                </div>
              )}

              {hasType("therapy") && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 border rounded-lg">
                  <div className="space-y-1"><Label className="text-xs">{t("clinicalRecords.treatments.therapyType")}</Label><Input value={form.therapy_type} onChange={(e) => setForm((p) => ({ ...p, therapy_type: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">{t("clinicalRecords.treatments.therapyFrequency")}</Label><Input value={form.therapy_frequency} onChange={(e) => setForm((p) => ({ ...p, therapy_frequency: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">{t("clinicalRecords.treatments.therapyProvider")}</Label><Input value={form.therapy_provider} onChange={(e) => setForm((p) => ({ ...p, therapy_provider: e.target.value }))} /></div>
                </div>
              )}

              {hasType("dialysis") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("clinicalRecords.treatments.dialysisStatus")}</Label>
                    <Select value={form.dialysis_status} onValueChange={(v) => setForm((p) => ({ ...p, dialysis_status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DIALYSIS_OPTIONS.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">{t("clinicalRecords.treatments.dialysisFrequency")}</Label><Input value={form.dialysis_frequency} onChange={(e) => setForm((p) => ({ ...p, dialysis_frequency: e.target.value }))} placeholder={t("clinicalRecords.treatments.dialysisFrequencyPlaceholder")} /></div>
                </div>
              )}

              {hasType("dietary_intervention") && (
                <div className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.dietary_intervention} onCheckedChange={(v) => setForm((p) => ({ ...p, dietary_intervention: v }))} />
                    <Label className="text-sm">{t("clinicalRecords.treatments.activeDietaryIntervention")}</Label>
                  </div>
                  <Textarea value={form.dietary_notes} onChange={(e) => setForm((p) => ({ ...p, dietary_notes: e.target.value }))} placeholder={t("clinicalRecords.treatments.dietaryPlanPlaceholder")} rows={2} />
                </div>
              )}

              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder={t("clinicalRecords.treatments.notesPlaceholder")} rows={2} />

              <div className="flex gap-2">
                <Button type="submit" disabled={adding || form.treatment_types.length === 0}>
                  {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editId ? t("clinicalRecords.treatments.updateTreatment") : t("clinicalRecords.treatments.saveTreatment")}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>{t("clinicalRecords.cancel")}</Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {treatments && treatments.length > 0 && (
        <div className="space-y-2">
          {treatments.map((tr: any) => (
            <Card key={tr.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Pill className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(tr.treatment_types as string[] ?? []).map((tt: string) => <Badge key={tt} variant="secondary" className="capitalize text-xs">{tt.replace(/_/g, " ")}</Badge>)}
                      {!tr.is_active && <Badge variant="outline" className="text-xs">{t("clinicalRecords.treatments.inactive")}</Badge>}
                      <AutoPopulatedBadge source={tr.source} sourceRef={tr.source_ref} compact />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {tr.treatment_start_date && <span>{t("clinicalRecords.treatments.from")} {tr.treatment_start_date}</span>}
                      {tr.medication_name && <span className="ml-2">💊 {tr.medication_name} {tr.medication_dose}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(tr)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(tr.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
