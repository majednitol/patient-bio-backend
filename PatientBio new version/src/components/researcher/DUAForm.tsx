import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useDataUseAgreements } from "@/hooks/useDataUseAgreements";
import { useResearcherStudies } from "@/hooks/useResearcherStudies";
import { useResearcherProfile } from "@/hooks/useResearcherProfile";
import { Plus, Loader2, FileCheck } from "lucide-react";

const DATA_CATEGORIES = [
  { key: "demographics", label: "Demographics" },
  { key: "diagnoses", label: "Diagnoses & ICD-10" },
  { key: "lab_results", label: "Lab Results" },
  { key: "medications", label: "Medications" },
  { key: "vitals", label: "Vital Signs" },
  { key: "imaging", label: "Imaging" },
  { key: "procedures", label: "Procedures" },
  { key: "outcomes", label: "Outcomes" },
];

export const DUAForm = () => {
  const [open, setOpen] = useState(false);
  const { createAgreement, isCreating } = useDataUseAgreements();
  const { studies } = useResearcherStudies();
  const { profile } = useResearcherProfile();

  const [studyId, setStudyId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [retentionDays, setRetentionDays] = useState("365");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (!studyId || !purpose.trim()) return;
    await createAgreement({
      study_id: studyId,
      institution_name: profile?.institution_name || "",
      purpose: purpose.trim(),
      data_scope: { categories: selectedCategories },
      retention_period_days: parseInt(retentionDays) || 365,
    });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setStudyId("");
    setPurpose("");
    setRetentionDays("365");
    setSelectedCategories([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Agreement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Create Data Use Agreement
          </DialogTitle>
          <DialogDescription>
            Define the terms for data access in your research study.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Linked Study *</Label>
            <Select value={studyId} onValueChange={setStudyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a study" />
              </SelectTrigger>
              <SelectContent>
                {studies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Institution</Label>
            <Input value={profile?.institution_name || ""} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>Purpose of Data Use *</Label>
            <Textarea
              placeholder="Describe how the data will be used in your research..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Categories</Label>
            <div className="grid grid-cols-2 gap-2">
              {DATA_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => toggleCategory(cat.key)}
                  className="flex items-center gap-2 p-2 rounded-md border hover:bg-muted text-sm text-left"
                >
                  <Checkbox checked={selectedCategories.includes(cat.key)} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Retention Period</Label>
            <Select value={retentionDays} onValueChange={setRetentionDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="730">2 years</SelectItem>
                <SelectItem value="1825">5 years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!studyId || !purpose.trim() || isCreating}
            className="w-full"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileCheck className="h-4 w-4 mr-2" />}
            Create Agreement (Draft)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
