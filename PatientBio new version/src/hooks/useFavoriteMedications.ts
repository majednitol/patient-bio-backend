import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FavoriteMedication {
  id: string;
  medication_name: string;
  default_dosage: string | null;
  default_frequency: string | null;
  default_duration: string | null;
  default_instructions: string | null;
  usage_count: number;
  is_pinned: boolean;
}

export function useFavoriteMedications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["favorite-medications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_favorite_medications")
        .select("id, medication_name, default_dosage, default_frequency, default_duration, default_instructions, usage_count, is_pinned")
        .eq("doctor_id", user!.id)
        .order("is_pinned", { ascending: false })
        .order("usage_count", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data as FavoriteMedication[];
    },
    enabled: !!user,
  });

  const trackUsage = useMutation({
    mutationFn: async (med: { name: string; dosage?: string; frequency?: string; duration?: string; instructions?: string }) => {
      const { data: existing } = await supabase
        .from("doctor_favorite_medications")
        .select("id, usage_count")
        .eq("doctor_id", user!.id)
        .eq("medication_name", med.name)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("doctor_favorite_medications")
          .update({
            usage_count: existing.usage_count + 1,
            default_dosage: med.dosage || undefined,
            default_frequency: med.frequency || undefined,
            default_duration: med.duration || undefined,
            default_instructions: med.instructions || undefined,
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("doctor_favorite_medications")
          .insert({
            doctor_id: user!.id,
            medication_name: med.name,
            default_dosage: med.dosage,
            default_frequency: med.frequency,
            default_duration: med.duration,
            default_instructions: med.instructions,
            usage_count: 1,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-medications"] });
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from("doctor_favorite_medications")
        .update({ is_pinned })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-medications"] });
    },
  });

  return { favorites: query.data || [], isLoading: query.isLoading, trackUsage, togglePin };
}
