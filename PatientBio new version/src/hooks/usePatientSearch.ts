import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

export interface PatientSearchResult {
  id: string;
  display_name: string;
  phone: string | null;
  patient_passport_id: string | null;
}

export function usePatientSearch(query: string) {
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const search = async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, display_name, phone, patient_passport_id")
        .or(
          `patient_passport_id.ilike.%${debouncedQuery}%,display_name.ilike.%${debouncedQuery}%`
        )
        .limit(10);

      if (cancelled || error) {
        if (!cancelled) setIsSearching(false);
        return;
      }
      setResults(data || []);
      setIsSearching(false);
    };

    search();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  return { results, isSearching };
}
