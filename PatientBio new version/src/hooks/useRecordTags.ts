import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface RecordTag {
  id: string;
  record_id: string;
  tag_name: string;
  user_id: string;
  created_at: string;
}

export const SUGGESTED_TAGS = [
  "For Insurance",
  "Emergency",
  "Pre-Surgery",
  "Second Opinion",
  "Follow-Up",
  "Chronic Care",
];

export function useRecordTags() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["record-tags", user?.id],
    queryFn: async (): Promise<RecordTag[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("record_tags")
        .select("id, record_id, tag_name, user_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as RecordTag[];
    },
    enabled: !!user?.id,
  });

  const addTag = useMutation({
    mutationFn: async ({ recordId, tagName }: { recordId: string; tagName: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("record_tags")
        .insert({ record_id: recordId, tag_name: tagName.trim(), user_id: user.id })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("Tag already exists");
        throw error;
      }
      return data as RecordTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["record-tags", user?.id] });
    },
    onError: (error: Error) => {
      if (error.message !== "Tag already exists") {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    },
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("record_tags")
        .delete()
        .eq("id", tagId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["record-tags", user?.id] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Helper: get tags for a specific record
  const getTagsForRecord = (recordId: string): RecordTag[] => {
    return tags.filter((t) => t.record_id === recordId);
  };

  // Helper: get all unique tag names the user has used
  const allTagNames = Array.from(new Set(tags.map((t) => t.tag_name)));

  return {
    tags,
    isLoading,
    addTag: addTag.mutate,
    removeTag: removeTag.mutate,
    isAdding: addTag.isPending,
    isRemoving: removeTag.isPending,
    getTagsForRecord,
    allTagNames,
  };
}
