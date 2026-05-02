import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mail, Settings } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { NotificationPreferencesCard } from "@/components/dashboard/NotificationPreferencesCard";
import { DigestPreferencesCard } from "@/components/dashboard/DigestPreferencesCard";
import { BiometricSettings } from "@/components/dashboard/BiometricSettings";
import { AppLockSettings } from "@/components/dashboard/AppLockSettings";
import { TrustedDevicesCard } from "@/components/dashboard/TrustedDevicesCard";
import { OfflineSettings } from "@/components/dashboard/OfflineSettings";
import { LanguageSettings } from "@/components/dashboard/LanguageSettings";
import { PushNotificationToggle } from "@/components/dashboard/PushNotificationToggle";
import { SessionPersistenceToggle } from "@/components/dashboard/SessionPersistenceToggle";
import { StorageUsage } from "@/components/dashboard/StorageUsage";

const SettingsPage = () => {
  const { t } = useTranslation();
  const { profile, updateProfile } = useUserProfile();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
          {t("settingsPage.title")}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {t("settingsPage.description")}
        </p>
      </div>

      <div className="grid gap-3 sm:gap-6 lg:grid-cols-2">
        {/* Notification Categories */}
        <NotificationPreferencesCard />

        {/* Email Notifications */}
        <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {t("profilePage.emailNotifications")}
            </CardTitle>
            <CardDescription>
              {t("profilePage.manageEmailNotifications")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notification-toggle" className="text-base">
                  {t("profilePage.accessNotificationEmails")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("profilePage.receiveEmailOnAccess")}
                </p>
              </div>
              <Switch
                id="notification-toggle"
                checked={profile?.notification_email_enabled ?? true}
                onCheckedChange={(checked) => {
                  updateProfile({ notification_email_enabled: checked });
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Digest */}
        <DigestPreferencesCard />

        {/* Push Notifications */}
        <PushNotificationToggle />

        {/* Biometric Authentication */}
        <BiometricSettings />

        {/* App Lock */}
        <AppLockSettings />

        {/* Trusted Devices */}
        <TrustedDevicesCard />

        {/* Offline Access */}
        <OfflineSettings />

        {/* Storage Usage */}
        <StorageUsage />

        {/* Session Persistence */}
        <SessionPersistenceToggle />

        {/* Language */}
        <LanguageSettings />
      </div>
    </div>
  );
};

export default SettingsPage;
