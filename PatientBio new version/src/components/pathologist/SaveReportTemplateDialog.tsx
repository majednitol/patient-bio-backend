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
import { Save, Loader2 } from "lucide-react";
import { useReportTemplateLibrary, TemplateStructure } from "@/hooks/useReportTemplateLibrary";

interface SaveReportTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportName: string;
  reportType: string;
  diseaseCategory: string;
  findings: string;
}

export const SaveReportTemplateDialog = ({
  open,
  onOpenChange,
  reportName,
  reportType,
  diseaseCategory,
  findings,
}: SaveReportTemplateDialogProps) => {
  const [name, setName] = useState("");
  const { createTemplate } = useReportTemplateLibrary();

  const handleSave = async () => {
    if (!name.trim()) return;

    const structure: TemplateStructure = {
      report_type: reportType,
      disease_category: diseaseCategory,
      findings_template: findings,
      icon: "📋",
    };

    await createTemplate.mutateAsync({
      name: name.trim(),
      category: diseaseCategory || undefined,
      test_type: reportType || undefined,
      template_structure: structure,
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
            Save as Report Template
          </DialogTitle>
          <DialogDescription>
            Save this report structure as a reusable template for future use
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="e.g., CBC with Differential"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {reportName && (
            <div className="text-sm">
              <span className="text-muted-foreground">Based on:</span>{" "}
              <span className="font-medium">{reportName}</span>
            </div>
          )}

          {reportType && (
            <div className="text-sm">
              <span className="text-muted-foreground">Type:</span>{" "}
              <span className="font-medium capitalize">{reportType.replace("_", " ")}</span>
            </div>
          )}
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
