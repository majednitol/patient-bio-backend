import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, RefreshCw, ArrowRight, FlaskConical } from "lucide-react";
import { useResearcherStudyNotes, type StudyNote } from "@/hooks/useResearcherStudyNotes";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const STATUSES = [
  { key: "draft", label: "Draft", color: "secondary" as const },
  { key: "submitted", label: "Submitted", color: "outline" as const },
  { key: "under_review", label: "Under Review", color: "default" as const },
  { key: "accepted", label: "Accepted", color: "default" as const },
  { key: "published", label: "Published", color: "default" as const },
] as const;

const PublicationTrackerPage = () => {
  const { notes, isLoading } = useResearcherStudyNotes();
  const queryClient = useQueryClient();

  const moveForward = async (note: StudyNote) => {
    const currentIdx = STATUSES.findIndex((s) => s.key === (note as any).publication_status);
    if (currentIdx >= STATUSES.length - 1) return;
    const nextStatus = STATUSES[currentIdx + 1].key;

    const { error } = await supabase
      .from("researcher_study_notes")
      .update({ publication_status: nextStatus } as any)
      .eq("id", note.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    } else {
      toast({ title: "Status Updated", description: `Moved to "${STATUSES[currentIdx + 1].label}"` });
      queryClient.invalidateQueries({ queryKey: ["researcher-study-notes"] });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" /> Publication Tracker
        </h1>
        <Card><CardContent className="py-12 flex justify-center"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
      </div>
    );
  }

  const notesByStatus = STATUSES.map((s) => ({
    ...s,
    notes: notes.filter((n: any) => (n.publication_status || "draft") === s.key),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" /> Publication Tracker
        </h1>
        <p className="text-muted-foreground">Track your research from draft to publication</p>
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <FlaskConical className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No study notes yet</h3>
            <p className="text-muted-foreground text-sm">Create study notes to track them through the publication pipeline.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-5">
          {notesByStatus.map((col) => (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="secondary" className="text-xs">{col.notes.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {col.notes.map((note: any) => (
                  <Card key={note.id} className="shadow-sm">
                    <CardContent className="p-3 space-y-2">
                      <p className="text-sm font-medium line-clamp-2">{note.study_title}</p>
                      {note.sample_size && (
                        <p className="text-xs text-muted-foreground">{note.sample_size} participants</p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{new Date(note.updated_at).toLocaleDateString()}</p>
                        {col.key !== "published" && (
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => moveForward(note)}>
                            <ArrowRight className="h-3 w-3 mr-1" />
                            Next
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {col.notes.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground">No notes</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicationTrackerPage;
