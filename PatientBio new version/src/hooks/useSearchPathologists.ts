import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

export interface PathologistSearchResult {
  user_id: string;
  full_name: string;
  lab_name: string | null;
  specialization_area: string | null;
  lab_address: string | null;
  is_verified: boolean | null;
  avatar_url: string | null;
  total_experience: number | null;
}

export function useSearchPathologists(searchTerm: string) {
  const debouncedTerm = useDebounce(searchTerm, 300);

  return useQuery({
    queryKey: ["search-pathologists", debouncedTerm],
    queryFn: async () => {
      const query = supabase
        .from("pathologist_profiles")
        .select("user_id, full_name, lab_name, specialization_area, lab_address, is_verified, avatar_url, total_experience")
        .eq("is_verified", true)
        .order("full_name");

      if (debouncedTerm && debouncedTerm.length >= 2) {
        query.or(
          `full_name.ilike.%${debouncedTerm}%,lab_name.ilike.%${debouncedTerm}%,specialization_area.ilike.%${debouncedTerm}%,lab_address.ilike.%${debouncedTerm}%`
        );
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return (data || []) as PathologistSearchResult[];
    },
    enabled: true,
  });
}
