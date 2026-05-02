import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Bell, Coins } from "lucide-react";
import { useResearchSharingPreferences } from "@/hooks/useResearchSharingPreferences";
import { useNavigate } from "react-router-dom";

export function ResearchPreferencesQuickCard() {
  const { preferences, isLoading, upsert } = useResearchSharingPreferences();
  const navigate = useNavigate();

  if (isLoading) return null;

  const freqLabel = {
    immediate: "Immediate",
    daily: "Daily",
    weekly: "Weekly",
  }[preferences.notification_frequency] || preferences.notification_frequency;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-3 py-2.5 sm:px-6 sm:pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Research Preferences
          </CardTitle>
          <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap">
            {freqLabel} notifications
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">New requests</span>
            </div>
            <Switch
              checked={preferences.notify_new_requests}
              onCheckedChange={(v) => upsert.mutate({ notify_new_requests: v })}
              className="scale-90"
              disabled={upsert.isPending}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">Earnings</span>
            </div>
            <Switch
              checked={preferences.notify_earnings}
              onCheckedChange={(v) => upsert.mutate({ notify_earnings: v })}
              className="scale-90"
              disabled={upsert.isPending}
            />
          </div>
          <div className="flex justify-end pt-0.5">
            <Button
              variant="link"
              size="sm"
              className="text-xs h-auto p-0"
              onClick={() => navigate("/dashboard/research-preferences")}
            >
              All preferences →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
