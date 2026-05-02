import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function WaitTimeHistoryBadge() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["wait-time-history", user?.id],
    enabled: !!user?.id,
    staleTime: STALE_TIMES.LONG,
    queryFn: async () => {
      const { data: appts } = await supabase
        .from("appointments")
        .select("checked_in_at, consultation_started_at")
        .eq("patient_id", user!.id)
        .not("checked_in_at", "is", null)
        .not("consultation_started_at", "is", null)
        .order("appointment_date", { ascending: false })
        .limit(20);

      if (!appts?.length) return null;

      const waits = appts.map((a) => {
        const checkin = new Date(a.checked_in_at!).getTime();
        const start = new Date(a.consultation_started_at!).getTime();
        return Math.max(0, (start - checkin) / 60000);
      });

      const avg = Math.round(waits.reduce((s, w) => s + w, 0) / waits.length);
      return { avgMinutes: avg, count: waits.length };
    },
  });

  if (!data) return null;

  return (
    <Badge variant="outline" className="gap-1.5 text-xs font-normal">
      <Clock className="h-3 w-3" />
      {t("waitTimeBadge.avgWait", { minutes: data.avgMinutes })}
      <span className="text-muted-foreground">({t("waitTimeBadge.visits", { count: data.count })})</span>
    </Badge>
  );
}
