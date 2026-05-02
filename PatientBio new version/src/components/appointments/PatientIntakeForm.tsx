import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useAppointmentIntake, useSubmitIntake } from "@/hooks/useAppointmentIntake";
import { Loader2, ClipboardList, CheckCircle2 } from "lucide-react";

interface PatientIntakeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  doctorName?: string;
}

export function PatientIntakeForm({
  open,
  onOpenChange,
  appointmentId,
  doctorName,
}: PatientIntakeFormProps) {
  const { data: existingIntake, isLoading } = useAppointmentIntake(appointmentId);
  const submitIntake = useSubmitIntake();

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptomDuration, setSymptomDuration] = useState("");
  const [symptomSeverity, setSymptomSeverity] = useState("");
  const [selfMedications, setSelfMedications] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  useEffect(() => {
    if (existingIntake) {
      setChiefComplaint(existingIntake.chief_complaint || "");
      setSymptomDuration(existingIntake.symptom_duration || "");
      setSymptomSeverity(existingIntake.symptom_severity || "");
      setSelfMedications(existingIntake.self_medications || "");
      setAdditionalNotes(existingIntake.additional_notes || "");
    }
  }, [existingIntake]);

  const handleSubmit = async () => {
    await submitIntake.mutateAsync({
      appointmentId,
      data: {
        chief_complaint: chiefComplaint,
        symptom_duration: symptomDuration,
        symptom_severity: symptomSeverity,
        self_medications: selfMedications,
        additional_notes: additionalNotes,
      },
    });
    onOpenChange(false);
  };

  const isAlreadySubmitted = !!existingIntake;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Pre-Visit Intake Form
          </DialogTitle>
          <DialogDescription>
            {doctorName
              ? `Fill this out before your visit with Dr. ${doctorName} to save time.`
              : "Fill this out before your visit to help your doctor prepare."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {isAlreadySubmitted && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Previously submitted — you can update it
              </Badge>
            )}

            <div className="space-y-2">
              <Label htmlFor="chief-complaint">
                What is the main reason for your visit? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="chief-complaint"
                placeholder="Describe your symptoms or concern in detail..."
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptom-duration">How long have you had these symptoms?</Label>
              <Textarea
                id="symptom-duration"
                placeholder="e.g., 3 days, 2 weeks, since last month..."
                value={symptomDuration}
                onChange={(e) => setSymptomDuration(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Symptom Severity</Label>
              <RadioGroup value={symptomSeverity} onValueChange={setSymptomSeverity}>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mild" id="mild" />
                    <Label htmlFor="mild" className="font-normal text-green-600">
                      Mild
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="moderate" id="moderate" />
                    <Label htmlFor="moderate" className="font-normal text-amber-600">
                      Moderate
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="severe" id="severe" />
                    <Label htmlFor="severe" className="font-normal text-destructive">
                      Severe
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="self-medications">
                Any medications you've taken for this issue?
              </Label>
              <Textarea
                id="self-medications"
                placeholder="List any OTC or home remedies you've tried..."
                value={selfMedications}
                onChange={(e) => setSelfMedications(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional-notes">Anything else the doctor should know?</Label>
              <Textarea
                id="additional-notes"
                placeholder="Allergies, recent travel, lifestyle changes..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!chiefComplaint.trim() || submitIntake.isPending}
              >
                {submitIntake.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isAlreadySubmitted ? "Update Form" : "Submit Form"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
