import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { NoteVersionHistory } from "@/components/researcher/NoteVersionHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  FlaskConical,
  RefreshCw,
  Tag,
  X,
  History,
} from "lucide-react";
import { useResearcherStudyNotes, type StudyNote, type StudyNoteInput } from "@/hooks/useResearcherStudyNotes";
import { StudyNoteDialog } from "@/components/researcher/StudyNoteDialog";
import { NoteCommentsSection } from "@/components/researcher/NoteCommentsSection";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const ResearcherStudyNotesPage = () => {
  const { notes, isLoading, createNote, updateNote, deleteNote, isCreating, isUpdating } =
    useResearcherStudyNotes();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StudyNote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [historyNoteId, setHistoryNoteId] = useState<string | null>(null);
  const [historyNoteTitle, setHistoryNoteTitle] = useState("");
  const queryClient = useQueryClient();

  // Collect all unique tags across notes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => (n.tags || []).forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [notes]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      // Text search
      const matchesSearch =
        !search ||
        n.study_title.toLowerCase().includes(search.toLowerCase()) ||
        n.methodology?.toLowerCase().includes(search.toLowerCase()) ||
        n.findings?.toLowerCase().includes(search.toLowerCase()) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(search.toLowerCase()));

      // Tag filter
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => (n.tags || []).includes(tag));

      // Status filter
      const matchesStatus =
        !statusFilter || (n as any).publication_status === statusFilter;

      return matchesSearch && matchesTags && matchesStatus;
    });
  }, [notes, search, selectedTags, statusFilter]);

  const handleSave = (data: StudyNoteInput & { id?: string }) => {
    if (data.id) {
      updateNote({ ...data, id: data.id });
    } else {
      createNote(data);
    }
    setEditingNote(null);
  };

  const PUB_STATUSES = [
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "under_review", label: "Under Review" },
    { value: "accepted", label: "Accepted" },
    { value: "published", label: "Published" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Study Notes
          </h1>
          <p className="text-muted-foreground">
            Manage your research methodology, findings, and publications
          </p>
        </div>
        <Button onClick={() => { setEditingNote(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted-foreground font-medium mr-1">Status:</span>
          {PUB_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(statusFilter === s.value ? null : s.value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                statusFilter === s.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <Tag className="h-3.5 w-3.5 text-muted-foreground mr-1" />
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-1"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FlaskConical className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">
              {search || selectedTags.length || statusFilter ? "No matching notes" : "No study notes yet"}
            </h3>
            <p className="text-muted-foreground text-sm text-center max-w-md mt-2">
              {search || selectedTags.length || statusFilter
                ? "Try adjusting your filters."
                : "Create your first study note to capture methodology and findings."}
            </p>
            {!search && !selectedTags.length && !statusFilter && (
              <Button className="mt-4" onClick={() => { setEditingNote(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((note) => (
            <Card key={note.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{note.study_title}</CardTitle>
                    <CardDescription className="mt-1">
                      {new Date(note.updated_at).toLocaleDateString()}
                      {note.sample_size && ` • ${note.sample_size} participants`}
                    </CardDescription>
                  </div>
                   <div className="flex items-center gap-1 ml-2">
                    {(note as any).publication_status && (note as any).publication_status !== "draft" && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {(note as any).publication_status.replace("_", " ")}
                      </Badge>
                    )}
                    {note.is_published && (
                      <Badge variant="default" className="text-xs">Published</Badge>
                    )}
                    {(note as any).is_shared && (
                      <Badge variant="secondary" className="text-xs">Shared</Badge>
                    )}
                  </div>
                </div>
                {/* Tags */}
                {(note.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {note.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-primary/10"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {note.methodology && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Methodology</p>
                    <div className="text-sm line-clamp-3 prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{note.methodology}</ReactMarkdown>
                    </div>
                  </div>
                )}
                {note.findings && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Findings</p>
                    <div className="text-sm line-clamp-3 prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{note.findings}</ReactMarkdown>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {note.publication_url && (
                      <Button variant="ghost" size="sm" onClick={() => window.open(note.publication_url!, "_blank")}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={(note as any).is_shared || false}
                        onCheckedChange={async (checked) => {
                          await supabase.from("researcher_study_notes").update({ is_shared: checked } as any).eq("id", note.id);
                          queryClient.invalidateQueries({ queryKey: ["researcher-study-notes"] });
                        }}
                      />
                      <span className="text-xs text-muted-foreground">Share</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      title="Version History"
                      onClick={() => { setHistoryNoteId(note.id); setHistoryNoteTitle(note.study_title); }}>
                      <History className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => { setEditingNote(note); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(note.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {(note as any).is_shared && (
                  <NoteCommentsSection noteId={note.id} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StudyNoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        note={editingNote}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Study Note</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The note will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) { deleteNote(deleteId); setDeleteId(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <NoteVersionHistory
        noteId={historyNoteId || ""}
        noteTitle={historyNoteTitle}
        open={!!historyNoteId}
        onOpenChange={(open) => { if (!open) setHistoryNoteId(null); }}
      />
    </div>
  );
};

export default ResearcherStudyNotesPage;
