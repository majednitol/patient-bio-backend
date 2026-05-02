import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { History, ChevronRight, ArrowLeft, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteVersion {
  id: string;
  note_id: string;
  version_number: number;
  title: string;
  content: string | null;
  methodology: string | null;
  findings: string | null;
  tags: string[];
  publication_status: string | null;
  created_at: string;
}

interface NoteVersionHistoryProps {
  noteId: string;
  noteTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NoteVersionHistory = ({
  noteId,
  noteTitle,
  open,
  onOpenChange,
}: NoteVersionHistoryProps) => {
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["study-note-versions", noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("researcher_study_note_versions")
        .select("id, note_id, version_number, title, content, methodology, findings, tags, publication_status, changed_by, snapshot, created_at")
        .eq("note_id", noteId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data || []) as NoteVersion[];
    },
    enabled: open && !!noteId,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSelectedVersion(null); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Version History
            <span className="text-muted-foreground font-normal text-sm truncate">
              — {noteTitle}
            </span>
          </DialogTitle>
        </DialogHeader>

        {selectedVersion ? (
          /* Detail view */
          <div className="flex-1 overflow-hidden flex flex-col">
            <Button
              variant="ghost"
              size="sm"
              className="self-start mb-2"
              onClick={() => setSelectedVersion(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
            </Button>

            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline">v{selectedVersion.version_number}</Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(selectedVersion.created_at).toLocaleString()}
              </span>
              {selectedVersion.publication_status && (
                <Badge variant="secondary" className="capitalize text-xs">
                  {selectedVersion.publication_status.replace("_", " ")}
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-1">Title</h4>
                  <p className="text-sm">{selectedVersion.title}</p>
                </div>

                {selectedVersion.methodology && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-1">Methodology</h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown>{selectedVersion.methodology}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {selectedVersion.findings && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-1">Findings</h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown>{selectedVersion.findings}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {(selectedVersion.tags || []).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-1">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedVersion.tags.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          /* List view */
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Loading versions…</div>
            ) : versions.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No previous versions yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Versions are saved automatically when you edit a note.</p>
              </div>
            ) : (
              <div className="space-y-1 pr-4">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVersion(v)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-md border border-transparent",
                      "hover:bg-muted/60 hover:border-border transition-colors",
                      "flex items-center gap-3 group"
                    )}
                  >
                    <Badge variant="outline" className="shrink-0 text-xs tabular-nums">
                      v{v.version_number}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{v.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                      </p>
                    </div>
                    {v.publication_status && v.publication_status !== "draft" && (
                      <Badge variant="secondary" className="text-xs capitalize shrink-0">
                        {v.publication_status.replace("_", " ")}
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
