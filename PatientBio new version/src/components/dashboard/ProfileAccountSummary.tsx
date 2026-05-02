import { Card, CardContent } from "@/components/ui/card";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { Users, FileText, CalendarDays, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

export const ProfileAccountSummary = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: metrics } = useProfileCompletion();

  const { data: stats } = useQuery({
    queryKey: ["profile-account-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { doctorCount: 0, recordCount: 0 };

      const [doctorRes, recordRes] = await Promise.all([
        supabase
          .from("doctor_connections")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("health_records")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      return {
        doctorCount: doctorRes.count ?? 0,
        recordCount: recordRes.count ?? 0,
      };
    },
    enabled: !!user?.id,
  });

  const memberSince = user?.created_at
    ? format(new Date(user.created_at), "MMM yyyy")
    : "—";

  const completionPct = metrics?.percentage ?? 0;

  const items = [
    {
      icon: ShieldCheck,
      label: t("profilePage.profileCompletion", "Profile Completion"),
      value: `${completionPct}%`,
      extra: (
        <Progress value={completionPct} className="h-1.5 mt-1" />
      ),
    },
    {
      icon: Users,
      label: t("profilePage.connectedDoctors", "Connected Doctors"),
      value: String(stats?.doctorCount ?? 0),
    },
    {
      icon: FileText,
      label: t("profilePage.healthRecords", "Health Records"),
      value: String(stats?.recordCount ?? 0),
    },
    {
      icon: CalendarDays,
      label: t("profilePage.memberSince", "Member Since"),
      value: memberSince,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-2.5 sm:p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <item.icon className="h-3.5 w-3.5" />
              <span className="text-[11px] sm:text-xs font-medium whitespace-nowrap truncate">{item.label}</span>
            </div>
            <div className="text-base sm:text-lg font-bold">{item.value}</div>
            {item.extra}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
