import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Plus, Loader2, Clock, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SyncSchedule {
  id: string;
  frequency: string;
  enabled: boolean;
  system_name: string | null;
  next_run_at: string;
  last_run_at: string | null;
}

export function AutoSyncScheduler() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newFreq, setNewFreq] = useState("daily");
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["auto-sync-schedules", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auto_sync_schedules")
        .select("id, user_id, system_name, frequency, enabled, last_run_at, next_run_at, smart_session_id, created_at, updated_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SyncSchedule[];
    },
  });

  const createSchedule = useMutation({
    mutationFn: async () => {
      const nextRun = new Date();
      if (newFreq === "daily") nextRun.setDate(nextRun.getDate() + 1);
      else if (newFreq === "weekly") nextRun.setDate(nextRun.getDate() + 7);
      else nextRun.setMonth(nextRun.getMonth() + 1);

      const { error } = await supabase.from("auto_sync_schedules").insert({
        user_id: user!.id,
        frequency: newFreq,
        system_name: newName || "FHIR Import",
        next_run_at: nextRun.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-sync-schedules"] });
      toast({ title: t("autoSync.scheduleCreated"), description: t("autoSync.syncSetTo", { frequency: t(`autoSync.${newFreq}`) }) });
      setShowAdd(false);
      setNewName("");
    },
  });

  const toggleSchedule = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("auto_sync_schedules")
        .update({ enabled } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auto-sync-schedules"] }),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("auto_sync_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-sync-schedules"] });
      toast({ title: t("autoSync.scheduleDeleted") });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            {t("autoSync.title")}
          </span>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            {t("autoSync.add")}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAdd && (
          <div className="flex items-end gap-2 p-3 rounded-lg border border-dashed bg-muted/20">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">{t("autoSync.systemName")}</label>
              <input
                className="w-full h-8 px-2 text-sm border rounded-md bg-background"
                placeholder={t("autoSync.systemPlaceholder")}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("autoSync.frequency")}</label>
              <Select value={newFreq} onValueChange={setNewFreq}>
                <SelectTrigger className="h-8 w-28 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("autoSync.daily")}</SelectItem>
                  <SelectItem value="weekly">{t("autoSync.weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("autoSync.monthly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-8" onClick={() => createSchedule.mutate()} disabled={createSchedule.isPending}>
              {createSchedule.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t("autoSync.create")}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {t("autoSync.loading")}
          </div>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("autoSync.noSchedules")}
          </p>
        ) : (
          schedules.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.system_name || "FHIR Import"}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">{t(`autoSync.${s.frequency}`, { defaultValue: s.frequency })}</Badge>
                  <Clock className="h-3 w-3" />
                  <span>{t("autoSync.next", { time: formatDistanceToNow(new Date(s.next_run_at), { addSuffix: true }) })}</span>
                  {s.last_run_at && (
                    <span>· {t("autoSync.last", { time: formatDistanceToNow(new Date(s.last_run_at), { addSuffix: true }) })}</span>
                  )}
                </div>
              </div>
              <Switch
                checked={s.enabled}
                onCheckedChange={(enabled) => toggleSchedule.mutate({ id: s.id, enabled })}
              />
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteSchedule.mutate(s.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
