import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useClinicalInvestigations } from "@/hooks/useClinicalRecords";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, FlaskConical, Pencil, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AbnormalBadge } from "./AbnormalBadge";
import { AutoPopulatedBadge } from "./AutoPopulatedBadge";
import { InvestigationTrendChart } from "./InvestigationTrendChart";
import { getRangeForField, getFieldStatus, getStatusBgColor, hasAbnormalValues, LOINC_CODES } from "@/lib/clinicalReferenceRanges";

const INVESTIGATION_TYPE_KEYS = [
  { value: "cbc", key: "clinicalRecords.investigations.cbc" },
  { value: "creatinine_egfr", key: "clinicalRecords.investigations.creatinine_egfr" },
  { value: "hba1c", key: "clinicalRecords.investigations.hba1c" },
  { value: "fbs", key: "clinicalRecords.investigations.fbs" },
  { value: "lipid_profile", key: "clinicalRecords.investigations.lipid_profile" },
  { value: "urinalysis", key: "clinicalRecords.investigations.urinalysis" },
  { value: "imaging", key: "clinicalRecords.investigations.imaging" },
  { value: "other", key: "clinicalRecords.investigations.other" },
];

const SUBFIELDS: Record<string, string[]> = {
  cbc: ["hgb", "wbc", "platelets", "rbc", "hct"],
  creatinine_egfr: ["creatinine", "egfr"],
  hba1c: ["hba1c_percent"],
  fbs: ["fbs_mg_dl"],
  lipid_profile: ["total_cholesterol", "ldl", "hdl", "triglycerides"],
  urinalysis: ["protein", "glucose", "blood", "ph"],
};

const IMAGING_TYPE_KEYS = [
  { value: "xr", key: "clinicalRecords.investigations.xray" },
  { value: "us", key: "clinicalRecords.investigations.ultrasound" },
  { value: "ct", key: "clinicalRecords.investigations.ctScan" },
  { value: "mri", key: "clinicalRecords.investigations.mri" },
];

