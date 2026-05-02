/**
 * useConsultationBrief - Fetches an AI-generated pre-consultation narrative brief
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BriefResult {
  brief: string;
  data_available: boolean;
  ai_generated?: boolean;
}

export function useConsultationBrief(
  patientId: string | null,
  appointmentId?: string,
  enabled = true
) {
  const [data, setData] = useState<BriefResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId || !enabled) {
      setData(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    supabase.functions
      .invoke("generate-consultation-brief", {
        body: { patient_id: patientId, appointment_id: appointmentId },
      })
      .then(({ data: result, error: fnError }) => {
        if (cancelled) return;
        if (fnError) {
          setError(fnError.message);
        } else {
          setData(result as BriefResult);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId, appointmentId, enabled]);

  return { data, isLoading, error };
}
