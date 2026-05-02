import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudyNoteDataReferences, type DataReference } from "@/components/researcher/StudyNoteDataReferences";
import type { StudyNote, StudyNoteInput } from "@/hooks/useResearcherStudyNotes";

const SUGGESTED_TAGS = [
  "Phase 1", "Phase 2", "Phase 3", "Preliminary", "Final",
  "Cardiovascular", "Diabetes", "Oncology", "Neurology", "Immunology",
  "Literature Review", "Statistical Analysis", "Case Report", "Meta-Analysis",
];

interface StudyNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: StudyNote | null;
  shareId?: string;
  onSave: (data: StudyNoteInput & { id?: string }) => void;
  isSaving: boolean;
}

export const StudyNoteDialog = ({
  open,
  onOpenChange,
  note,
  shareId,
  onSave,
  isSaving,
}: StudyNoteDialogProps) => {
  const [form, setForm] = useState<StudyNoteInput>({
    study_title: "",
    methodology: "",
    findings: "",
    sample_size: undefined,
    is_published: false,
    publication_url: "",
    publication_status: "draft",
    share_id: shareId,
    tags: [],
    data_references: [],
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (note) {
      setForm({
        study_title: note.study_title,
        methodology: note.methodology || "",
        findings: note.findings || "",
        sample_size: note.sample_size || undefined,
        is_published: note.is_published,
        publication_url: note.publication_url || "",
        publication_status: (note as any).publication_status || "draft",
        share_id: note.share_id || shareId,
        tags: note.tags || [],
        data_references: (note as any).data_references || [],
      });
    } else {
      setForm({
        study_title: "",
        methodology: "",
        findings: "",
        sample_size: undefined,
        is_published: false,
        publication_url: "",
        publication_status: "draft",
        share_id: shareId,
        tags: [],
        data_references: [],
      });
    }
    setTagInput("");
  }, [note, shareId, open]);

  const handleSubmit = () => {
    if (!form.study_title.trim()) return;
    onSave(note ? { ...form, id: note.id } : form);
    onOpenChange(false);
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !(form.tags || []).includes(trimmed)) {
      setForm((f) => ({ ...f, tags: [...(f.tags || []), trimmed] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: (f.tags || []).filter((t) => t !== tag) }));
  };

  const unusedSuggestions = SUGGESTED_TAGS.filter((t) => !(form.tags || []).includes(t));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{note ? "Edit Study Note" : "New Study Note"}</DialogTitle>
          <DialogDescription>
            {note ? "Update your study note details." : "Capture methodology, findings, and publication info."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="study-title">Study Title *</Label>
            <Input
              id="study-title"
              value={form.study_title}
              onChange={(e) => setForm((f) => ({ ...f, study_title: e.target.value }))}
              placeholder="e.g., COVID-19 Antibody Response in Diabetic Patients"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            {(form.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(form.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addTag(tagInput)}
                disabled={!tagInput.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {unusedSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {unusedSuggestions.slice(0, 8).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="text-xs px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="methodology">Methodology</Label>
            <MarkdownEditor
              id="methodology"
              value={form.methodology || ""}
              onChange={(v) => setForm((f) => ({ ...f, methodology: v }))}
              placeholder="Describe the research methodology... (Markdown supported)"
              minRows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="findings">Findings</Label>
            <MarkdownEditor
              id="findings"
              value={form.findings || ""}
              onChange={(v) => setForm((f) => ({ ...f, findings: v }))}
              placeholder="Document your findings... (Markdown supported)"
              minRows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sample-size">Sample Size</Label>
              <Input
                id="sample-size"
                type="number"
                value={form.sample_size ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sample_size: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
                placeholder="e.g., 150"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pub-url">Publication URL</Label>
              <Input
                id="pub-url"
                value={form.publication_url}
                onChange={(e) => setForm((f) => ({ ...f, publication_url: e.target.value }))}
                placeholder="https://doi.org/..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Publication Status</Label>
            <Select value={form.publication_status || "draft"} onValueChange={(v) => setForm((f) => ({ ...f, publication_status: v, is_published: v === "published" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data References */}
          <StudyNoteDataReferences
            references={(form.data_references || []) as DataReference[]}
            onChange={(refs) => setForm((f) => ({ ...f, data_references: refs }))}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !form.study_title.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {note ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
