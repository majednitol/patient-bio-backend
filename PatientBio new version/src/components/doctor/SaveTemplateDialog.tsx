import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCreatePrescriptionTemplate } from "@/hooks/usePrescriptionTemplates";
import type { Medication } from "@/hooks/usePrescriptions";
import { Save, Loader2, Pill } from "lucide-react";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnosis?: string;
  medications: Medication[];
  instructions?: string;
}

export const SaveTemplateDialog = ({
  open,
  onOpenChange,
  diagnosis,
  medications,
  instructions,
}: SaveTemplateDialogProps) => {
  const [name, setName] = useState("");
  const createTemplate = useCreatePrescriptionTemplate();

  const handleSave = async () => {
    if (!name.trim()) return;

    await createTemplate.mutateAsync({
      name: name.trim(),
      diagnosis,
      medications,
      instructions,
    });

    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save this prescription as a reusable template for quick prescribing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="e.g., Common Cold Treatment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {diagnosis && (
            <div className="text-sm">
              <span className="text-muted-foreground">Diagnosis:</span>{" "}
              <span className="font-medium">{diagnosis}</span>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Medications:</span>
            <div className="flex flex-wrap gap-1">
              {medications.map((med, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  <Pill className="h-3 w-3 mr-1" />
                  {med.name} ({med.dosage})
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || createTemplate.isPending}
          >
            {createTemplate.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Save Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
