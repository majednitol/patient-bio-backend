import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface DoctorReferral {
  id: string;
  referring_doctor_id: string;
  referred_to_doctor_id: string;
  patient_id: string;
  hospital_id: string | null;
  specialty_needed: string | null;
  urgency: string;
  reason: string;
  clinical_notes: string | null;
  diagnosis: string | null;
  status: string;
  responded_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  response_notes: string | null;
  // Joined
  referring_doctor?: { full_name: string; specialty: string | null };
  referred_to_doctor?: { full_name: string; specialty: string | null };
  patient?: { display_name: string | null };
}

export function useDoctorReferrals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["doctor-referrals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("doctor_referrals")
        .select("id, referring_doctor_id, referred_to_doctor_id, patient_id, hospital_id, specialty_needed, urgency, reason, clinical_notes, diagnosis, status, responded_at, completed_at, created_at, updated_at, response_notes")
        .or(`referring_doctor_id.eq.${user.id},referred_to_doctor_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch doctor names and patient names separately
      const doctorIds = [...new Set(data.flatMap((r: any) => [r.referring_doctor_id, r.referred_to_doctor_id]))];
      const patientIds = [...new Set(data.map((r: any) => r.patient_id))];
      
      const [doctorsRes, patientsRes] = await Promise.all([
        supabase.from("doctor_profiles").select("user_id, full_name, specialty").in("user_id", doctorIds),
        supabase.from("user_profiles").select("user_id, display_name").in("user_id", patientIds),
      ]);
      
      const doctorMap = Object.fromEntries((doctorsRes.data || []).map((d: any) => [d.user_id, d]));
      const patientMap = Object.fromEntries((patientsRes.data || []).map((p: any) => [p.user_id, p]));
      
      return data.map((r: any) => ({
        ...r,
        referring_doctor: doctorMap[r.referring_doctor_id] || null,
        referred_to_doctor: doctorMap[r.referred_to_doctor_id] || null,
        patient: patientMap[r.patient_id] || null,
      })) as DoctorReferral[];
    },
    enabled: !!user?.id,
  });

  const createReferral = useMutation({
    mutationFn: async (referral: {
      referred_to_doctor_id: string;
      patient_id: string;
      hospital_id?: string;
      specialty_needed?: string;
      urgency: string;
      reason: string;
      clinical_notes?: string;
      diagnosis?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("doctor_referrals")
        .insert({ ...referral, referring_doctor_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-referrals"] });
      toast({ title: "Referral sent", description: "The referral has been created successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to create referral.", variant: "destructive" });
    },
  });

  const updateReferralStatus = useMutation({
    mutationFn: async ({ id, status, response_notes }: { id: string; status: string; response_notes?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "accepted" || status === "declined") {
        updates.responded_at = new Date().toISOString();
      }
      if (status === "completed") {
        updates.completed_at = new Date().toISOString();
      }
      if (response_notes !== undefined) {
        updates.response_notes = response_notes;
      }
      const { data, error } = await supabase
        .from("doctor_referrals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Notify the referring doctor about the status change
      const referral = data as any;
      if (referral?.referring_doctor_id) {
        const statusLabel = status === "accepted" ? "accepted" : status === "declined" ? "declined" : "updated";
        await supabase.from("notifications").insert({
          user_id: referral.referring_doctor_id,
          type: "referral_status_update",
          title: `Referral ${statusLabel}`,
          message: `Your referral has been ${statusLabel} by the receiving doctor.`,
        }).then(({ error }) => {
          if (error) console.error("Failed to notify referring doctor:", error);
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-referrals"] });
      toast({ title: "Referral updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update referral.", variant: "destructive" });
    },
  });

  const sentReferrals = referrals.filter((r) => r.referring_doctor_id === user?.id);
  const receivedReferrals = referrals.filter((r) => r.referred_to_doctor_id === user?.id);

  return {
    referrals,
    sentReferrals,
    receivedReferrals,
    isLoading,
    createReferral,
    updateReferralStatus,
  };
}

// Hook to search doctors for referral
export function useSearchDoctors(searchTerm: string) {
  return useQuery({
    queryKey: ["search-doctors", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const { data, error } = await supabase
        .from("doctor_profiles")
        .select("user_id, full_name, specialty, is_verified")
        .ilike("full_name", `%${searchTerm}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length >= 2,
  });
}
