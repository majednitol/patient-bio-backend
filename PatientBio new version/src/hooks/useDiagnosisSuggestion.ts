import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface DiagnosisMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface DiagnosisSuggestion {
  diagnosis: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  medications: DiagnosisMedication[];
  general_instructions?: string;
}

interface SuggestRequest {
  chief_complaint: string;
  symptom_duration?: string;
  symptom_severity?: string;
  self_medications?: string;
  additional_notes?: string;
  patient_allergies?: string[];
  patient_age?: number;
  patient_gender?: string;
}

export function useDiagnosisSuggestion() {
  const [suggestions, setSuggestions] = useState<DiagnosisSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSuggestions = async (request: SuggestRequest) => {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-diagnosis", {
        body: request,
      });

      if (error) throw error;

      const items = data?.suggestions || [];
      setSuggestions(items);
      if (items.length === 0) {
        toast.info("No suggestions could be generated for this case.");
      }
    } catch (err: any) {
      console.error("Diagnosis suggestion error:", err);
      toast.error("Failed to get AI suggestions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, isLoading, fetchSuggestions, clearSuggestions };
}
