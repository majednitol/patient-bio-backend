import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface FuzzyMatch {
  id: string;
  display_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  patient_passport_id: string | null;
}

/**
 * Live fuzzy search for existing patients by name.
 * Uses trigram/ILIKE matching against user_profiles.
 * Returns up to 5 similar patients as the user types.
 */
export function useFuzzyPatientSearch(nameQuery: string, enabled = true) {
  const [results, setResults] = useState<FuzzyMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(nameQuery, 300);

  useEffect(() => {
    if (!enabled || !debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const search = async () => {
      // Split into words for multi-word matching
      const words = debouncedQuery.trim().split(/\s+/).filter(Boolean);
      
      let query = supabase
        .from("user_profiles")
        .select("id, display_name, phone, date_of_birth, gender, patient_passport_id")
        .limit(5);

      // Use ILIKE for each word
      for (const word of words) {
        query = query.ilike("display_name", `%${word}%`);
      }

      const { data, error } = await query;

      if (cancelled || error) return;
      setResults(data || []);
      setIsSearching(false);
    };

    search();
    return () => { cancelled = true; };
  }, [debouncedQuery, enabled]);

  return { results, isSearching };
}
