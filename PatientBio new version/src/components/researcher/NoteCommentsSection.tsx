import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Send, MessageSquare, Loader2 } from "lucide-react";
import { useNoteComments } from "@/hooks/useNoteComments";
import { useAuth } from "@/contexts/AuthContext";

interface NoteCommentsSectionProps {
  noteId: string;
}

export const NoteCommentsSection = ({ noteId }: NoteCommentsSectionProps) => {
  const { user } = useAuth();
  const { comments, isLoading, addComment, deleteComment, isAdding } = useNoteComments(noteId);
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!text.trim()) return;
    addComment({ noteId, text: text.trim() });
    setText("");
  };

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <h4 className="text-sm font-medium flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" />
        Comments ({comments.length})
      </h4>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                <p className="text-sm">{c.comment_text}</p>
              </div>
              {c.researcher_id === user?.id && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteComment(c.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Add a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="text-sm"
        />
        <Button size="sm" onClick={handleSubmit} disabled={!text.trim() || isAdding}>
          {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
};
