import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

export interface ICD11Result {
  code: string;
  description: string;
  category: string;
  chapter: string;
  aliases: string[];
}

export function useICD11Search(query: string, limit = 15) {
  const debouncedQuery = useDebounce(query.trim(), 300);

  return useQuery({
    queryKey: ["icd11-search", debouncedQuery],
    queryFn: async (): Promise<ICD11Result[]> => {
      if (debouncedQuery.length < 2) return [];

      const q = debouncedQuery.toLowerCase();

      const { data, error } = await supabase
        .from("icd11_codes")
        .select("code, description, category, chapter, aliases")
        .or(
          `code.ilike.%${q}%,description.ilike.%${q}%,aliases.cs.{"${q}"}`
        )
        .limit(limit);

      if (error) throw error;
      if (!data) return [];

      return (data as ICD11Result[]).sort((a, b) => {
        const aCodeMatch = a.code.toLowerCase().startsWith(q) ? 0 : 1;
        const bCodeMatch = b.code.toLowerCase().startsWith(q) ? 0 : 1;
        if (aCodeMatch !== bCodeMatch) return aCodeMatch - bCodeMatch;
        return a.description.localeCompare(b.description);
      });
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 60_000,
  });
}
