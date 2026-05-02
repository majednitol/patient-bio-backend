/**
 * ChainBreakAlertBanner - Real-time chain break alerts
 * Improvement #2: Real-Time Chain Break Alerting
 */

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, ShieldAlert, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface ChainBreakAlert {
  id: string;
  transaction_id: string | null;
  expected_previous_hash: string | null;
  actual_previous_hash: string | null;
  severity: string;
  details: Record<string, unknown> | null;
  is_resolved: boolean;
  created_at: string;
}

export default function ChainBreakAlertBanner() {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["chain-break-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chain_break_alerts")
        .select("*")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as ChainBreakAlert[];
    },
    refetchInterval: 60000,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("chain-break-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chain_break_alerts" },
        (payload) => {
          const alert = payload.new as ChainBreakAlert;
          toast({
            title: "⚠️ Chain Break Detected!",
            description: `A blockchain chain break was detected at ${format(new Date(alert.created_at), "HH:mm:ss")}`,
            variant: "destructive",
          });
          queryClient.invalidateQueries({ queryKey: ["chain-break-alerts"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const handleResolve = async (alertId: string) => {
    const { error } = await supabase
      .from("chain_break_alerts")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", alertId);

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["chain-break-alerts"] });
      toast({ title: "Alert resolved" });
    }
  };

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (isLoading || visibleAlerts.length === 0) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Chain Break Monitor
          </CardTitle>
          <CardDescription>No active chain break alerts — blockchain integrity intact</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-destructive">
          <ShieldAlert className="h-5 w-5" />
          Chain Break Alerts
          <Badge variant="destructive" className="ml-2">{visibleAlerts.length}</Badge>
        </CardTitle>
        <CardDescription>Active chain integrity violations detected</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleAlerts.map((alert) => (
          <div key={alert.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-destructive/20 bg-background">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Chain break at {format(new Date(alert.created_at), "MMM d, HH:mm:ss")}
                </p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  Expected: {alert.expected_previous_hash?.slice(0, 20)}...
                </p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  Got: {alert.actual_previous_hash?.slice(0, 20)}...
                </p>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="outline" size="sm" onClick={() => handleResolve(alert.id)}>
                Resolve
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDismissed((s) => new Set(s).add(alert.id))}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
