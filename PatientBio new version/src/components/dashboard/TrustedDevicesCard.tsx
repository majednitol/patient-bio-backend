import { useTranslation } from "react-i18next";
import { Smartphone, Monitor, Tablet, Trash2, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTrustedDevices } from "@/hooks/useTrustedDevices";
import { formatDistanceToNow } from "date-fns";

export const TrustedDevicesCard = () => {
  const { t } = useTranslation();
  const {
    devices,
    isLoading,
    trustDevice,
    removeTrustedDevice,
    getCurrentFingerprint,
  } = useTrustedDevices();

  const currentFingerprint = getCurrentFingerprint();

  const getDeviceIcon = (os: string | null) => {
    if (!os) return <Monitor className="h-5 w-5" />;
    const osLower = os.toLowerCase();
    if (osLower.includes("ios") || osLower.includes("android")) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (osLower.includes("ipad")) {
      return <Tablet className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const isCurrentDevice = (fingerprint: string) => {
    return fingerprint === currentFingerprint;
  };

  return (
    <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg">{t("trustedDevices.title")}</CardTitle>
            <CardDescription>
              {t("trustedDevices.description")}
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => trustDevice.mutate(undefined)}
            disabled={trustDevice.isPending}
          >
            {trustDevice.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {t("trustedDevices.trustThis")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Smartphone className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>{t("trustedDevices.noDevices")}</p>
            <p className="text-sm">{t("trustedDevices.noDevicesDesc")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border ${
                  isCurrentDevice(device.device_fingerprint)
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-background rounded-lg shrink-0">
                    {getDeviceIcon(device.os)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      <span className="truncate">{device.device_name || t("trustedDevices.unknownDevice")}</span>
                      {isCurrentDevice(device.device_fingerprint) && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full shrink-0">
                          {t("trustedDevices.current")}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-0">
                      <span>{device.browser} • {device.os}</span>
                      {device.last_used_at && (
                        <span className="sm:ml-2">
                          <span className="hidden sm:inline">• </span>{t("trustedDevices.lastUsed", { time: formatDistanceToNow(new Date(device.last_used_at), { addSuffix: true }) })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 sm:h-8 sm:w-8 self-end sm:self-auto shrink-0"
                  onClick={() => removeTrustedDevice.mutate(device.id)}
                  disabled={removeTrustedDevice.isPending}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
