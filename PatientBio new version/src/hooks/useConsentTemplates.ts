import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConsentTemplate {
  id: string;
  name: string;
  description: string | null;
  consent_type: string;
  granted_to_type: string | null;
  scope: string[];
  purpose: string;
  expiry_days: number | null;
  icon_name: string | null;
  is_active: boolean;
}

export function useConsentTemplates() {
  return useQuery({
    queryKey: ["consent-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consent_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as ConsentTemplate[];
    },
  });
}
