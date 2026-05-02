import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ActiveUsersCard() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-active-users"],
    queryFn: async () => {
      const [countsResult, roleResult] = await Promise.all([
        supabase.rpc("get_active_user_counts"),
        supabase.from("user_roles").select("role"),
      ]);

      if (countsResult.error) throw countsResult.error;

      const counts = Array.isArray(countsResult.data) ? countsResult.data[0] : countsResult.data;

      const roleCounts: Record<string, number> = {};
      (roleResult.data || []).forEach((r) => {
        roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
      });

      return {
        hourly: Number(counts?.hourly_active || 0),
        daily: Number(counts?.daily_active || 0),
        weekly: Number(counts?.weekly_active || 0),
        monthly: Number(counts?.monthly_active || 0),
        totalUsers: Number(counts?.total_users || 0),
        roleCounts,
      };
    },
    staleTime: STALE_TIMES.FREQUENT,
    refetchInterval: 60000,
  });

  const roleLabelsMap: Record<string, string> = {
    user: t("adminHealth.patients"),
    doctor: t("adminHealth.doctors"),
    hospital_admin: t("adminHealth.hospitalAdmins"),
    pathologist: t("adminHealth.pathologists"),
    researcher: t("adminHealth.researchers"),
    admin: t("adminHealth.admins"),
    doctor_staff: t("adminHealth.doctorStaff"),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("adminHealth.activeUsers")}
        </CardTitle>
        <CardDescription>
          {t("adminHealth.totalRegistered", { count: data?.totalUsers || 0 })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t("adminHealth.lastHour"), value: data?.hourly || 0 },
                { label: t("adminHealth.last24h"), value: data?.daily || 0 },
                { label: t("adminHealth.last7d"), value: data?.weekly || 0 },
                { label: t("adminHealth.last30d"), value: data?.monthly || 0 },
              ].map((tier) => (
                <div key={tier.label} className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{tier.value}</p>
                  <p className="text-xs text-muted-foreground">{tier.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("adminHealth.byRole")}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data?.roleCounts || {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([role, count]) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {roleLabelsMap[role] || role}: {count}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}