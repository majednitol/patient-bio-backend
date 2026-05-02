import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type DataRequestStatus = "pending" | "approved" | "rejected";

export type RequesterType = "doctor" | "pathologist" | "pharmacy" | "lab" | "researcher";

export interface DataAccessRequest {
  id: string;
  patient_id: string;
  requester_id: string;
  requester_type: RequesterType;
  disease_category: string | null;
  reason: string | null;
  status: DataRequestStatus;
  requested_at: string;
  responded_at: string | null;
  created_at: string;
  broadcast_request_id: string | null;
  token_offer: number | null;
  // Joined data
  requester_name?: string;
  requester_email?: string;
}

export const useDataRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch requests made TO the current user (as patient)
  const { data: incomingRequests = [], isLoading: loadingIncoming, refetch: refetchIncoming } = useQuery({
    queryKey: ["data-requests-incoming", user?.id],
    queryFn: async (): Promise<DataAccessRequest[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("data_access_requests")
        .select("id, patient_id, requester_id, requester_type, disease_category, reason, status, requested_at, responded_at, created_at, broadcast_request_id, token_offer")
        .eq("patient_id", user.id)
        .order("requested_at", { ascending: false });

      if (error) {
        console.error("Error fetching incoming requests:", error);
        return [];
      }

      return data as DataAccessRequest[];
    },
    enabled: !!user?.id,
  });

  // Fetch requests made BY the current user (as requester)
  const { data: outgoingRequests = [], isLoading: loadingOutgoing, refetch: refetchOutgoing } = useQuery({
    queryKey: ["data-requests-outgoing", user?.id],
    queryFn: async (): Promise<DataAccessRequest[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("data_access_requests")
        .select("id, patient_id, requester_id, requester_type, disease_category, reason, status, requested_at, responded_at, created_at, broadcast_request_id, token_offer")
        .eq("requester_id", user.id)
        .order("requested_at", { ascending: false });

      if (error) {
        console.error("Error fetching outgoing requests:", error);
        return [];
      }

      return data as DataAccessRequest[];
    },
    enabled: !!user?.id,
  });

  const pendingRequests = incomingRequests.filter((r) => r.status === "pending");

  const approveRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const request = incomingRequests.find((r) => r.id === requestId);
      if (!request) throw new Error("Request not found");

      const { error } = await supabase
        .from("data_access_requests")
        .update({ 
          status: "approved" as DataRequestStatus, 
          responded_at: new Date().toISOString() 
        })
        .eq("id", requestId);

      if (error) throw error;

      // If this is a researcher request, auto-create patient_researcher_shares
      if (request.requester_type === "researcher") {
        const { error: shareError } = await supabase
          .from("patient_researcher_shares")
          .insert({
            patient_id: request.patient_id,
            researcher_id: request.requester_id,
            disease_category: request.disease_category,
            research_purpose: request.reason,
            is_anonymized: true,
            status: "pending",
          });

        if (shareError) {
          console.error("Error creating researcher share:", shareError);
        }

        // Update broadcast request approval count and tokens disbursed
        if (request.broadcast_request_id) {
          const { data: currentData } = await supabase
            .from("research_broadcast_requests")
            .select("patients_approved, tokens_disbursed, token_offer_per_patient")
            .eq("id", request.broadcast_request_id)
            .single();
          
          if (currentData) {
            const tokenOffer = request.token_offer || currentData.token_offer_per_patient || 0;
            await supabase
              .from("research_broadcast_requests")
              .update({ 
                patients_approved: (currentData.patients_approved || 0) + 1,
                tokens_disbursed: (currentData.tokens_disbursed || 0) + tokenOffer
              })
              .eq("id", request.broadcast_request_id);
          }
        }

        // Credit patient wallet with tokens
        const tokenAmount = request.token_offer || 10; // Default 10 PBIO
        if (tokenAmount > 0) {
          // Use the database function to credit wallet
          const { error: walletError } = await supabase.rpc("credit_patient_wallet", {
            p_patient_id: request.patient_id,
            p_tokens: tokenAmount,
          });

          if (walletError) {
            console.error("Error crediting wallet:", walletError);
          }

          // Create transaction record
          const { error: txError } = await supabase
            .from("data_transactions")
            .insert({
              patient_id: request.patient_id,
              requester_id: request.requester_id,
              requester_type: request.requester_type,
              access_tier: 2, // Research tier
              disease_category: request.disease_category,
              tokens_earned: tokenAmount,
              is_anonymized: true,
              data_access_request_id: requestId,
            });

          if (txError) {
            console.error("Error creating transaction:", txError);
          }
        }
      }

      // Create notification for requester
      const tokenAmount = request.token_offer || 0;
      await supabase.from("notifications").insert({
        user_id: request.requester_id,
        type: "request_approved",
        title: "Data Access Approved",
        message: request.requester_type === "researcher" 
          ? "A patient has approved your research data request. Anonymized data is now available."
          : "Your data access request has been approved.",
        metadata: { request_id: requestId, tokens_earned: tokenAmount },
      });
    },
    onSuccess: () => {
      toast({
        title: "Request Approved! 🎉",
        description: "You've earned PBIO tokens for sharing your data.",
      });
      queryClient.invalidateQueries({ queryKey: ["data-requests-incoming", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["patient-wallet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["data-transactions", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve request. Please try again.",
        variant: "destructive",
      });
      console.error("Error approving request:", error);
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const request = incomingRequests.find((r) => r.id === requestId);
      if (!request) throw new Error("Request not found");

      const { error } = await supabase
        .from("data_access_requests")
        .update({ 
          status: "rejected" as DataRequestStatus, 
          responded_at: new Date().toISOString() 
        })
        .eq("id", requestId);

      if (error) throw error;

      // Update broadcast request rejection count if applicable
      if (request.requester_type === "researcher" && request.broadcast_request_id) {
        const { data: currentData } = await supabase
          .from("research_broadcast_requests")
          .select("patients_rejected")
          .eq("id", request.broadcast_request_id)
          .single();
        
        if (currentData) {
          await supabase
            .from("research_broadcast_requests")
            .update({ patients_rejected: (currentData.patients_rejected || 0) + 1 })
            .eq("id", request.broadcast_request_id);
        }
      }

      // Create notification for requester
      await supabase.from("notifications").insert({
        user_id: request.requester_id,
        type: "request_rejected",
        title: "Data Access Rejected",
        message: "Your data access request has been rejected.",
        metadata: { request_id: requestId },
      });
    },
    onSuccess: () => {
      toast({
        title: "Request Rejected",
        description: "The data access request has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["data-requests-incoming", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive",
      });
      console.error("Error rejecting request:", error);
    },
  });

  const createRequest = useMutation({
    mutationFn: async (request: {
      patient_id: string;
      requester_type: RequesterType;
      disease_category?: string;
      reason?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase.from("data_access_requests").insert({
        ...request,
        requester_id: user.id,
      });

      if (error) throw error;

      // Create notification for patient
      await supabase.from("notifications").insert({
        user_id: request.patient_id,
        type: "access_request",
        title: "New Data Access Request",
        message: `A ${request.requester_type} has requested access to your health data.`,
        metadata: { requester_type: request.requester_type, disease_category: request.disease_category },
      });
    },
    onSuccess: () => {
      toast({
        title: "Request Sent",
        description: "Your data access request has been sent.",
      });
      queryClient.invalidateQueries({ queryKey: ["data-requests-outgoing", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send request. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating request:", error);
    },
  });

  return {
    incomingRequests,
    outgoingRequests,
    pendingRequests,
    pendingCount: pendingRequests.length,
    isLoading: loadingIncoming || loadingOutgoing,
    refetch: () => {
      refetchIncoming();
      refetchOutgoing();
    },
    approveRequest: approveRequest.mutate,
    rejectRequest: rejectRequest.mutate,
    createRequest: createRequest.mutate,
    isApproving: approveRequest.isPending,
    isRejecting: rejectRequest.isPending,
  };
};
