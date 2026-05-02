import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Pause, Play, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ContributionSchedulerProps {
  selectedCategories: string[];
  jurisdiction: string;
}

const CADENCE_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

function getNextRunAt(cadence: string): string {
  const now = new Date();
  switch (cadence) {
    case 'weekly': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'monthly': { const d = new Date(now); d.setMonth(d.getMonth() + 1); return d.toISOString(); }
    case 'quarterly': { const d = new Date(now); d.setMonth(d.getMonth() + 3); return d.toISOString(); }
    default: return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

export const ContributionScheduler = ({ selectedCategories, jurisdiction }: ContributionSchedulerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cadence, setCadence] = useState("monthly");

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['contribution-schedules', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contribution_schedules' as any)
        .select('*')
        .eq('patient_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Array<{
        id: string;
        categories: string[];
        jurisdiction: string;
        cadence: string;
        next_run_at: string;
        is_paused: boolean;
        created_at: string;
      }>;
    },
    enabled: !!user?.id,
  });

  const createSchedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('contribution_schedules' as any)
        .insert([{
          patient_id: user!.id,
          categories: selectedCategories,
          jurisdiction,
          cadence,
          next_run_at: getNextRunAt(cadence),
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contribution-schedules'] });
      toast({ title: "Schedule created", description: `Auto-contributions will run ${cadence}.` });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const togglePause = useMutation({
    mutationFn: async ({ id, isPaused }: { id: string; isPaused: boolean }) => {
      const { error } = await supabase
        .from('contribution_schedules' as any)
        .update({ is_paused: !isPaused })
        .eq('id', id)
        .eq('patient_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contribution-schedules'] });
      toast({ title: "Schedule updated" });
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contribution_schedules' as any)
        .delete()
        .eq('id', id)
        .eq('patient_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contribution-schedules'] });
      toast({ title: "Schedule cancelled" });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          Scheduled Contributions
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Automatically re-contribute your latest data on a recurring schedule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Create new schedule */}
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
            <span className="text-xs font-medium">Schedule auto-contribution:</span>
            <div className="flex gap-1.5">
              {CADENCE_OPTIONS.map(opt => (
                <Button
                  key={opt.value}
                  variant={cadence === opt.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setCadence(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => createSchedule.mutate()}
              disabled={createSchedule.isPending}
            >
              {createSchedule.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Schedule"}
            </Button>
          </div>
        )}

        {/* Existing schedules */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : schedules.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No active schedules</p>
        ) : (
          schedules.map(s => (
            <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Badge variant={s.is_paused ? "secondary" : "default"} className="text-[10px] px-1.5 py-0">
                    {s.is_paused ? "Paused" : "Active"}
                  </Badge>
                  <span className="text-xs font-medium capitalize">{s.cadence}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {s.categories.join(', ')} • Next: {format(new Date(s.next_run_at), 'PP')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => togglePause.mutate({ id: s.id, isPaused: s.is_paused })}
                >
                  {s.is_paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => deleteSchedule.mutate(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
