import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STALE_TIMES } from "@/lib/queryConfig";

export interface FollowUpTask {
  id: string;
  patient_id: string;
  appointment_id: string;
  task_type: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useFollowUpReminders = (appointmentId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = appointmentId
    ? ["follow-up-tasks", user?.id, appointmentId]
    : ["follow-up-tasks", user?.id];

  const { data: tasks = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<FollowUpTask[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from("follow_up_tasks")
        .select("*")
        .eq("patient_id", user.id)
        .order("is_completed", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (appointmentId) {
        query = query.eq("appointment_id", appointmentId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data ?? []) as FollowUpTask[];
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  const toggleTask = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from("follow_up_tasks")
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", taskId);
      if (error) throw error;
    },
    onMutate: async ({ taskId, completed }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<FollowUpTask[]>(queryKey);
      queryClient.setQueryData<FollowUpTask[]>(queryKey, (old = []) =>
        old.map((t) =>
          t.id === taskId
            ? { ...t, is_completed: completed, completed_at: completed ? new Date().toISOString() : null }
            : t
        )
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
  });

  const addTask = useMutation({
    mutationFn: async (task: {
      appointment_id: string;
      title: string;
      description?: string;
      task_type?: string;
      due_date?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("follow_up_tasks").insert({
        patient_id: user.id,
        appointment_id: task.appointment_id,
        title: task.title,
        description: task.description ?? null,
        task_type: task.task_type ?? "general",
        due_date: task.due_date ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("follow_up_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<FollowUpTask[]>(queryKey);
      queryClient.setQueryData<FollowUpTask[]>(queryKey, (old = []) =>
        old.filter((t) => t.id !== taskId)
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
  });

  const pendingCount = tasks.filter((t) => !t.is_completed).length;
  const completedCount = tasks.filter((t) => t.is_completed).length;

  return {
    tasks,
    isLoading,
    pendingCount,
    completedCount,
    toggleTask: toggleTask.mutate,
    addTask: addTask.mutateAsync,
    deleteTask: deleteTask.mutate,
  };
};
