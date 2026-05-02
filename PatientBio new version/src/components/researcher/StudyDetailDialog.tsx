import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStudyMilestones } from "@/hooks/useResearcherStudies";
import type { ResearcherStudy } from "@/hooks/useResearcherStudies";
import { useStudyCollaborators } from "@/hooks/useStudyCollaborators";
import { useDataUseAgreements } from "@/hooks/useDataUseAgreements";
import { StudyCollaboratorManager } from "@/components/researcher/StudyCollaboratorManager";
import {
  CheckCircle2, Circle, Play, Plus, Trash2, Save,
  Calendar, Users, FileCheck, Clock, Loader2,
} from "lucide-react";

const DISEASE_CATEGORIES = [
  "cardiovascular", "diabetes", "respiratory", "oncology", "neurology",
  "immunology", "infectious_disease", "mental_health", "orthopedic", "dermatology",
];

interface StudyDetailDialogProps {
  study: ResearcherStudy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStudy: (studyId: string, updates: Record<string, unknown>) => void;
}

// Overview Tab
const OverviewTab = ({ study, onUpdateStudy }: { study: ResearcherStudy; onUpdateStudy: StudyDetailDialogProps["onUpdateStudy"] }) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(study.title);
  const [description, setDescription] = useState(study.description || "");
  const [notes, setNotes] = useState(study.notes || "");
  const [diseaseCategory, setDiseaseCategory] = useState(study.disease_categories?.[0] || "");
  const [sampleSize, setSampleSize] = useState(String(study.target_sample_size || ""));

  const handleSave = () => {
    onUpdateStudy(study.id, {
      title: title.trim(),
      description: description.trim() || null,
      notes: notes.trim() || null,
      disease_categories: diseaseCategory ? [diseaseCategory] : [],
      target_sample_size: sampleSize ? Number(sampleSize) : null,
    });
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Study Type</p>
            <p className="text-sm">{study.study_type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Disease Category</p>
            <p className="text-sm">{study.disease_categories?.[0]?.replace("_", " ") || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Sample Size</p>
            <p className="text-sm">{study.current_sample_size}/{study.target_sample_size || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Dates</p>
            <p className="text-sm">
              {study.start_date ? new Date(study.start_date).toLocaleDateString() : "—"} →{" "}
              {study.expected_end_date ? new Date(study.expected_end_date).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>
        {study.description && (
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Description</p>
            <p className="text-sm">{study.description}</p>
          </div>
        )}
        {study.notes && (
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{study.notes}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">Consent Scopes</p>
          <div className="flex flex-wrap gap-1">
            {study.consent_scopes?.length > 0 ? study.consent_scopes.map(s => (
              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
            )) : <span className="text-sm text-muted-foreground">None configured</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Disease Category</label>
          <Select value={diseaseCategory} onValueChange={setDiseaseCategory}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {DISEASE_CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Target Sample Size</label>
          <Input type="number" value={sampleSize} onChange={e => setSampleSize(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Study notes..." />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
        <Button onClick={handleSave} disabled={!title.trim()} className="gap-1.5">
          <Save className="h-3.5 w-3.5" /> Save Changes
        </Button>
      </div>
    </div>
  );
};

// Milestones Tab
const MilestonesTab = ({ studyId }: { studyId: string }) => {
  const { milestones, updateMilestone, addMilestone, deleteMilestone, isUpdating, isAdding, progress } = useStudyMilestones(studyId);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDue, setNewDue] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    addMilestone({ name: newName.trim(), description: newDesc.trim() || undefined, due_date: newDue || undefined });
    setNewName("");
    setNewDesc("");
    setNewDue("");
    setShowAdd(false);
  };

  const handleAdvance = (id: string, status: string) => {
    const next = status === "pending" ? "in_progress" : status === "in_progress" ? "completed" : status;
    if (next !== status) updateMilestone({ milestoneId: id, updates: { status: next } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Progress value={progress} className="flex-1 h-2" />
        <span className="text-xs text-muted-foreground font-medium">{progress}%</span>
        <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Milestone name *" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            <Input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || isAdding}>
                {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Add Milestone
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No milestones. Add one to get started.</p>
      ) : (
        <div className="space-y-2">
          {milestones.map((m, idx) => (
            <div key={m.id} className="flex items-start gap-3 group">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => handleAdvance(m.id, m.status)}
                  disabled={isUpdating || m.status === "completed"}
                  className="flex-shrink-0"
                >
                  {m.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : m.status === "in_progress" ? (
                    <Play className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40 group-hover:text-muted-foreground" />
                  )}
                </button>
                {idx < milestones.length - 1 && (
                  <div className={`w-px h-6 ${m.status === "completed" ? "bg-primary/30" : "bg-border"}`} />
                )}
              </div>
              <div className="flex-1 min-w-0 -mt-0.5">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${m.status === "completed" ? "text-muted-foreground line-through" : ""}`}>
                    {m.name}
                  </span>
                  {m.due_date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                  <button
                    onClick={() => deleteMilestone(m.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Agreements Tab
const AgreementsTab = ({ studyId }: { studyId: string }) => {
  const { agreements, isLoading, getEffectiveExpiry } = useDataUseAgreements();
  const studyAgreements = agreements.filter(a => a.study_id === studyId);

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const statusColor: Record<string, string> = {
    draft: "secondary",
    submitted: "outline",
    approved: "default",
    expired: "destructive",
  };

  return (
    <div className="space-y-3">
      {studyAgreements.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No Data Use Agreements linked to this study.</p>
      ) : (
        studyAgreements.map(a => (
          <Card key={a.id}>
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{a.purpose}</p>
                <p className="text-xs text-muted-foreground">{a.institution_name} • Expires {getEffectiveExpiry(a).toLocaleDateString()}</p>
              </div>
              <Badge variant={statusColor[a.status] as any || "secondary"}>{a.status}</Badge>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export const StudyDetailDialog = ({ study, open, onOpenChange, onUpdateStudy }: StudyDetailDialogProps) => {
  const { collaborators } = useStudyCollaborators(study.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {study.title}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="overview">
          <TabsList className="w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Team
              {collaborators.length > 0 && <Badge variant="secondary" className="text-xs h-5 px-1.5">{collaborators.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="agreements" className="gap-1.5">
              <FileCheck className="h-3.5 w-3.5" />
              DUAs
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <OverviewTab study={study} onUpdateStudy={onUpdateStudy} />
          </TabsContent>
          <TabsContent value="milestones">
            <MilestonesTab studyId={study.id} />
          </TabsContent>
          <TabsContent value="team">
            <StudyCollaboratorManager studyId={study.id} studyTitle={study.title} embedded />
          </TabsContent>
          <TabsContent value="agreements">
            <AgreementsTab studyId={study.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
