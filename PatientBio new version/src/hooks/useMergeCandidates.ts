import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface MergeCandidate {
  id: string;
  patient_id_a: string;
  patient_id_b: string;
  confidence_score: number;
  match_factors: Record<string, any>;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  hospital_id: string | null;
  created_at: string;
  // Joined profile data
  profile_a?: { display_name: string | null; date_of_birth: string | null; phone: string | null; patient_passport_id: string | null; gender: string | null };
  profile_b?: { display_name: string | null; date_of_birth: string | null; phone: string | null; patient_passport_id: string | null; gender: string | null };
}

export function useMergeCandidates(hospitalId: string | undefined) {
  return useQuery({
    queryKey: ["merge-candidates", hospitalId],
    queryFn: async () => {
      if (!hospitalId) return [];

      const { data, error } = await supabase
        .from("patient_merge_candidates")
        .select("id, patient_id_a, patient_id_b, confidence_score, match_factors, status, reviewed_by, reviewed_at, hospital_id, created_at")
        .eq("hospital_id", hospitalId)
        .eq("status", "pending")
        .order("confidence_score", { ascending: false });

      if (error) throw error;

      // Fetch profiles for all unique patient IDs
      const patientIds = new Set<string>();
      data?.forEach((c: any) => {
        patientIds.add(c.patient_id_a);
        patientIds.add(c.patient_id_b);
      });

      if (patientIds.size === 0) return [];

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, date_of_birth, phone, patient_passport_id, gender")
        .in("user_id", Array.from(patientIds));

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p]) || []
      );

      return (data || []).map((c: any) => ({
        ...c,
        profile_a: profileMap.get(c.patient_id_a),
        profile_b: profileMap.get(c.patient_id_b),
      })) as MergeCandidate[];
    },
    enabled: !!hospitalId,
  });
}

export function useDismissMergeCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ candidateId, status }: { candidateId: string; status: "dismissed" | "merged" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("patient_merge_candidates")
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", candidateId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["merge-candidates"] });
      toast({
        title: variables.status === "dismissed" ? "Dismissed" : "Marked as Merged",
        description: variables.status === "dismissed"
          ? "This duplicate pair has been dismissed."
          : "Records have been marked as merged.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useRunDuplicateDetection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hospitalId: string) => {
      const { data, error } = await supabase.functions.invoke("detect-duplicate-patients", {
        body: { hospital_id: hospitalId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["merge-candidates"] });
      toast({
        title: "Scan Complete",
        description: `Scanned ${data.scanned} patients, found ${data.candidates.length} potential duplicates.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Scan Failed", description: error.message, variant: "destructive" });
    },
  });
}
