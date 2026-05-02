import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

export interface QueueEntry {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string | null;
  queue_position: number;
  status: "waiting" | "in_consultation" | "completed" | "skipped";
  checked_in_at: string;
  called_at: string | null;
  completed_at: string | null;
  priority: "normal" | "urgent" | "emergency";
  created_at: string;
  // joined
  patient_name?: string;
  appointment_time?: string;
  appointment_reason?: string;
}

export function usePatientQueue(doctorIdOverride?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const doctorId = doctorIdOverride || user?.id;

  const query = useQuery({
    queryKey: ["patient-queue", doctorId],
    queryFn: async () => {
      // Fetch queue entries with appointment + patient info
      const { data, error } = await supabase
        .from("patient_queue")
        .select("id, appointment_id, patient_id, doctor_id, hospital_id, queue_position, status, checked_in_at, called_at, completed_at, priority, created_at")
        .eq("doctor_id", doctorId!)
        .in("status", ["waiting", "in_consultation"])
        .order("priority", { ascending: true })
        .order("checked_in_at", { ascending: true });

      if (error) throw error;

      // Fetch related appointment + patient data
      if (!data || data.length === 0) return [] as QueueEntry[];

      const appointmentIds = data.map((q) => q.appointment_id);
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, start_time, reason, patient_id, patient_profile:user_profiles!appointments_patient_id_fkey(display_name)")
        .in("id", appointmentIds);

      const aptMap = new Map(appointments?.map((a) => [a.id, a]) || []);

      return data.map((q) => {
        const apt = aptMap.get(q.appointment_id) as any;
        return {
          ...q,
          patient_name: apt?.patient_profile?.display_name || "Unknown",
          appointment_time: apt?.start_time || "",
          appointment_reason: apt?.reason || "",
        } as QueueEntry;
      }).sort((a, b) => {
        // Priority sort: emergency > urgent > normal
        const priorityOrder = { emergency: 0, urgent: 1, normal: 2 };
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        // Then by check-in time
        return new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime();
      });
    },
    enabled: !!doctorId,
    refetchInterval: 30000, // fallback polling every 30s
  });

  // Real-time subscription
  useEffect(() => {
    if (!doctorId) return;

    const channel = supabase
      .channel(`patient-queue-realtime-${doctorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "patient_queue",
          filter: `doctor_id=eq.${doctorId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["patient-queue", doctorId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, queryClient]);

  const callNext = useMutation({
    mutationFn: async (entryId: string) => {
      // First, complete any currently in_consultation
      await supabase
        .from("patient_queue")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("doctor_id", doctorId!)
        .eq("status", "in_consultation");

      // Then call the next one
      const { error } = await supabase
        .from("patient_queue")
        .update({ status: "in_consultation", called_at: new Date().toISOString() })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-queue"] });
      toast({ title: "Patient called in" });
    },
  });

  const skipPatient = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("patient_queue")
        .update({ status: "skipped", completed_at: new Date().toISOString() })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-queue"] });
    },
  });

  const completePatient = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("patient_queue")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-queue"] });
    },
  });

  const addToQueue = useMutation({
    mutationFn: async (params: {
      appointment_id: string;
      patient_id: string;
      hospital_id?: string | null;
      priority?: "normal" | "urgent" | "emergency";
    }) => {
      const waitingCount = (query.data || []).filter((q) => q.status === "waiting").length;
      const { error } = await supabase
        .from("patient_queue")
        .insert({
          appointment_id: params.appointment_id,
          patient_id: params.patient_id,
          doctor_id: doctorId!,
          hospital_id: params.hospital_id || null,
          queue_position: waitingCount + 1,
          priority: params.priority || "normal",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-queue"] });
      toast({ title: "Patient added to queue" });
    },
    onError: (error) => {
      if (error.message.includes("duplicate")) {
        toast({ title: "Patient already in queue", variant: "destructive" });
      } else {
        toast({ title: "Failed to add to queue", description: error.message, variant: "destructive" });
      }
    },
  });

  const waiting = (query.data || []).filter((q) => q.status === "waiting");
  const inConsultation = (query.data || []).find((q) => q.status === "in_consultation");

  return {
    queue: query.data || [],
    waiting,
    inConsultation,
    isLoading: query.isLoading,
    callNext,
    skipPatient,
    completePatient,
    addToQueue,
  };
}
