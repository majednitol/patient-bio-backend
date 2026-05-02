import { useState } from "react";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface AppointmentNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNote: string | null;
  onSave: (note: string) => void;
  isSaving?: boolean;
}

export function AppointmentNoteDialog({
  open,
  onOpenChange,
  currentNote,
  onSave,
  isSaving,
}: AppointmentNoteDialogProps) {
  const [note, setNote] = useState(currentNote || "");

  const handleSave = () => {
    onSave(note);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{currentNote ? "Edit Note" : "Add Note"}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <Textarea
          placeholder="E.g., Patient requested morning slot next time, needs lab results before visit..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className="resize-none"
        />
        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Note
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
