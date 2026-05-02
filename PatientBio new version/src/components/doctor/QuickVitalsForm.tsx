import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useRecordVitals, usePatientVitalsHistory } from "@/hooks/usePatientVitals";
import { Activity, Heart, Thermometer, Wind, Weight, Check, Loader2 } from "lucide-react";

interface QuickVitalsFormProps {
  patientId: string;
  appointmentId?: string;
  hospitalId?: string;
}

export const QuickVitalsForm = ({ patientId, appointmentId, hospitalId }: QuickVitalsFormProps) => {
  const recordVitals = useRecordVitals();
  const { data: history = [] } = usePatientVitalsHistory(patientId, 1);
  const lastVitals = history[0];
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    bp_systolic: "",
    bp_diastolic: "",
    heart_rate: "",
    temperature: "",
    spo2: "",
    weight: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const hasAnyValue = Object.values(form).some((v) => v.trim() !== "");

  const handleSave = async () => {
    if (!hasAnyValue) return;
    await recordVitals.mutateAsync({
      patient_id: patientId,
      appointment_id: appointmentId,
      hospital_id: hospitalId,
      bp_systolic: form.bp_systolic ? Number(form.bp_systolic) : null,
      bp_diastolic: form.bp_diastolic ? Number(form.bp_diastolic) : null,
      heart_rate: form.heart_rate ? Number(form.heart_rate) : null,
      temperature: form.temperature ? Number(form.temperature) : null,
      spo2: form.spo2 ? Number(form.spo2) : null,
      weight: form.weight ? Number(form.weight) : null,
    });
    setSaved(true);
  };

  if (saved) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-3 pb-2 flex items-center gap-2 text-sm text-primary">
          <Check className="h-4 w-4" />
          Vitals recorded
          {form.bp_systolic && ` · BP ${form.bp_systolic}/${form.bp_diastolic}`}
          {form.heart_rate && ` · HR ${form.heart_rate}`}
          {form.temperature && ` · ${form.temperature}°F`}
          {form.spo2 && ` · SpO₂ ${form.spo2}%`}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-3 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Quick Vitals
          {lastVitals && (
            <span className="text-xs font-normal text-muted-foreground">
              (Last: {lastVitals.bp_systolic ? `BP ${lastVitals.bp_systolic}/${lastVitals.bp_diastolic}` : ""}
              {lastVitals.heart_rate ? ` HR ${lastVitals.heart_rate}` : ""})
            </span>
          )}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Heart className="h-3 w-3" /> BP (sys/dia)
            </Label>
            <div className="flex gap-1">
              <Input
                type="number"
                placeholder="120"
                className="h-8 text-sm"
                value={form.bp_systolic}
                onChange={(e) => update("bp_systolic", e.target.value)}
              />
              <Input
                type="number"
                placeholder="80"
                className="h-8 text-sm"
                value={form.bp_diastolic}
                onChange={(e) => update("bp_diastolic", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Activity className="h-3 w-3" /> HR (bpm)
            </Label>
            <Input
              type="number"
              placeholder="72"
              className="h-8 text-sm"
              value={form.heart_rate}
              onChange={(e) => update("heart_rate", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Thermometer className="h-3 w-3" /> Temp (°F)
            </Label>
            <Input
              type="number"
              step="0.1"
              placeholder="98.6"
              className="h-8 text-sm"
              value={form.temperature}
              onChange={(e) => update("temperature", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Wind className="h-3 w-3" /> SpO₂ (%)
            </Label>
            <Input
              type="number"
              placeholder="98"
              className="h-8 text-sm"
              value={form.spo2}
              onChange={(e) => update("spo2", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Weight className="h-3 w-3" /> Weight (kg)
            </Label>
            <Input
              type="number"
              step="0.1"
              placeholder="70"
              className="h-8 text-sm"
              value={form.weight}
              onChange={(e) => update("weight", e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              className="w-full h-8"
              onClick={handleSave}
              disabled={!hasAnyValue || recordVitals.isPending}
            >
              {recordVitals.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save Vitals"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
