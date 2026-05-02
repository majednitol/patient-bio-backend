import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AtSign } from "lucide-react";

export interface DataReference {
  shareId: string;
  annotation: string;
}

interface StudyNoteDataReferencesProps {
  references: DataReference[];
  onChange: (refs: DataReference[]) => void;
}

export const StudyNoteDataReferences = ({ references, onChange }: StudyNoteDataReferencesProps) => {
  const [shareId, setShareId] = useState("");
  const [annotation, setAnnotation] = useState("");

  const addReference = () => {
    if (!shareId.trim() && !annotation.trim()) return;
    onChange([...references, { shareId: shareId.trim(), annotation: annotation.trim() }]);
    setShareId("");
    setAnnotation("");
  };

  const removeReference = (index: number) => {
    onChange(references.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <AtSign className="h-3.5 w-3.5" />
        Data References
      </Label>
      <p className="text-xs text-muted-foreground">
        Link specific patient shares and annotate clinical observations.
      </p>

      {references.length > 0 && (
        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          {references.map((ref, i) => (
            <div key={i} className="flex items-start gap-1.5 text-sm bg-muted/50 rounded p-1.5">
              <div className="flex-1 min-w-0">
                {ref.shareId && (
                  <Badge variant="secondary" className="text-[10px] mr-1">
                    @{ref.shareId.substring(0, 12)}
                  </Badge>
                )}
                <span className="text-xs">{ref.annotation}</span>
              </div>
              <button type="button" onClick={() => removeReference(i)} className="p-0.5 hover:bg-muted rounded">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Share ID (optional)"
          value={shareId}
          onChange={(e) => setShareId(e.target.value)}
          className="text-xs w-32 flex-shrink-0"
        />
        <Input
          placeholder="e.g., BP=180/120 — hypertensive crisis"
          value={annotation}
          onChange={(e) => setAnnotation(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addReference();
            }
          }}
          className="text-xs flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addReference}
          disabled={!shareId.trim() && !annotation.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