export function InvestigationForm() {
  const { t } = useTranslation();
  const { data: investigations, isLoading, add, update, remove, adding } = useClinicalInvestigations();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [type, setType] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [results, setResults] = useState<Record<string, string>>({});
  const [vitals, setVitals] = useState({ bp_systolic: "", bp_diastolic: "", weight_kg: "", height_cm: "" });
  const [imagingType, setImagingType] = useState("");
  const [imagingRef, setImagingRef] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setType(""); setDate(format(new Date(), "yyyy-MM-dd")); setResults({}); setVitals({ bp_systolic: "", bp_diastolic: "", weight_kg: "", height_cm: "" }); setImagingType(""); setImagingRef(""); setNotes(""); setShowAdd(false); setEditId(null);
  };

  const startEdit = (inv: any) => {
    setEditId(inv.id);
    setType(inv.investigation_type ?? "");
    setDate(inv.investigation_date ?? format(new Date(), "yyyy-MM-dd"));
    const r = (inv.results as Record<string, unknown>) ?? {};
    setResults(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "")])));
    setVitals({
      bp_systolic: inv.bp_systolic?.toString() ?? "",
      bp_diastolic: inv.bp_diastolic?.toString() ?? "",
      weight_kg: inv.weight_kg?.toString() ?? "",
      height_cm: inv.height_cm?.toString() ?? "",
    });
    setImagingType(inv.imaging_type ?? "");
    setImagingRef(inv.imaging_reference ?? "");
    setNotes(inv.notes ?? "");
    setShowAdd(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = vitals.weight_kg ? Number(vitals.weight_kg) : null;
    const h = vitals.height_cm ? Number(vitals.height_cm) : null;
    const bmi = w && h ? Math.round((w / ((h / 100) ** 2)) * 10) / 10 : null;
    const filteredResults = Object.fromEntries(Object.entries(results).filter(([, v]) => v));
    const bpSys = vitals.bp_systolic ? Number(vitals.bp_systolic) : null;
    const bpDia = vitals.bp_diastolic ? Number(vitals.bp_diastolic) : null;
    const abnormal = hasAbnormalValues(type, filteredResults, bpSys, bpDia, bmi);
    const loinc = LOINC_CODES[type]?.code ?? null;

    const payload = {
      investigation_date: date,
      investigation_type: type,
      results: filteredResults,
      bp_systolic: bpSys,
      bp_diastolic: bpDia,
      weight_kg: w,
      height_cm: h,
      bmi,
      imaging_type: type === "imaging" ? imagingType : null,
      imaging_reference: type === "imaging" ? imagingRef : null,
      notes: notes || null,
      has_abnormal_values: abnormal,
      loinc_code: loinc,
    };

    if (editId) {
      await update({ id: editId, ...payload });
    } else {
      await add(payload);
    }
    resetForm();
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const typeGroups = [...new Set((investigations ?? []).map((i: any) => i.investigation_type))].filter(Boolean);

  const vitalFields = [
    { key: "bp_systolic", label: t("clinicalRecords.investigations.bpSystolic"), placeholder: "mmHg" },
    { key: "bp_diastolic", label: t("clinicalRecords.investigations.bpDiastolic"), placeholder: "mmHg" },
    { key: "weight_kg", label: t("clinicalRecords.investigations.weightKg"), placeholder: "" },
    { key: "height_cm", label: t("clinicalRecords.investigations.heightCm"), placeholder: "" },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between px-0 py-2 sm:px-6 sm:pb-6">
          <div>
            <CardTitle className="text-base sm:text-lg">{t("clinicalRecords.investigations.title")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t("clinicalRecords.investigations.description")}</CardDescription>
          </div>
          {!showAdd && (
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" /> {t("clinicalRecords.add")}
            </Button>
          )}
        </CardHeader>
        {showAdd && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("clinicalRecords.investigations.investigationType")}</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue placeholder={t("clinicalRecords.investigations.selectType")} /></SelectTrigger>
                    <SelectContent>
                      {INVESTIGATION_TYPE_KEYS.map((it) => <SelectItem key={it.value} value={it.value}>{t(it.key)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {type && LOINC_CODES[type] && (
                    <span className="text-[10px] text-muted-foreground">LOINC: {LOINC_CODES[type].code} — {LOINC_CODES[type].display}</span>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("clinicalRecords.investigations.date")}</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              {type && SUBFIELDS[type] && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("clinicalRecords.investigations.results")}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SUBFIELDS[type].map((f) => {
                      const range = getRangeForField(type, f);
                      const val = results[f] ? Number(results[f]) : null;
                      const status = val != null && range ? getFieldStatus(val, range) : "unknown";
                      return (
                        <div key={f} className={`space-y-1 p-2 rounded-md border ${val != null && range ? getStatusBgColor(status) : ""}`}>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-muted-foreground uppercase">{f.replace(/_/g, " ")}</Label>
                            {val != null && range && <AbnormalBadge status={status} value={val} label={range.label} unit={range.unit} low={range.low} high={range.high} />}
                          </div>
                          <Input type="number" step="any" value={results[f] ?? ""} onChange={(e) => setResults((p) => ({ ...p, [f]: e.target.value }))} placeholder={range ? `${range.low}–${range.high}` : "—"} />
                          {range && <span className="text-[10px] text-muted-foreground">Ref: {range.low}–{range.high} {range.unit}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {type === "imaging" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("clinicalRecords.investigations.imagingType")}</Label>
                    <Select value={imagingType} onValueChange={setImagingType}>
                      <SelectTrigger><SelectValue placeholder={t("clinicalRecords.investigations.selectType")} /></SelectTrigger>
                      <SelectContent>
                        {IMAGING_TYPE_KEYS.map((it) => <SelectItem key={it.value} value={it.value}>{t(it.key)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("clinicalRecords.investigations.referenceLink")}</Label>
                    <Input value={imagingRef} onChange={(e) => setImagingRef(e.target.value)} placeholder={t("clinicalRecords.investigations.referenceLinkPlaceholder")} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("clinicalRecords.investigations.clinicalParameters")}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {vitalFields.map((v) => (
                    <div key={v.key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{v.label}</Label>
                      <Input type="number" step="0.1" value={(vitals as any)[v.key]} onChange={(e) => setVitals((p) => ({ ...p, [v.key]: e.target.value }))} placeholder={v.placeholder} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("clinicalRecords.investigations.notes")}</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t("clinicalRecords.investigations.notesPlaceholder")} />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={adding || !type}>
                  {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editId ? t("clinicalRecords.investigations.updateInvestigation") : t("clinicalRecords.investigations.saveInvestigation")}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>{t("clinicalRecords.cancel")}</Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {investigations && investigations.length >= 2 && typeGroups.map((tg) => (
        <InvestigationTrendChart key={tg} investigations={investigations} investigationType={tg as string} />
      ))}

      {investigations && investigations.length > 0 && (
        <div className="space-y-2">
          {investigations.map((inv: any) => {
            const abnormal = inv.has_abnormal_values;
            return (
              <Card key={inv.id} className={`p-4 ${abnormal ? "border-red-300 dark:border-red-700" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FlaskConical className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="capitalize text-xs">{(inv.investigation_type ?? "").replace(/_/g, " ")}</Badge>
                        {inv.loinc_code && <span className="text-[10px] text-muted-foreground font-mono">LOINC:{inv.loinc_code}</span>}
                        {abnormal && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                        <AutoPopulatedBadge source={inv.source} sourceRef={inv.source_ref} compact />
                        {inv.investigation_date && <span className="text-xs text-muted-foreground">{inv.investigation_date}</span>}
                      </div>
                      {inv.results && Object.keys(inv.results).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(inv.results as Record<string, unknown>).map(([k, v]) => {
                            const range = getRangeForField(inv.investigation_type ?? "", k);
                            const val = Number(v);
                            const status = !isNaN(val) && range ? getFieldStatus(val, range) : "unknown";
                            return (
                              <span key={k} className={`text-xs px-1.5 py-0.5 rounded border ${range ? getStatusBgColor(status) : "bg-muted"}`}>
                                {k.replace(/_/g, " ")}: {String(v)}
                                {range && <AbnormalBadge status={status} value={val} label={range.label} unit={range.unit} low={range.low} high={range.high} />}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {(inv.bp_systolic || inv.weight_kg) && (
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                          {inv.bp_systolic && <span>BP: {inv.bp_systolic}/{inv.bp_diastolic}</span>}
                          {inv.weight_kg && <span>Wt: {inv.weight_kg}kg</span>}
                          {inv.bmi && <span>BMI: {inv.bmi}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(inv)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(inv.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
