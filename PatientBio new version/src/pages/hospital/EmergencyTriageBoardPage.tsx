import { useEffect } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Hospital } from "@/types/hospital";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Clock,
  UserCheck,
  Activity,
  Siren,
  RefreshCw,
  Phone,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface TriageEntry {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  priority: "emergency" | "urgent" | "normal";
  status: "waiting" | "in_consultation" | "completed" | "skipped";
  checked_in_at: string;
  called_at: string | null;
  completed_at: string | null;
  queue_position: number;
  patient_name: string;
  patient_phone: string | null;
  doctor_name: string;
  doctor_specialty: string | null;
  reason: string | null;
}

const TRIAGE_CONFIG = {
  emergency: {
    label: "Red — Immediate",
    color: "bg-red-500",
    textColor: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    badgeClass: "bg-red-500 text-white hover:bg-red-600",
    icon: Siren,
  },
  urgent: {
    label: "Yellow — Urgent",
    color: "bg-amber-500",
    textColor: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    badgeClass: "bg-amber-500 text-white hover:bg-amber-600",
    icon: AlertTriangle,
  },
  normal: {
    label: "Green — Standard",
    color: "bg-emerald-500",
    textColor: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    badgeClass: "bg-emerald-500 text-white hover:bg-emerald-600",
    icon: Activity,
  },
} as const;

