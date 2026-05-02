 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { STALE_TIMES } from "@/lib/queryConfig";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { toast } from "@/hooks/use-toast";
 import { useEffect } from "react";
 
 export interface PatientResearcherShare {
   id: string;
   patient_id: string;
   researcher_id: string;
   access_token_id: string | null;
   disease_category: string | null;
   research_purpose: string | null;
   is_anonymized: boolean;
   status: "pending" | "viewed" | "completed" | "revoked";
   shared_at: string;
   expires_at: string | null;
   viewed_at: string | null;
   completed_at: string | null;
 }
 
 export const usePatientResearcherShares = () => {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   // For patients: Get shares they created
   const { data: patientShares = [], isLoading: loadingPatientShares, refetch: refetchPatientShares } = useQuery({
     queryKey: ["patient-researcher-shares-patient", user?.id],
     queryFn: async (): Promise<PatientResearcherShare[]> => {
       if (!user?.id) return [];
 
       const { data, error } = await supabase
         .from("patient_researcher_shares")
          .select("id, patient_id, researcher_id, access_token_id, disease_category, research_purpose, is_anonymized, status, shared_at, expires_at, viewed_at, completed_at")
          .eq("patient_id", user.id)
         .order("shared_at", { ascending: false });
 
       if (error) {
         console.error("Error fetching patient shares:", error);
         return [];
       }
 
       return data as PatientResearcherShare[];
     },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  // For researchers: Get shares assigned to them
   const { data: researcherShares = [], isLoading: loadingResearcherShares, refetch: refetchResearcherShares } = useQuery({
     queryKey: ["patient-researcher-shares-researcher", user?.id],
     queryFn: async (): Promise<PatientResearcherShare[]> => {
       if (!user?.id) return [];
 
       const { data, error } = await supabase
         .from("patient_researcher_shares")
          .select("id, patient_id, researcher_id, access_token_id, disease_category, research_purpose, is_anonymized, status, shared_at, expires_at, viewed_at, completed_at")
          .eq("researcher_id", user.id)
         .order("shared_at", { ascending: false });
 
       if (error) {
         console.error("Error fetching researcher shares:", error);
         return [];
       }
 
       return data as PatientResearcherShare[];
     },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
   });

   // Real-time subscription for researcher shares
   useEffect(() => {
     if (!user?.id) return;

     const channel = supabase
       .channel(`researcher-shares:${user.id}`)
       .on(
         "postgres_changes",
         {
           event: "*",
           schema: "public",
           table: "patient_researcher_shares",
           filter: `researcher_id=eq.${user.id}`,
         },
         (payload) => {
           if (payload.eventType === "INSERT") {
             const newShare = payload.new as PatientResearcherShare;
             toast({
               title: "📊 New Data Shared",
               description: `A patient shared ${newShare.disease_category?.replace("_", " ") || "medical"} data for research.`,
             });
             queryClient.setQueryData<PatientResearcherShare[]>(
               ["patient-researcher-shares-researcher", user.id],
               (old = []) => [newShare, ...old]
             );
           } else if (payload.eventType === "UPDATE") {
             const updated = payload.new as PatientResearcherShare;
             queryClient.setQueryData<PatientResearcherShare[]>(
               ["patient-researcher-shares-researcher", user.id],
               (old = []) => old.map((s) => (s.id === updated.id ? updated : s))
             );
           } else if (payload.eventType === "DELETE") {
             const deleted = payload.old as { id: string };
             queryClient.setQueryData<PatientResearcherShare[]>(
               ["patient-researcher-shares-researcher", user.id],
               (old = []) => old.filter((s) => s.id !== deleted.id)
             );
           }
         }
       )
       .on(
         "postgres_changes",
         {
           event: "*",
           schema: "public",
           table: "patient_researcher_shares",
           filter: `patient_id=eq.${user.id}`,
         },
         (payload) => {
           if (payload.eventType === "UPDATE") {
             const updated = payload.new as PatientResearcherShare;
             queryClient.setQueryData<PatientResearcherShare[]>(
               ["patient-researcher-shares-patient", user.id],
               (old = []) => old.map((s) => (s.id === updated.id ? updated : s))
             );
           }
         }
       )
       .subscribe();

     return () => {
       supabase.removeChannel(channel);
     };
   }, [user?.id, queryClient]);

   const pendingShares = researcherShares.filter((s) => s.status === "pending");
   const activePatientShares = patientShares.filter((s) => s.status !== "revoked" && (!s.expires_at || new Date(s.expires_at) > new Date()));
 
   // Patient creates a share to researcher
   const createShare = useMutation({
      mutationFn: async (shareData: {
        researcher_id: string;
        disease_category?: string;
        research_purpose?: string;
        is_anonymized?: boolean;
        expires_at?: string;
        include_clinical_records?: boolean;
      }) => {
       if (!user?.id) throw new Error("Not authenticated");
 
        const { data, error } = await supabase
          .from("patient_researcher_shares")
          .insert({
            patient_id: user.id,
            researcher_id: shareData.researcher_id,
            disease_category: shareData.disease_category,
            research_purpose: shareData.research_purpose,
            is_anonymized: shareData.is_anonymized ?? true,
            expires_at: shareData.expires_at,
            include_clinical_records: shareData.include_clinical_records ?? false,
          })
         .select()
         .single();
 
       if (error) throw error;
 
       // Notify researcher
       await supabase.from("notifications").insert({
         user_id: shareData.researcher_id,
         type: "research_data_shared",
         title: "New Research Data Shared",
         message: "A patient has shared their health data for research purposes.",
         metadata: { share_id: data.id, disease_category: shareData.disease_category },
       });
 
       return data;
     },
     onSuccess: () => {
       toast({
         title: "Data Shared",
         description: "Your health data has been shared with the researcher.",
       });
       queryClient.invalidateQueries({ queryKey: ["patient-researcher-shares-patient", user?.id] });
     },
     onError: (error) => {
       toast({
         title: "Error",
         description: "Failed to share data. Please try again.",
         variant: "destructive",
       });
       console.error("Error creating share:", error);
     },
   });
 
   // Patient revokes a share
   const revokeShare = useMutation({
     mutationFn: async (shareId: string) => {
       const { error } = await supabase
         .from("patient_researcher_shares")
         .update({ status: "revoked" })
         .eq("id", shareId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       toast({
         title: "Access Revoked",
         description: "Research access has been revoked.",
       });
       queryClient.invalidateQueries({ queryKey: ["patient-researcher-shares-patient", user?.id] });
     },
     onError: (error) => {
       toast({
         title: "Error",
         description: "Failed to revoke access. Please try again.",
         variant: "destructive",
       });
       console.error("Error revoking share:", error);
     },
   });
 
   // Researcher updates share status
   const updateShareStatus = useMutation({
     mutationFn: async ({ shareId, status }: { shareId: string; status: string }) => {
       const updates: Record<string, unknown> = { status };
       if (status === "viewed") {
         updates.viewed_at = new Date().toISOString();
       }
       if (status === "completed") {
         updates.completed_at = new Date().toISOString();
       }
 
       const { error } = await supabase
         .from("patient_researcher_shares")
         .update(updates)
         .eq("id", shareId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       toast({
         title: "Status Updated",
         description: "Share status has been updated.",
       });
       queryClient.invalidateQueries({ queryKey: ["patient-researcher-shares-researcher", user?.id] });
     },
     onError: (error) => {
       toast({
         title: "Error",
         description: "Failed to update status. Please try again.",
         variant: "destructive",
       });
       console.error("Error updating share status:", error);
     },
   });
 
   return {
     patientShares,
     researcherShares,
     activePatientShares,
     pendingShares,
     pendingCount: pendingShares.length,
     isLoading: loadingPatientShares || loadingResearcherShares,
     refetch: () => {
       refetchPatientShares();
       refetchResearcherShares();
     },
     createShare: createShare.mutate,
     revokeShare: revokeShare.mutate,
     updateShareStatus: updateShareStatus.mutate,
     isCreating: createShare.isPending,
     isRevoking: revokeShare.isPending,
     isUpdating: updateShareStatus.isPending,
   };
 };