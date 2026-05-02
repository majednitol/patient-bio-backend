import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface ConsultationFeedback {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  rating: number;
  tags: string[];
  comment: string | null;
  is_anonymous: boolean;
  created_at: string;
}

export const FEEDBACK_TAGS = [
  "Thorough",
  "Good Listener",
  "Clear Explanations",
  "Caring",
  "Professional",
  "Long Wait",
  "Rushed",
  "Unclear Instructions",
] as const;

export function useConsultationFeedback(appointmentId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if feedback already exists for this appointment
  const existingFeedback = useQuery({
    queryKey: ["consultation-feedback", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultation_feedback")
        .select("id, appointment_id, patient_id, doctor_id, rating, tags, comment, is_anonymous, created_at")
        .eq("appointment_id", appointmentId!)
        .maybeSingle();
      if (error) throw error;
      return data as ConsultationFeedback | null;
    },
    enabled: !!appointmentId && !!user,
  });

  const submitFeedback = useMutation({
    mutationFn: async (feedback: {
      appointment_id: string;
      doctor_id: string;
      rating: number;
      tags?: string[];
      comment?: string;
      is_anonymous?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("consultation_feedback")
        .insert({
          appointment_id: feedback.appointment_id,
          patient_id: user!.id,
          doctor_id: feedback.doctor_id,
          rating: feedback.rating,
          tags: feedback.tags || [],
          comment: feedback.comment || null,
          is_anonymous: feedback.is_anonymous || false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultation-feedback"] });
      toast.success("Thank you for your feedback!");
    },
    onError: (error) => {
      toast.error("Failed to submit feedback: " + error.message);
    },
  });

  return {
    existingFeedback: existingFeedback.data,
    isLoadingFeedback: existingFeedback.isLoading,
    submitFeedback,
  };
}

/** Hook for doctors to view their feedback analytics */
export function useDoctorFeedback() {
  const { user } = useAuth();

  const feedbackQuery = useQuery({
    queryKey: ["doctor-feedback", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultation_feedback")
        .select("id, appointment_id, patient_id, doctor_id, rating, tags, comment, is_anonymous, created_at")
        .eq("doctor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ConsultationFeedback[];
    },
    enabled: !!user,
    staleTime: STALE_TIMES.STANDARD,
  });

  const feedback = feedbackQuery.data || [];

  const avgRating = feedback.length > 0
    ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
    : 0;

  const tagCounts = feedback.reduce((acc, f) => {
    (f.tags || []).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const recentFeedback = feedback.slice(0, 5);

  return {
    feedback,
    isLoading: feedbackQuery.isLoading,
    avgRating,
    totalReviews: feedback.length,
    tagCounts,
    recentFeedback,
  };
}
