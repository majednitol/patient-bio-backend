import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useDoctorPatientNotes,
  useCreatePatientNote,
  useUpdatePatientNote,
  useDeletePatientNote,
} from "@/hooks/useDoctorPatientNotes";
import { useVoiceTranscription } from "@/hooks/useVoiceTranscription";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  StickyNote,
  Plus,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Mic,
  MicOff,
} from "lucide-react";

interface PatientNotesSectionProps {
  patientId: string;
}

export const PatientNotesSection = ({ patientId }: PatientNotesSectionProps) => {
  const { data: notes = [], isLoading } = useDoctorPatientNotes(patientId);
  const createNote = useCreatePatientNote();
  const updateNote = useUpdatePatientNote();
  const deleteNote = useDeletePatientNote();

  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const onVoiceResult = useCallback((text: string) => {
    if (isAdding) {
      setNewNote((prev) => (prev ? prev + " " + text : text));
    } else if (editingId) {
      setEditText((prev) => (prev ? prev + " " + text : text));
    }
  }, [isAdding, editingId]);

  const voice = useVoiceTranscription(onVoiceResult);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    await createNote.mutateAsync({ patientId, note: newNote.trim() });
    setNewNote("");
    setIsAdding(false);
  };

  const handleTogglePin = (noteId: string, currentPinned: boolean) => {
    updateNote.mutate({ noteId, is_pinned: !currentPinned, patientId });
  };

  const handleStartEdit = (noteId: string, currentText: string) => {
    setEditingId(noteId);
    setEditText(currentText);
  };

  const handleSaveEdit = (noteId: string) => {
    if (!editText.trim()) return;
    updateNote.mutate({ noteId, note: editText.trim(), patientId });
    setEditingId(null);
  };

  const handleDelete = (noteId: string) => {
    if (confirm("Delete this note?")) {
      deleteNote.mutate({ noteId, patientId });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          Private Notes
        </h3>
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
          <div className="relative">
            <Textarea
              placeholder="Write a private note about this patient..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px] pr-10"
              autoFocus
            />
            {voice.isSupported && (
              <Button
                variant={voice.isListening ? "destructive" : "ghost"}
                size="sm"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() => voice.isListening ? voice.stopListening() : voice.startListening()}
                title={voice.isListening ? "Stop dictation" : "Start dictation"}
                type="button"
              >
                {voice.isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
          {voice.isListening && (
            <p className="text-xs text-primary animate-pulse">🎙️ Listening... speak now</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewNote("");
                voice.stopListening();
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newNote.trim() || createNote.isPending}
            >
              {createNote.isPending && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
              Save Note
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 && !isAdding ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Add private notes about this patient for your reference"
        />
      ) : (
        <ScrollArea className="h-[250px]">
          <div className="space-y-2 pr-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className={cn(
                  "border rounded-lg p-3 transition-all",
                  note.is_pinned && "border-primary/50 bg-primary/5"
                )}
              >
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[60px]"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(note.id)}
                        disabled={!editText.trim()}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm whitespace-pre-wrap flex-1">
                        {note.note}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleTogglePin(note.id, note.is_pinned)}
                          title={note.is_pinned ? "Unpin" : "Pin"}
                        >
                          {note.is_pinned ? (
                            <PinOff className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Pin className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleStartEdit(note.id, note.note)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:text-destructive"
                          onClick={() => handleDelete(note.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {note.is_pinned && (
                        <Badge variant="secondary" className="text-xs">
                          Pinned
                        </Badge>
                      )}
                      <span
                        className="text-xs text-muted-foreground"
                        title={format(new Date(note.created_at), "PPpp")}
                      >
                        {formatDistanceToNow(new Date(note.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
