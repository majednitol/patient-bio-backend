import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface NoteComment {
  id: string;
  note_id: string;
  researcher_id: string;
  comment_text: string;
  created_at: string;
}

export const useNoteComments = (noteId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["note-comments", noteId],
    queryFn: async (): Promise<NoteComment[]> => {
      if (!noteId) return [];
      const { data, error } = await supabase
        .from("researcher_note_comments")
        .select("*")
        .eq("note_id", noteId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Error fetching comments:", error);
        return [];
      }
      return data as NoteComment[];
    },
    enabled: !!noteId && !!user?.id,
  });

  const addComment = useMutation({
    mutationFn: async ({ noteId, text }: { noteId: string; text: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("researcher_note_comments").insert({
        note_id: noteId,
        researcher_id: user.id,
        comment_text: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-comments"] });
      toast({ title: "Comment Added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add comment.", variant: "destructive" });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("researcher_note_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-comments"] });
      toast({ title: "Comment Deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete comment.", variant: "destructive" });
    },
  });

  return {
    comments,
    isLoading,
    addComment: addComment.mutate,
    deleteComment: deleteComment.mutate,
    isAdding: addComment.isPending,
  };
};
