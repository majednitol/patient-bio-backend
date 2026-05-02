import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useLiveQueuePosition } from "@/hooks/useLiveQueuePosition";
import { Users, Timer, Zap, Loader2, Bell, Stethoscope, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, addMinutes } from "date-fns";

interface LiveQueuePositionCardProps {
  appointmentId?: string;
}

export function LiveQueuePositionCard({ appointmentId }: LiveQueuePositionCardProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useLiveQueuePosition(appointmentId);
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifyMe, setNotifyMe] = useState(false);
  const prevPosition = useRef<number | null>(null);

  // Trigger notification when position reaches 1
  useEffect(() => {
    if (!notifyMe || !data || data.status !== "waiting") return;
    if (data.position === 1 && prevPosition.current !== 1 && user?.id) {
      supabase.from("notifications").insert({
        user_id: user.id,
        title: t("liveQueue.youreNext"),
        message: t("liveQueue.beReady"),
        type: "queue_alert",
      }).then(() => {
        toast({ title: `🔔 ${t("liveQueue.youreNext")}`, description: t("liveQueue.beReady") });
      });
    }
    prevPosition.current = data.position;
  }, [data?.position, notifyMe, user?.id]);

  if (isLoading) {
    return (
      <Card className="diagnostic-card border border-border/60">
        <CardContent className="p-4 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("liveQueue.loadingQueue")}</span>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.status === "not_in_queue") return null;

  if (data.status === "in_consultation") {
    return (
      <Card className="diagnostic-card bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center animate-pulse">
              <Zap className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">{t("liveQueue.yourTurn")}</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {t("liveQueue.doctorReady")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Waiting state
  const progressPercent = data.totalWaiting > 0
    ? Math.max(5, ((data.totalWaiting - data.position + 1) / data.totalWaiting) * 100)
    : 50;

  const estimatedTime = data.estimatedWaitMinutes != null
    ? format(addMinutes(new Date(), data.estimatedWaitMinutes), "h:mm a")
    : null;

  return (
    <Card className="diagnostic-card border border-border/60 bg-accent/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {t("liveQueue.positionInLine", { position: data.position })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(data.totalWaiting !== 1 ? "liveQueue.patientsWaiting_plural" : "liveQueue.patientsWaiting", { count: data.totalWaiting })}
              </p>
            </div>
          </div>
          {data.estimatedWaitMinutes != null && (
            <div className="flex flex-col items-end gap-0.5">
              <Badge variant="outline" className="gap-1.5 text-amber-700 border-amber-300 bg-amber-100/50 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 text-sm px-3 py-1">
                <Timer className="h-3.5 w-3.5" />
                {t("liveQueue.estMinutes", { minutes: data.estimatedWaitMinutes })}
              </Badge>
              {estimatedTime && (
                <span className="text-[10px] text-muted-foreground">
                  {t("liveQueue.estAt", { time: estimatedTime })}
                </span>
              )}
            </div>
          )}
        </div>

        {data.doctorRunningLate && (
          <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 rounded-md px-2.5 py-1.5">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {t("liveQueue.doctorRunningLate")}
          </div>
        )}

        {data.position > 1 && !data.doctorRunningLate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-2.5 py-1.5">
            <Stethoscope className="h-3 w-3" />
            {t("liveQueue.doctorSeeingPatient")}
          </div>
        )}

        <Progress value={progressPercent} className="h-2 bg-amber-200/50 dark:bg-amber-900/30 [&>div]:bg-amber-500" />

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {t("liveQueue.updatesAuto")}
          </p>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Bell className={`h-3 w-3 ${notifyMe ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-[10px] text-muted-foreground">{t("liveQueue.notifyMe")}</span>
            <Switch
              checked={notifyMe}
              onCheckedChange={setNotifyMe}
              className="scale-75"
            />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}