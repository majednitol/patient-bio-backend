import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface DoctorPathologistShare {
  id: string;
  doctor_id: string;
  pathologist_id: string;
  patient_id: string;
  disease_category: string | null;
  prescription_id: string | null;
  notes: string | null;
  status: "pending" | "viewed" | "completed";
  shared_at: string;
  completed_at: string | null;
  // Resolved names
  doctor_name?: string | null;
  pathologist_name?: string | null;
  pathologist_lab?: string | null;
  patient_name?: string | null;
}

async function resolveNames(shares: any[]): Promise<DoctorPathologistShare[]> {
  if (shares.length === 0) return [];

  const doctorIds = [...new Set(shares.map((s) => s.doctor_id))];
  const pathologistIds = [...new Set(shares.map((s) => s.pathologist_id))];
  const patientIds = [...new Set(shares.map((s) => s.patient_id))];

  const [doctorsRes, pathRes, patientsRes] = await Promise.all([
    supabase.from("doctor_profiles").select("user_id, full_name").in("user_id", doctorIds),
    supabase.from("pathologist_profiles").select("user_id, full_name, lab_name").in("user_id", pathologistIds),
    supabase.from("user_profiles").select("user_id, display_name").in("user_id", patientIds),
  ]);

  const doctorMap = Object.fromEntries((doctorsRes.data || []).map((d) => [d.user_id, d.full_name]));
  const pathMap = Object.fromEntries((pathRes.data || []).map((p) => [p.user_id, { name: p.full_name, lab: p.lab_name }]));
  const patientMap = Object.fromEntries((patientsRes.data || []).map((p) => [p.user_id, p.display_name]));

  return shares.map((s) => ({
    ...s,
    doctor_name: doctorMap[s.doctor_id] || null,
    pathologist_name: pathMap[s.pathologist_id]?.name || null,
    pathologist_lab: pathMap[s.pathologist_id]?.lab || null,
    patient_name: patientMap[s.patient_id] || null,
  }));
}

export const useDoctorPathologistShares = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Shares received by pathologist (from doctors)
  const { data: receivedShares = [], isLoading: loadingReceived, refetch: refetchReceived } = useQuery({
    queryKey: ["pathologist-received-shares", user?.id],
    queryFn: async (): Promise<DoctorPathologistShare[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("doctor_pathologist_shares")
        .select("id, doctor_id, pathologist_id, patient_id, disease_category, prescription_id, notes, status, shared_at, completed_at")
        .eq("pathologist_id", user.id)
        .order("shared_at", { ascending: false })
        .limit(100);
      if (error) { console.error("Error fetching received shares:", error); return []; }
      return resolveNames(data);
    },
    enabled: !!user?.id,
  });

  // Shares sent by doctor (to pathologists)
  const { data: sentShares = [], isLoading: loadingSent, refetch: refetchSent } = useQuery({
    queryKey: ["doctor-sent-shares", user?.id],
    queryFn: async (): Promise<DoctorPathologistShare[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("doctor_pathologist_shares")
        .select("id, doctor_id, pathologist_id, patient_id, disease_category, prescription_id, notes, status, shared_at, completed_at")
        .eq("doctor_id", user.id)
        .order("shared_at", { ascending: false })
        .limit(100);
      if (error) { console.error("Error fetching sent shares:", error); return []; }
      return resolveNames(data);
    },
    enabled: !!user?.id,
  });

  const markAsViewed = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from("doctor_pathologist_shares")
        .update({ status: "viewed" })
        .eq("id", shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pathologist-received-shares", user?.id] });
    },
  });

  const markAsCompleted = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from("doctor_pathologist_shares")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Marked as completed" });
      queryClient.invalidateQueries({ queryKey: ["pathologist-received-shares", user?.id] });
    },
    onError: (error) => {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    },
  });

  const createShare = useMutation({
    mutationFn: async (shareData: {
      pathologist_id: string;
      patient_id: string;
      disease_category?: string;
      prescription_id?: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("doctor_pathologist_shares").insert({
        doctor_id: user.id,
        ...shareData,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Shared with pathologist" });
      queryClient.invalidateQueries({ queryKey: ["doctor-sent-shares", user?.id] });
    },
    onError: (error) => {
      toast({ title: "Error sharing", description: error.message, variant: "destructive" });
    },
  });

  const pendingCount = receivedShares.filter((s) => s.status === "pending").length;

  return {
    receivedShares,
    sentShares,
    pendingCount,
    isLoading: loadingReceived || loadingSent,
    refetch: () => { refetchReceived(); refetchSent(); },
    markAsViewed: markAsViewed.mutate,
    markAsCompleted: markAsCompleted.mutate,
    createShare: createShare.mutate,
  };
};
