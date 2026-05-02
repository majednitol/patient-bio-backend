import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface MedicationReminder {
  id: string;
  user_id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string;
  reminder_times: string[];
  days_of_week: number[];
  is_active: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicationReminderData {
  medication_name: string;
  dosage?: string;
  frequency: string;
  reminder_times: string[];
  days_of_week?: number[];
  notes?: string;
}

export const FREQUENCY_OPTIONS = [
  { value: "once_daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "three_times_daily", label: "Three times daily" },
  { value: "every_other_day", label: "Every other day" },
  { value: "weekly", label: "Weekly" },
  { value: "as_needed", label: "As needed" },
];

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export const useMedicationReminders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all medication reminders
  const { data: reminders, isLoading } = useQuery({
    queryKey: ["medication-reminders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("medication_reminders")
        .select("id, user_id, medication_name, dosage, frequency, reminder_times, days_of_week, is_active, notes, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MedicationReminder[];
    },
    enabled: !!user?.id,
  });

  // Create medication reminder
  const createReminder = useMutation({
    mutationFn: async (data: CreateMedicationReminderData) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from("medication_reminders")
        .insert({
          user_id: user.id,
          medication_name: data.medication_name,
          dosage: data.dosage || null,
          frequency: data.frequency,
          reminder_times: data.reminder_times,
          days_of_week: data.days_of_week || [0, 1, 2, 3, 4, 5, 6],
          notes: data.notes || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-reminders"] });
      toast.success("Medication reminder created");
    },
    onError: (error) => {
      toast.error("Failed to create reminder: " + error.message);
    },
  });

  // Update medication reminder
  const updateReminder = useMutation({
    mutationFn: async ({ id, ...data }: Partial<MedicationReminder> & { id: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from("medication_reminders")
        .update(data)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-reminders"] });
      toast.success("Medication reminder updated");
    },
    onError: (error) => {
      toast.error("Failed to update reminder: " + error.message);
    },
  });

  // Toggle reminder active state
  const toggleReminder = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("medication_reminders")
        .update({ is_active })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["medication-reminders"] });
      toast.success(variables.is_active ? "Reminder enabled" : "Reminder paused");
    },
    onError: (error) => {
      toast.error("Failed to toggle reminder: " + error.message);
    },
  });

  // Delete medication reminder
  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("medication_reminders")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-reminders"] });
      toast.success("Medication reminder deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete reminder: " + error.message);
    },
  });

  // Get next reminder time
  const getNextReminderTime = (reminder: MedicationReminder): Date | null => {
    if (!reminder.is_active || !reminder.reminder_times.length) return null;

    const now = new Date();
    const today = now.getDay();
    
    // Find the next day with a reminder
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const checkDay = (today + dayOffset) % 7;
      if (!reminder.days_of_week.includes(checkDay)) continue;

      for (const timeStr of reminder.reminder_times) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const reminderDate = new Date(now);
        reminderDate.setDate(reminderDate.getDate() + dayOffset);
        reminderDate.setHours(hours, minutes, 0, 0);

        if (reminderDate > now) {
          return reminderDate;
        }
      }
    }

    return null;
  };

  return {
    reminders: reminders || [],
    isLoading,
    createReminder,
    updateReminder,
    toggleReminder,
    deleteReminder,
    getNextReminderTime,
  };
};
