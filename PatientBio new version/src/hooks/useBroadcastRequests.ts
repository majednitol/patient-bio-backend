 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { STALE_TIMES } from "@/lib/queryConfig";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { toast } from "@/hooks/use-toast";
 import { useEffect } from "react";
 
 export interface BroadcastRequest {
   id: string;
   researcher_id: string;
   disease_category: string;
   research_purpose: string;
   status: "active" | "completed" | "cancelled";
   patients_notified: number;
   patients_approved: number;
   patients_rejected: number;
   created_at: string;
   updated_at: string;
 }
 
 export const useBroadcastRequests = () => {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   // Fetch researcher's broadcast requests
   const { data: broadcastRequests = [], isLoading, refetch } = useQuery({
     queryKey: ["broadcast-requests", user?.id],
     queryFn: async (): Promise<BroadcastRequest[]> => {
       if (!user?.id) return [];
 
       const { data, error } = await supabase
         .from("research_broadcast_requests")
         .select("id, researcher_id, disease_category, research_purpose, status, patients_notified, patients_approved, patients_rejected, created_at, updated_at")
         .eq("researcher_id", user.id)
         .order("created_at", { ascending: false });
 
       if (error) {
         console.error("Error fetching broadcast requests:", error);
         return [];
       }
 
       return data as BroadcastRequest[];
     },
      enabled: !!user?.id,
      staleTime: STALE_TIMES.STANDARD,
    });
 
   // Create a new broadcast request via edge function
   const createBroadcast = useMutation({
    mutationFn: async (params: { 
      disease_category: string; 
      research_purpose: string;
      token_offer_per_patient?: number;
      total_token_budget?: number;
    }) => {
       const { data, error } = await supabase.functions.invoke("broadcast-research-request", {
         body: params,
       });
 
       if (error) throw error;
       if (data.error) throw new Error(data.error);
       
       return data;
     },
     onSuccess: (data) => {
       if (data.patients_notified === 0) {
         toast({
           title: "No Matching Patients",
           description: "No patients found with data in this disease category.",
           variant: "destructive",
         });
       } else {
         toast({
           title: "Request Broadcast",
           description: `Your request has been sent to ${data.patients_notified} patients.`,
         });
       }
       queryClient.invalidateQueries({ queryKey: ["broadcast-requests", user?.id] });
     },
     onError: (error) => {
       toast({
         title: "Error",
         description: "Failed to broadcast request. Please try again.",
         variant: "destructive",
       });
       console.error("Error broadcasting request:", error);
     },
   });
 
   // Cancel a broadcast request
   const cancelBroadcast = useMutation({
     mutationFn: async (broadcastId: string) => {
       const { error } = await supabase
         .from("research_broadcast_requests")
         .update({ status: "cancelled" })
         .eq("id", broadcastId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       toast({
         title: "Request Cancelled",
         description: "Your broadcast request has been cancelled.",
       });
       queryClient.invalidateQueries({ queryKey: ["broadcast-requests", user?.id] });
     },
     onError: (error) => {
       toast({
         title: "Error",
         description: "Failed to cancel request.",
         variant: "destructive",
       });
       console.error("Error cancelling broadcast:", error);
     },
   });
 
   // Real-time subscription for broadcast request updates (approval/rejection counters)
   useEffect(() => {
     if (!user?.id) return;

     const channel = supabase
       .channel(`broadcast-requests:${user.id}`)
       .on(
         "postgres_changes",
         {
           event: "UPDATE",
           schema: "public",
           table: "research_broadcast_requests",
           filter: `researcher_id=eq.${user.id}`,
         },
         (payload) => {
           const updated = payload.new as BroadcastRequest;
           const old = payload.old as Partial<BroadcastRequest>;

           // Show toast when a patient approves or rejects
           if (updated.patients_approved > (old.patients_approved || 0)) {
             toast({
               title: "✅ Patient Approved",
               description: `A patient approved your ${updated.disease_category.replace("_", " ")} research request.`,
             });
           } else if (updated.patients_rejected > (old.patients_rejected || 0)) {
             toast({
               title: "Patient Declined",
               description: `A patient declined your ${updated.disease_category.replace("_", " ")} research request.`,
             });
           }

           // Update cache
           queryClient.setQueryData<BroadcastRequest[]>(
             ["broadcast-requests", user.id],
             (old = []) => old.map((b) => (b.id === updated.id ? updated : b))
           );
           // Also update dashboard query
           queryClient.invalidateQueries({ queryKey: ["researcher-broadcasts-dashboard", user.id] });
         }
       )
       .on(
         "postgres_changes",
         {
           event: "INSERT",
           schema: "public",
           table: "research_broadcast_requests",
           filter: `researcher_id=eq.${user.id}`,
         },
         (payload) => {
           const newBroadcast = payload.new as BroadcastRequest;
           queryClient.setQueryData<BroadcastRequest[]>(
             ["broadcast-requests", user.id],
             (old = []) => [newBroadcast, ...old]
           );
         }
       )
       .subscribe();

     return () => {
       supabase.removeChannel(channel);
     };
   }, [user?.id, queryClient]);

   const activeRequests = broadcastRequests.filter((r) => r.status === "active");
   const completedRequests = broadcastRequests.filter((r) => r.status === "completed");

   return {
     broadcastRequests,
     activeRequests,
     completedRequests,
     isLoading,
     refetch,
     createBroadcast: createBroadcast.mutateAsync,
     cancelBroadcast: cancelBroadcast.mutate,
     isCreating: createBroadcast.isPending,
     isCancelling: cancelBroadcast.isPending,
   };
 };