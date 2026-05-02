import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddMedication, MEDICATION_FREQUENCIES, MEDICATION_ROUTES, MedicationRoute } from "@/hooks/useAdmissionMedications";
import { Pill, Loader2 } from "lucide-react";

interface AddMedicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admissionId: string;
}

// Common medications for autocomplete suggestions
const COMMON_MEDICATIONS = [
  "Paracetamol", "Ibuprofen", "Amoxicillin", "Omeprazole", "Metformin",
  "Amlodipine", "Atorvastatin", "Pantoprazole", "Ciprofloxacin", "Azithromycin",
  "Ceftriaxone", "Ranitidine", "Ondansetron", "Tramadol", "Diclofenac",
  "Metronidazole", "Dexamethasone", "Insulin", "Heparin", "Enoxaparin",
];

export default function AddMedicationDialog({
  open,
  onOpenChange,
  admissionId,
}: AddMedicationDialogProps) {
  const addMedication = useAddMedication();

  const [formData, setFormData] = useState({
    medication_name: "",
    dosage: "",
    frequency: "",
    route: "oral" as MedicationRoute,
    notes: "",
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleMedicationNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, medication_name: value }));
    
    if (value.length >= 2) {
      const filtered = COMMON_MEDICATIONS.filter(med =>
        med.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.medication_name || !formData.dosage || !formData.frequency) {
      return;
    }

    await addMedication.mutateAsync({
      admission_id: admissionId,
      medication_name: formData.medication_name,
      dosage: formData.dosage,
      frequency: formData.frequency,
      route: formData.route,
      notes: formData.notes || undefined,
    });

    // Reset form and close
    setFormData({
      medication_name: "",
      dosage: "",
      frequency: "",
      route: "oral",
      notes: "",
    });
    setSuggestions([]);
    onOpenChange(false);
  };

  const isValid = formData.medication_name && formData.dosage && formData.frequency;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Add Medication
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Medication Name with suggestions */}
          <div className="space-y-2">
            <Label>Medication Name *</Label>
            <div className="relative">
              <Input
                value={formData.medication_name}
                onChange={(e) => handleMedicationNameChange(e.target.value)}
                placeholder="e.g., Paracetamol"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                  {suggestions.map((med) => (
                    <button
                      key={med}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, medication_name: med }));
                        setSuggestions([]);
                      }}
                    >
                      {med}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dosage */}
          <div className="space-y-2">
            <Label>Dosage *</Label>
            <Input
              value={formData.dosage}
              onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
              placeholder="e.g., 500mg, 1 tablet, 5ml"
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Frequency *</Label>
            <Select
              value={formData.frequency}
              onValueChange={(v) => setFormData(prev => ({ ...prev, frequency: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {MEDICATION_FREQUENCIES.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Route */}
          <div className="space-y-2">
            <Label>Route</Label>
            <Select
              value={formData.route}
              onValueChange={(v) => setFormData(prev => ({ ...prev, route: v as MedicationRoute }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select route" />
              </SelectTrigger>
              <SelectContent>
                {MEDICATION_ROUTES.map((route) => (
                  <SelectItem key={route.value} value={route.value}>
                    {route.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Special Instructions</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special instructions..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || addMedication.isPending}
          >
            {addMedication.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Medication
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