function useTriageBoard(hospitalId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["triage-board", hospitalId],
    enabled: !!hospitalId,
    refetchInterval: 10000,
    queryFn: async (): Promise<TriageEntry[]> => {
      const { data: queueEntries, error } = await supabase
        .from("patient_queue")
        .select("id, patient_id, doctor_id, appointment_id, hospital_id, status, checked_in_at, called_at, completed_at, priority, queue_position")
        .eq("hospital_id", hospitalId!)
        .in("status", ["waiting", "in_consultation"])
        .order("checked_in_at", { ascending: true });

      if (error) throw error;
      if (!queueEntries || queueEntries.length === 0) return [];

      const appointmentIds = queueEntries.map((q) => q.appointment_id);
      const doctorIds = [...new Set(queueEntries.map((q) => q.doctor_id))];

      const [aptsRes, docsRes] = await Promise.all([
        supabase
          .from("appointments")
          .select(
            "id, reason, patient_id, patient_profile:user_profiles!appointments_patient_id_fkey(display_name, phone)"
          )
          .in("id", appointmentIds),
        supabase
          .from("doctor_profiles")
          .select("user_id, full_name, specialty")
          .in("user_id", doctorIds),
      ]);

      const aptMap = new Map(aptsRes.data?.map((a) => [a.id, a]) || []);
      const docMap = new Map(docsRes.data?.map((d) => [d.user_id, d]) || []);

      return queueEntries
        .map((q) => {
          const apt = aptMap.get(q.appointment_id) as any;
          const doc = docMap.get(q.doctor_id);
          return {
            id: q.id,
            appointment_id: q.appointment_id,
            patient_id: q.patient_id,
            doctor_id: q.doctor_id,
            priority: (q.priority || "normal") as TriageEntry["priority"],
            status: q.status as TriageEntry["status"],
            checked_in_at: q.checked_in_at,
            called_at: q.called_at,
            completed_at: q.completed_at,
            queue_position: q.queue_position,
            patient_name: apt?.patient_profile?.display_name || "Unknown",
            patient_phone: apt?.patient_profile?.phone || null,
            doctor_name: doc?.full_name || "Unassigned",
            doctor_specialty: doc?.specialty || null,
            reason: apt?.reason || null,
          };
        })
        .sort((a, b) => {
          const pOrder = { emergency: 0, urgent: 1, normal: 2 };
          const pDiff = pOrder[a.priority] - pOrder[b.priority];
          if (pDiff !== 0) return pDiff;
          return new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime();
        });
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!hospitalId) return;
    const channel = supabase
      .channel(`triage-board-${hospitalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_queue", filter: `hospital_id=eq.${hospitalId}` },
        () => queryClient.invalidateQueries({ queryKey: ["triage-board", hospitalId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hospitalId, queryClient]);

  const escalate = useMutation({
    mutationFn: async ({ entryId, newPriority }: { entryId: string; newPriority: string }) => {
      const { error } = await supabase
        .from("patient_queue")
        .update({ priority: newPriority })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triage-board", hospitalId] });
      toast({ title: "Priority updated" });
    },
  });

  const callPatient = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("patient_queue")
        .update({ status: "in_consultation", called_at: new Date().toISOString() })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triage-board", hospitalId] });
      toast({ title: "Patient called in" });
    },
  });

  return { ...query, escalate, callPatient };
}

function TriagePatientCard({
  entry,
  onEscalate,
  onCall,
}: {
  entry: TriageEntry;
  onEscalate: (id: string, priority: string) => void;
  onCall: (id: string) => void;
}) {
  const config = TRIAGE_CONFIG[entry.priority];
  const Icon = config.icon;
  const waitTime = formatDistanceToNow(new Date(entry.checked_in_at), { addSuffix: false });
  const isInConsult = entry.status === "in_consultation";

  return (
    <Card className={cn("border-2 transition-all", config.bgColor, isInConsult && "ring-2 ring-primary")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("w-3 h-3 rounded-full flex-shrink-0 animate-pulse", config.color)} />
            <h4 className="font-semibold text-foreground truncate">{entry.patient_name}</h4>
          </div>
          <Badge className={cn("flex-shrink-0 text-[10px]", config.badgeClass)}>
            <Icon className="h-3 w-3 mr-1" />
            {entry.priority.charAt(0).toUpperCase() + entry.priority.slice(1)}
          </Badge>
        </div>

        {entry.reason && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            Chief complaint: {entry.reason}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {waitTime}
          </span>
          <span className="flex items-center gap-1">
            <UserCheck className="h-3 w-3" />
            {entry.doctor_name}
          </span>
          {entry.patient_phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {entry.patient_phone}
            </span>
          )}
        </div>

        {isInConsult && (
          <Badge variant="outline" className="text-xs border-primary text-primary">
            In Consultation
          </Badge>
        )}

        {!isInConsult && (
          <div className="flex items-center gap-2 pt-1">
            {entry.priority !== "emergency" && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                onClick={() => onEscalate(entry.id, entry.priority === "normal" ? "urgent" : "emergency")}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Escalate
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs ml-auto"
              onClick={() => onCall(entry.id)}
            >
              Call In
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TriageLane({ title, entries, config, onEscalate, onCall }: {
  title: string;
  entries: TriageEntry[];
  config: typeof TRIAGE_CONFIG[keyof typeof TRIAGE_CONFIG];
  onEscalate: (id: string, priority: string) => void;
  onCall: (id: string) => void;
}) {
  const Icon = config.icon;
  return (
    <div className="flex-1 min-w-[280px]">
      <div className={cn("flex items-center gap-2 mb-3 px-1", config.textColor)}>
        <Icon className="h-5 w-5" />
        <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
        <Badge variant="outline" className="ml-auto text-xs">{entries.length}</Badge>
      </div>
      <div className="space-y-3">
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-lg">
            No patients
          </p>
        )}
        {entries.map((e) => (
          <TriagePatientCard key={e.id} entry={e} onEscalate={onEscalate} onCall={onCall} />
        ))}
      </div>
    </div>
  );
}

export default function EmergencyTriageBoardPage() {
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const context = useOutletContext<{ hospital: Hospital }>();
  const { data, isLoading, refetch, escalate, callPatient } = useTriageBoard(hospitalId);

  const emergency = (data || []).filter((e) => e.priority === "emergency");
  const urgent = (data || []).filter((e) => e.priority === "urgent");
  const normal = (data || []).filter((e) => e.priority === "normal");

  const totalWaiting = (data || []).filter((e) => e.status === "waiting").length;
  const totalInConsult = (data || []).filter((e) => e.status === "in_consultation").length;

  const handleEscalate = (id: string, priority: string) => escalate.mutate({ entryId: id, newPriority: priority });
  const handleCall = (id: string) => callPatient.mutate(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Siren className="h-6 w-6 text-red-500" />
            Emergency Triage Board
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time patient triage overview — auto-refreshes every 10s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              {totalWaiting} waiting
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              {totalInConsult} in consult
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TriageLane
            title={TRIAGE_CONFIG.emergency.label}
            entries={emergency}
            config={TRIAGE_CONFIG.emergency}
            onEscalate={handleEscalate}
            onCall={handleCall}
          />
          <TriageLane
            title={TRIAGE_CONFIG.urgent.label}
            entries={urgent}
            config={TRIAGE_CONFIG.urgent}
            onEscalate={handleEscalate}
            onCall={handleCall}
          />
          <TriageLane
            title={TRIAGE_CONFIG.normal.label}
            entries={normal}
            config={TRIAGE_CONFIG.normal}
            onEscalate={handleEscalate}
            onCall={handleCall}
          />
        </div>
      )}

      {!isLoading && (data || []).length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-foreground">No patients in queue</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Patients will appear here once they check in for their appointments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
