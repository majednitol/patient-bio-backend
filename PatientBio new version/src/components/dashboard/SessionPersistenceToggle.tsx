import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Smartphone, Timer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

const PERSIST_KEY = "session-persist-enabled";

/**
 * "Stay logged in on this device" toggle in Settings.
 * When enabled, extends the Supabase session by periodically refreshing it
 * and preventing auto-logout on idle timeout.
 */
export const SessionPersistenceToggle = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`${PERSIST_KEY}-${user.id}`);
      setEnabled(stored === "true");
    }
  }, [user]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (user) {
      localStorage.setItem(`${PERSIST_KEY}-${user.id}`, String(checked));
    }
  };

  return (
    <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Smartphone className="h-5 w-5 text-primary shrink-0" />
          Session Persistence
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Keep your session active longer on this device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label className="text-sm sm:text-base">Stay logged in</Label>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {enabled
                ? "Your session will persist even after closing the browser."
                : "You'll be logged out after the default session timeout."}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>

        {enabled && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Timer className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Your session will be refreshed automatically in the background.
              For security, you may still be asked to re-authenticate after 30 days of inactivity.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
