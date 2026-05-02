import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  profile_image_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  email: string | null;
  github_url: string | null;
  website_url: string | null;
  phone: string | null;
  is_advisor: boolean;
  is_visible: boolean;
  display_order: number;
  gradient: string | null;
  created_at: string;
  updated_at: string;
}

export type TeamMemberInsert = Omit<TeamMember, "id" | "created_at" | "updated_at">;
export type TeamMemberUpdate = Partial<TeamMemberInsert>;

export const useTeamMembers = (isAdvisor?: boolean, visibleOnly?: boolean) => {
  return useQuery({
    queryKey: ["team-members", isAdvisor, visibleOnly],
    queryFn: async () => {
      const client = supabase as any;
      let query = client
        .from("team_members")
        .select("*")
        .order("display_order", { ascending: true });

      if (isAdvisor !== undefined) {
        query = query.eq("is_advisor", isAdvisor);
      }

      if (visibleOnly) {
        query = query.eq("is_visible", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TeamMember[];
    },
  });
};

export const useCreateTeamMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (member: TeamMemberInsert) => {
      const client = supabase as any;
      const { data, error } = await client
        .from("team_members")
        .insert(member)
        .select()
        .single();

      if (error) throw error;
      return data as TeamMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({
        title: "Team member added",
        description: "The team member has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTeamMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TeamMemberUpdate }) => {
      const client = supabase as any;
      const { data, error } = await client
        .from("team_members")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as TeamMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({
        title: "Team member updated",
        description: "The team member has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteTeamMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = supabase as any;
      const { error } = await client
        .from("team_members")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({
        title: "Team member deleted",
        description: "The team member has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const uploadProfileImage = async (file: File, memberId: string) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${memberId}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("team-profiles")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("team-profiles")
    .getPublicUrl(filePath);

  return data.publicUrl;
};
