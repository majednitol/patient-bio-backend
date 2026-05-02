import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FilePlus } from "lucide-react";
import { PathologistReport } from "@/hooks/usePathologistReports";

interface AddAddendumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: PathologistReport | null;
  onSubmit: (reportId: string, text: string) => void;
  isSubmitting: boolean;
}

export function AddAddendumDialog({
  open,
  onOpenChange,
  report,
  onSubmit,
  isSubmitting,
}: AddAddendumDialogProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !text.trim()) return;
    onSubmit(report.id, text.trim());
    setText("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus className="h-5 w-5 text-amber-600" />
            Add Addendum
          </DialogTitle>
          <DialogDescription>
            Append a note to "{report?.report_name}" without modifying the original findings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="addendum-text">Addendum Text *</Label>
            <Textarea
              id="addendum-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter amendment or additional findings..."
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              This will be timestamped and appended to the report. Original findings remain unchanged.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isSubmitting || !text.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Addendum"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
