import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppointmentWaitlist } from "@/hooks/useAppointmentWaitlist";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { Bell, Clock, X, CalendarDays, Loader2, CheckCircle2, Hourglass } from "lucide-react";

export function WaitlistCard() {
  const { waitlistEntries, isLoading, cancelWaitlistEntry } = useAppointmentWaitlist();

  // Get doctor names for all waitlist entries
  const doctorIds = [...new Set(waitlistEntries.map((e) => e.doctor_id))];
  const { data: doctorMap } = useQuery({
    queryKey: ["waitlist-doctors", doctorIds.join(",")],
    enabled: doctorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("doctor_profiles")
        .select("user_id, full_name, specialty")
        .in("user_id", doctorIds);
      const map = new Map<string, { name: string; specialty: string | null }>();
      (data || []).forEach((d) => map.set(d.user_id, { name: d.full_name, specialty: d.specialty }));
      return map;
    },
  });

  if (isLoading) {
    return (
      <Card className="diagnostic-card">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (waitlistEntries.length === 0) return null;

  const notifiedCount = waitlistEntries.filter((e) => e.status === "notified").length;

  return (
    <Card className="diagnostic-card border-amber-200/60 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/30 to-background dark:from-amber-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            Waitlist
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {waitlistEntries.length}
            </Badge>
          </div>
          {notifiedCount > 0 && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] gap-1 animate-pulse">
              <CheckCircle2 className="h-3 w-3" />
              {notifiedCount} slot{notifiedCount > 1 ? "s" : ""} available!
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-1">
        {waitlistEntries.map((entry) => {
          const doctor = doctorMap?.get(entry.doctor_id);
          const isNotified = entry.status === "notified";
          
          return (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isNotified
                  ? "border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 ring-1 ring-green-200 dark:ring-green-800"
                  : "bg-card/50 hover:bg-muted/30"
              }`}
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                isNotified
                  ? "bg-green-100 dark:bg-green-900/40"
                  : "bg-amber-100/60 dark:bg-amber-900/20"
              }`}>
                {isNotified ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <Hourglass className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  Dr. {doctor?.name || "Loading..."}
                </p>
                {doctor?.specialty && (
                  <p className="text-[10px] text-muted-foreground">{doctor.specialty}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {format(parseISO(entry.preferred_date), "MMM d, yyyy")}
                  </span>
                  {entry.preferred_time_start && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {entry.preferred_time_start}
                      {entry.preferred_time_end ? ` – ${entry.preferred_time_end}` : "+"}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/60">
                    · {formatDistanceToNow(parseISO(entry.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <Badge
                variant={isNotified ? "default" : "secondary"}
                className={
                  isNotified
                    ? "bg-green-600 text-white text-[10px] shrink-0"
                    : "text-[10px] shrink-0"
                }
              >
                {isNotified ? "Book Now!" : "Waiting"}
              </Badge>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => cancelWaitlistEntry.mutate(entry.id)}
                disabled={cancelWaitlistEntry.isPending}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
