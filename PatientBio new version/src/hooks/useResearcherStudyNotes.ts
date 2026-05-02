import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface StudyNote {
  id: string;
  researcher_id: string;
  study_title: string;
  methodology: string | null;
  findings: string | null;
  sample_size: number | null;
  is_published: boolean;
  publication_url: string | null;
  share_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface StudyNoteInput {
  study_title: string;
  methodology?: string;
  findings?: string;
  sample_size?: number;
  is_published?: boolean;
  publication_url?: string;
  publication_status?: string;
  is_shared?: boolean;
  share_id?: string;
  tags?: string[];
  data_references?: Array<{ shareId: string; annotation: string }>;
}

export const useResearcherStudyNotes = (shareId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = shareId
    ? ["researcher-study-notes", user?.id, shareId]
    : ["researcher-study-notes", user?.id];

  const { data: notes = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<StudyNote[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from("researcher_study_notes")
        .select("*")
        .eq("researcher_id", user.id)
        .order("updated_at", { ascending: false });

      if (shareId) {
        query = query.eq("share_id", shareId);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching study notes:", error);
        return [];
      }
      return data as StudyNote[];
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.SHORT,
  });

  const createNote = useMutation({
    mutationFn: async (input: StudyNoteInput) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("researcher_study_notes")
        .insert({
          researcher_id: user.id,
          study_title: input.study_title,
          methodology: input.methodology || null,
          findings: input.findings || null,
          sample_size: input.sample_size || null,
          is_published: input.is_published || false,
          publication_url: input.publication_url || null,
          publication_status: input.publication_status || "draft",
          is_shared: input.is_shared || false,
          share_id: input.share_id || null,
          tags: input.tags || [],
          data_references: input.data_references || [],
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Note Created", description: "Study note saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["researcher-study-notes"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create note.", variant: "destructive" });
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, ...input }: StudyNoteInput & { id: string }) => {
      const { error } = await supabase
        .from("researcher_study_notes")
        .update({
          study_title: input.study_title,
          methodology: input.methodology || null,
          findings: input.findings || null,
          sample_size: input.sample_size || null,
          is_published: input.is_published || false,
          publication_url: input.publication_url || null,
          publication_status: input.publication_status || "draft",
          is_shared: input.is_shared || false,
          share_id: input.share_id || null,
          tags: input.tags || [],
          data_references: input.data_references || [],
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Note Updated", description: "Study note updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["researcher-study-notes"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update note.", variant: "destructive" });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("researcher_study_notes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Note Deleted", description: "Study note removed." });
      queryClient.invalidateQueries({ queryKey: ["researcher-study-notes"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete note.", variant: "destructive" });
    },
  });

  return {
    notes,
    isLoading,
    createNote: createNote.mutate,
    updateNote: updateNote.mutate,
    deleteNote: deleteNote.mutate,
    isCreating: createNote.isPending,
    isUpdating: updateNote.isPending,
    isDeleting: deleteNote.isPending,
  };
};
