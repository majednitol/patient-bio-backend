import { Bell, BellOff, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export const PushNotificationToggle = () => {
  const { t } = useTranslation();
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-muted dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t("pushNotifications.title")}</CardTitle>
          </div>
          <CardDescription>
            {t("pushNotifications.notSupported")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t("pushNotifications.title")}</CardTitle>
          </div>
          {permission === "denied" && (
            <Badge variant="destructive">{t("pushNotifications.blocked")}</Badge>
          )}
        </div>
        <CardDescription>
          {t("pushNotifications.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {permission === "denied" ? (
          <p className="text-sm text-muted-foreground">
            {t("pushNotifications.blockedDesc")}
          </p>
        ) : (
          <div className="flex items-center justify-between">
            <Label htmlFor="push-notifications" className="text-sm">
              {t("pushNotifications.enablePush")}
            </Label>
            <div className="flex items-center gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Switch
                id="push-notifications"
                checked={isSubscribed}
                onCheckedChange={handleToggle}
                disabled={isLoading}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
