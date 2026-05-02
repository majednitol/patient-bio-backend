import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TriageSpecialty {
  specialty: string;
  relevance_score: number;
  reasoning: string;
}

export interface TriageResult {
  urgency: "emergency" | "see_doctor_soon" | "schedule_appointment" | "self_care";
  urgency_label: string;
  summary: string;
  reasoning: string;
  recommendations: string[];
  home_remedies: string[];
  warning_signs: string[];
  recommended_specialties: TriageSpecialty[];
}

export interface RecommendedDoctor {
  doctor_id: string;
  full_name: string;
  specialty: string;
  qualification: string;
  diseases_treated: string[];
  is_connected: boolean;
  match_score: number;
  match_reasoning: string;
  consultation_fee: number | null;
}

export interface TriageRecommendResponse {
  triage: TriageResult;
  doctors: RecommendedDoctor[];
}

interface TriageRequest {
  symptoms: string;
  duration?: string;
  severity?: string;
  affected_areas?: string[];
  response_language?: string;
}

export function useSymptomTriageRecommend() {
  return useMutation({
    mutationFn: async (request: TriageRequest): Promise<TriageRecommendResponse> => {
      const { data, error } = await supabase.functions.invoke("symptom-triage-recommend", {
        body: request,
      });
      if (error) throw error;
      return data as TriageRecommendResponse;
    },
  });
}
