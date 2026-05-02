import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";

export const usePlatformSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key, value, updated_at");
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_TIMES.STANDARD,
  });

  const logoUrl = settings?.find((s) => s.key === "logo_url")?.value || null;
  const platformName = settings?.find((s) => s.key === "platform_name")?.value || null;
  const lastUpdated = settings?.length
    ? settings.reduce((latest, s) => {
        const d = s.updated_at ? new Date(s.updated_at).getTime() : 0;
        return d > latest ? d : latest;
      }, 0)
    : null;

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("platform_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
  });

  const deleteSetting = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from("platform_settings")
        .delete()
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
  });

  return { logoUrl, platformName, lastUpdated, settings, isLoading, updateSetting, deleteSetting };
};
