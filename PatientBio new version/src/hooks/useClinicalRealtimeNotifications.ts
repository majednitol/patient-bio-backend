import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const CLINICAL_TABLES = [
  "patient_running_treatments",
  "patient_care_team",
  "patient_clinical_investigations",
] as const;

export function useClinicalRealtimeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("clinical-auto-populate")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "patient_running_treatments",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const source = (payload.new as any)?.source;
          if (source && source !== "manual") {
            queryClient.invalidateQueries({ queryKey: ["clinical-treatments"] });
            queryClient.invalidateQueries({ queryKey: ["clinical-completeness"] });
            toast({ title: "💊 Treatment auto-added from a recent prescription" });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "patient_care_team",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const source = (payload.new as any)?.source;
          if (source && source !== "manual") {
            queryClient.invalidateQueries({ queryKey: ["clinical-care-team"] });
            queryClient.invalidateQueries({ queryKey: ["clinical-completeness"] });
            toast({ title: "👨‍⚕️ Doctor auto-added to your care team" });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "patient_clinical_investigations",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const source = (payload.new as any)?.source;
          if (source && source !== "manual") {
            queryClient.invalidateQueries({ queryKey: ["clinical-investigations"] });
            queryClient.invalidateQueries({ queryKey: ["clinical-completeness"] });
            toast({ title: "🔬 Investigation auto-recorded from vitals" });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
