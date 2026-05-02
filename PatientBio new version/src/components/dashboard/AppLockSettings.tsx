import { Lock, Timer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppLock } from "@/hooks/useAppLock";
import { useTranslation } from "react-i18next";

const TIMEOUT_OPTIONS = [
  { label: "Immediately", value: 0 },
  { label: "After 30 seconds", value: 30_000 },
  { label: "After 1 minute", value: 60_000 },
  { label: "After 5 minutes", value: 300_000 },
  { label: "After 15 minutes", value: 900_000 },
];

export const AppLockSettings = () => {
  const { t } = useTranslation();
  const { enabled, timeoutMs, setEnabled, setTimeout } = useAppLock();

  return (
    <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">
            {t("appLock.settingsTitle", "App Lock")}
          </CardTitle>
        </div>
        <CardDescription>
          {t(
            "appLock.settingsDesc",
            "Require biometrics or PIN when returning to the app after being away.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="app-lock-toggle" className="text-sm">
            {t("appLock.enableLabel", "Enable App Lock")}
          </Label>
          <Switch
            id="app-lock-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              {t("appLock.lockAfter", "Lock after")}
            </div>
            <Select
              value={String(timeoutMs)}
              onValueChange={(val) => setTimeout(parseInt(val, 10))}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEOUT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {enabled && (
          <p className="text-xs text-muted-foreground">
            {t(
              "appLock.hint",
              "Make sure you have a PIN or biometric credential set up before enabling.",
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
