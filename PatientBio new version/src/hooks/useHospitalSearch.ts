import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export const useHospitalSearch = (searchQuery: string) => {
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return useQuery({
    queryKey: ["hospital-search", debouncedQuery],
    queryFn: async () => {
      let query = supabase
        .from("hospitals")
        .select("id, name, city, type, logo_url, description")
        .eq("is_active", true)
        .order("name")
        .limit(20);

      if (debouncedQuery.trim()) {
        query = query.ilike("name", `%${debouncedQuery.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
};
