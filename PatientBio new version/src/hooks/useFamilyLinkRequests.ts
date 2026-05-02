import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface FamilyLinkRequest {
  id: string;
  requester_id: string;
  target_patient_id: string;
  relationship: string;
  can_manage_records: boolean;
  can_share_data: boolean;
  status: string;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export const useIncomingLinkRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["family-link-requests-incoming", user?.id],
    queryFn: async (): Promise<FamilyLinkRequest[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("family_link_requests")
        .select("id, requester_id, target_patient_id, relationship, can_manage_records, can_share_data, status, responded_at, expires_at, created_at")
        .eq("target_patient_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Filter out expired requests
      const now = new Date();
      return ((data as FamilyLinkRequest[]) || []).filter(
        (r) => !r.expires_at || new Date(r.expires_at) > now
      );
    },
    enabled: !!user?.id,
  });
};

export const useOutgoingLinkRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["family-link-requests-outgoing", user?.id],
    queryFn: async (): Promise<FamilyLinkRequest[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("family_link_requests")
        .select("id, requester_id, target_patient_id, relationship, can_manage_records, can_share_data, status, responded_at, expires_at, created_at")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as FamilyLinkRequest[]) || [];
    },
    enabled: !!user?.id,
  });
};

export const useCreateLinkRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      target_patient_id: string;
      relationship: string;
      can_manage_records: boolean;
      can_share_data: boolean;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Self-link check
      if (params.target_patient_id === user.id) {
        throw new Error("You cannot send a link request to yourself.");
      }

      // Duplicate check
      const { data: existing } = await supabase
        .from("family_link_requests")
        .select("id")
        .eq("requester_id", user.id)
        .eq("target_patient_id", params.target_patient_id)
        .eq("status", "pending");

      if (existing && existing.length > 0) {
        throw new Error("You already have a pending request for this patient.");
      }

      const { error } = await supabase.from("family_link_requests").insert({
        requester_id: user.id,
        target_patient_id: params.target_patient_id,
        relationship: params.relationship,
        can_manage_records: params.can_manage_records,
        can_share_data: params.can_share_data,
      });

      if (error) throw error;

      // Send notification to target patient
      const { data: myProfile } = await supabase
        .from("user_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      const myName = myProfile?.display_name || "Someone";

      await supabase.from("notifications").insert({
        user_id: params.target_patient_id,
        type: "family_link_request",
        title: "Family Link Request",
        message: `${myName} wants to manage your health records as your ${params.relationship}.`,
        metadata: { requester_id: user.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-link-requests-outgoing"] });
      toast.success("Link request sent! Waiting for patient approval.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send link request");
    },
  });
};

export const useCancelLinkRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("family_link_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-link-requests-outgoing"] });
      toast.success("Request cancelled.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to cancel request");
    },
  });
};

export const useRespondToLinkRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { request_id: string; action: "approve" | "reject" }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("respond-family-link-request", {
        body: { request_id: params.request_id, action: params.action },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["family-link-requests-incoming"] });
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      toast.success(
        variables.action === "approve"
          ? "Request approved! Family member linked."
          : "Request rejected."
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to respond to request");
    },
  });
};
