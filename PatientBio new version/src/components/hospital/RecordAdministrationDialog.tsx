import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useRecordAdministration, AdmissionMedication, MEDICATION_ROUTES } from "@/hooks/useAdmissionMedications";
import { Syringe, Loader2, Clock, SkipForward } from "lucide-react";
import { format } from "date-fns";

interface RecordAdministrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication: AdmissionMedication;
  admissionId: string;
}

export default function RecordAdministrationDialog({
  open,
  onOpenChange,
  medication,
  admissionId,
}: RecordAdministrationDialogProps) {
  const recordAdministration = useRecordAdministration();

  const [formData, setFormData] = useState({
    dose_given: medication.dosage,
    notes: "",
    skipped: false,
    skip_reason: "",
  });

  const handleSubmit = async () => {
    if (formData.skipped && !formData.skip_reason) {
      return;
    }

    if (!formData.skipped && !formData.dose_given) {
      return;
    }

    await recordAdministration.mutateAsync({
      admission_medication_id: medication.id,
      admission_id: admissionId,
      dose_given: formData.skipped ? "Skipped" : formData.dose_given,
      notes: formData.notes || undefined,
      skipped: formData.skipped,
      skip_reason: formData.skip_reason || undefined,
    });

    // Reset form and close
    setFormData({
      dose_given: medication.dosage,
      notes: "",
      skipped: false,
      skip_reason: "",
    });
    onOpenChange(false);
  };

  const routeLabel = MEDICATION_ROUTES.find(r => r.value === medication.route)?.label || medication.route;

  const isValid = formData.skipped 
    ? !!formData.skip_reason 
    : !!formData.dose_given;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            Record Administration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Medication Info */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{medication.medication_name}</h4>
              <Badge variant="outline">{routeLabel}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{medication.dosage}</span> • {medication.frequency}
            </div>
            {medication.last_administration && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last given: {format(new Date(medication.last_administration.administered_at), "MMM d, h:mm a")}
              </div>
            )}
          </div>

          {/* Skip Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <SkipForward className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="skip-toggle" className="cursor-pointer">
                Skip this dose
              </Label>
            </div>
            <Switch
              id="skip-toggle"
              checked={formData.skipped}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, skipped: checked }))}
            />
          </div>

          {formData.skipped ? (
            /* Skip Reason */
            <div className="space-y-2">
              <Label>Reason for skipping *</Label>
              <Textarea
                value={formData.skip_reason}
                onChange={(e) => setFormData(prev => ({ ...prev, skip_reason: e.target.value }))}
                placeholder="e.g., Patient refused, NPO status, adverse reaction..."
                rows={3}
              />
            </div>
          ) : (
            <>
              {/* Dose Given */}
              <div className="space-y-2">
                <Label>Dose Given *</Label>
                <Input
                  value={formData.dose_given}
                  onChange={(e) => setFormData(prev => ({ ...prev, dose_given: e.target.value }))}
                  placeholder="e.g., 500mg"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any observations..."
                  rows={2}
                />
              </div>
            </>
          )}

          {/* Timestamp Info */}
          <p className="text-xs text-muted-foreground">
            This will be recorded at: {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || recordAdministration.isPending}
            variant={formData.skipped ? "secondary" : "default"}
          >
            {recordAdministration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {formData.skipped ? "Record Skip" : "Record Administration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
