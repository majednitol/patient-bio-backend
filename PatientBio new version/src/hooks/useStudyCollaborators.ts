import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface StudyCollaborator {
  id: string;
  study_id: string;
  researcher_id: string;
  role: string;
  invited_by: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
  // Joined fields
  researcher_name?: string;
  researcher_institution?: string;
  study_title?: string;
}

export const useStudyCollaborators = (studyId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get collaborators for a specific study
  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ["study-collaborators", studyId],
    queryFn: async () => {
      if (!studyId) return [];
      const { data, error } = await supabase
        .from("study_collaborators")
        .select("*")
        .eq("study_id", studyId)
        .order("invited_at", { ascending: false });
      if (error) throw error;

      // Enrich with researcher names
      const ids = (data || []).map((c: any) => c.researcher_id);
      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from("researcher_profiles")
        .select("user_id, full_name, institution_name")
        .in("user_id", ids);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      return (data || []).map((c: any) => ({
        ...c,
        researcher_name: profileMap.get(c.researcher_id)?.full_name || "Unknown",
        researcher_institution: profileMap.get(c.researcher_id)?.institution_name || "",
      }));
    },
    enabled: !!studyId,
    staleTime: STALE_TIMES.STANDARD,
  });

  // Get pending invitations for current user
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ["collaboration-invitations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("study_collaborators")
        .select("*")
        .eq("researcher_id", user.id)
        .eq("status", "pending")
        .order("invited_at", { ascending: false });
      if (error) throw error;

      // Enrich with study titles
      const studyIds = (data || []).map((c: any) => c.study_id);
      if (studyIds.length === 0) return [];

      const { data: studies } = await supabase
        .from("researcher_studies")
        .select("id, title")
        .in("id", studyIds);

      const studyMap = new Map(
        (studies || []).map((s: any) => [s.id, s.title])
      );

      // Get inviter names
      const inviterIds = (data || []).map((c: any) => c.invited_by);
      const { data: inviterProfiles } = await supabase
        .from("researcher_profiles")
        .select("user_id, full_name, institution_name")
        .in("user_id", inviterIds);

      const inviterMap = new Map(
        (inviterProfiles || []).map((p: any) => [p.user_id, p])
      );

      return (data || []).map((c: any) => ({
        ...c,
        study_title: studyMap.get(c.study_id) || "Unknown Study",
        researcher_name: inviterMap.get(c.invited_by)?.full_name || "Unknown",
        researcher_institution: inviterMap.get(c.invited_by)?.institution_name || "",
      }));
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  const inviteCollaborator = useMutation({
    mutationFn: async ({ studyId, researcherId, role }: { studyId: string; researcherId: string; role: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("study_collaborators")
        .insert({
          study_id: studyId,
          researcher_id: researcherId,
          role,
          invited_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Invitation Sent", description: "Collaborator has been invited to the study." });
      queryClient.invalidateQueries({ queryKey: ["study-collaborators"] });
    },
    onError: (error: any) => {
      const msg = error?.message?.includes("duplicate") ? "This researcher is already invited." : "Failed to send invitation.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const respondToInvitation = useMutation({
    mutationFn: async ({ collaborationId, accept }: { collaborationId: string; accept: boolean }) => {
      const updates: any = { status: accept ? "accepted" : "declined" };
      if (accept) updates.accepted_at = new Date().toISOString();

      const { error } = await supabase
        .from("study_collaborators")
        .update(updates)
        .eq("id", collaborationId);
      if (error) throw error;
    },
    onSuccess: (_, { accept }) => {
      toast({
        title: accept ? "Invitation Accepted" : "Invitation Declined",
        description: accept ? "You now have access to the study." : "The invitation has been declined.",
      });
      queryClient.invalidateQueries({ queryKey: ["collaboration-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["study-collaborators"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to respond to invitation.", variant: "destructive" });
    },
  });

  const removeCollaborator = useMutation({
    mutationFn: async (collaboratorId: string) => {
      const { error } = await supabase
        .from("study_collaborators")
        .delete()
        .eq("id", collaboratorId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Removed", description: "Collaborator has been removed." });
      queryClient.invalidateQueries({ queryKey: ["study-collaborators"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove collaborator.", variant: "destructive" });
    },
  });

  return {
    collaborators,
    isLoading,
    pendingInvitations,
    inviteCollaborator: inviteCollaborator.mutate,
    respondToInvitation: respondToInvitation.mutate,
    removeCollaborator: removeCollaborator.mutate,
    isInviting: inviteCollaborator.isPending,
  };
};
