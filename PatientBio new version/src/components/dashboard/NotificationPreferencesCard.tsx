import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Bell, Eye, Shield, Pill, Calendar, MessageSquare, AlertTriangle } from "lucide-react";

const PREFERENCE_ICONS = {
  data_access: { icon: Eye, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  emergency_access: { icon: Shield, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", isCritical: true },
  prescriptions: { icon: Pill, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  appointments: { icon: Calendar, color: "text-teal-600 dark:text-teal-400", bgColor: "bg-teal-100 dark:bg-teal-900/30" },
  requests: { icon: MessageSquare, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
} as const;

const PREFERENCE_KEYS = ["data_access", "emergency_access", "prescriptions", "appointments", "requests"] as const;

export const NotificationPreferencesCard = () => {
  const { t } = useTranslation();
  const { preferences, pushEnabled, loading, saving, updatePreference, updatePushEnabled } = useNotificationPreferences();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const labelMap: Record<string, string> = {
    data_access: t("notificationPrefs.dataAccess"),
    emergency_access: t("notificationPrefs.emergencyAccess"),
    prescriptions: t("notificationPrefs.prescriptions"),
    appointments: t("notificationPrefs.appointments"),
    requests: t("notificationPrefs.requests"),
  };

  const descMap: Record<string, string> = {
    data_access: t("notificationPrefs.dataAccessDesc"),
    emergency_access: t("notificationPrefs.emergencyAccessDesc"),
    prescriptions: t("notificationPrefs.prescriptionsDesc"),
    appointments: t("notificationPrefs.appointmentsDesc"),
    requests: t("notificationPrefs.requestsDesc"),
  };

  return (
    <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="flex items-start gap-2 text-base sm:text-lg">
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <span>{t("notificationPrefs.title")}</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {t("notificationPrefs.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Master Push Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b mb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Label className="text-base font-medium">{t("notificationPrefs.pushNotifications")}</Label>
              <Badge variant="outline" className="text-xs">
                {t("notificationPrefs.master")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("notificationPrefs.pushDesc")}
            </p>
          </div>
          <Switch
            className="self-end sm:self-auto shrink-0"
            checked={pushEnabled}
            onCheckedChange={updatePushEnabled}
            disabled={saving}
          />
        </div>

        {/* Individual Category Toggles */}
        <div className="space-y-1">
          {PREFERENCE_KEYS.map((key) => {
            const config = PREFERENCE_ICONS[key];
            const Icon = config.icon;
            return (
              <div
                key={key}
                className="flex items-center justify-between py-3 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors gap-2 sm:gap-3"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${config.color}`} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <Label className="text-sm font-medium cursor-pointer">
                        {labelMap[key]}
                      </Label>
                      {"isCritical" in config && config.isCritical && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {t("notificationPrefs.critical")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {descMap[key]}
                    </p>
                  </div>
                </div>
                <Switch
                  className="shrink-0"
                  checked={preferences[key]}
                  onCheckedChange={(checked) => updatePreference(key, checked)}
                  disabled={saving}
                />
              </div>
            );
          })}
        </div>

        {/* Info Note */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
            {t("notificationPrefs.criticalNote")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};