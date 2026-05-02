import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useMemo } from "react";

export function useFavoriteDoctors() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteRows = [], isLoading } = useQuery({
    queryKey: ["favorite-doctors", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("patient_favorite_doctors")
        .select("doctor_id")
        .eq("patient_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const favoriteIds = useMemo(
    () => new Set(favoriteRows.map((r) => r.doctor_id)),
    [favoriteRows]
  );

  const isFavorite = useCallback(
    (doctorId: string) => favoriteIds.has(doctorId),
    [favoriteIds]
  );

  const toggleMutation = useMutation({
    mutationFn: async (doctorId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const exists = favoriteIds.has(doctorId);
      if (exists) {
        const { error } = await supabase
          .from("patient_favorite_doctors")
          .delete()
          .eq("patient_id", user.id)
          .eq("doctor_id", doctorId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("patient_favorite_doctors")
          .insert({ patient_id: user.id, doctor_id: doctorId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-doctors", user?.id] });
    },
  });

  const toggleFavorite = useCallback(
    (doctorId: string) => toggleMutation.mutate(doctorId),
    [toggleMutation]
  );

  return { favoriteIds, isFavorite, toggleFavorite, isLoading };
}
