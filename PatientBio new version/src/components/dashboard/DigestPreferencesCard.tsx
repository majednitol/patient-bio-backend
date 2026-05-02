import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Calendar, Clock } from "lucide-react";
import { useDigestPreferences } from "@/hooks/useDigestPreferences";
import { format } from "date-fns";

export const DigestPreferencesCard = () => {
  const { t } = useTranslation();
  const {
    preferences,
    isLoading,
    toggleDigest,
    updateDay,
    updateHour,
    isUpdating,
    DAYS_OF_WEEK,
    HOURS,
  } = useDigestPreferences();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isEnabled = preferences?.weekly_digest_enabled ?? true;
  const selectedDay = preferences?.preferred_day ?? 1;
  const selectedHour = preferences?.preferred_hour ?? 9;
  const lastSent = preferences?.last_sent_at;

  return (
    <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-primary" />
          {t("digestPreferences.title")}
        </CardTitle>
        <CardDescription>
          {t("digestPreferences.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="digest-toggle" className="text-base font-medium">
              {t("digestPreferences.enableDigest")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("digestPreferences.receiveWeekly")}
            </p>
          </div>
          <Switch
            id="digest-toggle"
            checked={isEnabled}
            onCheckedChange={toggleDigest}
            disabled={isUpdating}
          />
        </div>

        {isEnabled && (
          <>
            <div className="h-px bg-border" />

            <div className="grid gap-2">
              <Label htmlFor="digest-day" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {t("digestPreferences.deliveryDay")}
              </Label>
              <Select
                value={selectedDay.toString()}
                onValueChange={(value) => updateDay(parseInt(value))}
                disabled={isUpdating}
              >
                <SelectTrigger id="digest-day">
                  <SelectValue placeholder={t("digestPreferences.selectDay")} />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="digest-hour" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {t("digestPreferences.deliveryTime")}
              </Label>
              <Select
                value={selectedHour.toString()}
                onValueChange={(value) => updateHour(parseInt(value))}
                disabled={isUpdating}
              >
                <SelectTrigger id="digest-hour">
                  <SelectValue placeholder={t("digestPreferences.selectTime")} />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value.toString()}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {lastSent && (
              <p className="text-xs text-muted-foreground">
                {t("digestPreferences.lastSent", { date: format(new Date(lastSent), "PPP 'at' p") })}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};