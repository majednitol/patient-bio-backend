import { useState } from "react";
import { Medication } from "@/hooks/usePrescriptions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pill, Plus, Trash2, Loader2, Calendar } from "lucide-react";

interface PrescriptionFormProps {
  onSubmit: (data: {
    diagnosis: string;
    medications: Medication[];
    instructions: string;
    notes: string;
    follow_up_date: string;
  }) => void;
  isSubmitting: boolean;
}

const emptyMedication: Medication = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

export default function PrescriptionForm({ onSubmit, isSubmitting }: PrescriptionFormProps) {
  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState<Medication[]>([{ ...emptyMedication }]);
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const addMedication = () => {
    setMedications([...medications, { ...emptyMedication }]);
  };

  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty medications
    const validMedications = medications.filter(
      (med) => med.name.trim() && med.dosage.trim()
    );

    if (validMedications.length === 0) {
      return;
    }

    onSubmit({
      diagnosis,
      medications: validMedications,
      instructions,
      notes,
      follow_up_date: followUpDate,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Pill className="h-4 w-4 text-primary" />
          New Prescription
        </CardTitle>
        <CardDescription>
          Create a digital prescription for this patient
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Diagnosis */}
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Input
              id="diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g., Upper Respiratory Infection"
            />
          </div>

          {/* Medications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Medications *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMedication}
                className="gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Medication
              </Button>
            </div>

            <div className="space-y-4">
              {medications.map((med, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-muted/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Medication {index + 1}</span>
                    {medications.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedication(index)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Drug Name *</Label>
                      <Input
                        value={med.name}
                        onChange={(e) => updateMedication(index, "name", e.target.value)}
                        placeholder="e.g., Amoxicillin"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Dosage *</Label>
                      <Input
                        value={med.dosage}
                        onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                        placeholder="e.g., 500mg"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Frequency</Label>
                      <Input
                        value={med.frequency}
                        onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                        placeholder="e.g., 3 times daily"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Duration</Label>
                      <Input
                        value={med.duration}
                        onChange={(e) => updateMedication(index, "duration", e.target.value)}
                        placeholder="e.g., 7 days"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Special Instructions</Label>
                    <Input
                      value={med.instructions || ""}
                      onChange={(e) => updateMedication(index, "instructions", e.target.value)}
                      placeholder="e.g., Take after meals"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">General Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Additional instructions for the patient..."
              rows={3}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Doctor's Notes (Private)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes (not shown to patient)..."
              rows={2}
            />
          </div>

          {/* Follow-up Date */}
          <div className="space-y-2">
            <Label htmlFor="follow_up" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Follow-up Date
            </Label>
            <Input
              id="follow_up"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !medications.some((m) => m.name && m.dosage)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Prescription...
              </>
            ) : (
              <>
                <Pill className="h-4 w-4 mr-2" />
                Create Prescription
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
