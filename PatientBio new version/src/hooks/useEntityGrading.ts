import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface GradableEntity {
  id: string;
  name: string;
  entityType: "doctor" | "pathologist" | "hospital";
  grade: string | null;
  isVerified?: boolean;
  specialty?: string | null;
}

export interface GradingHistoryEntry {
  id: string;
  grade: string;
  previous_grade: string | null;
  reason: string;
  created_at: string;
}

export function useEntityGrading(entityTypeFilter: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const entitiesQuery = useQuery({
    queryKey: ["entity-grading", entityTypeFilter],
    queryFn: async () => {
      const entities: GradableEntity[] = [];

      if (entityTypeFilter === "all" || entityTypeFilter === "doctor") {
        const { data } = await supabase
          .from("doctor_profiles")
          .select("user_id, full_name, specialty, is_verified, lab_grade");
        data?.forEach((d: any) =>
          entities.push({
            id: d.user_id,
            name: d.full_name || "Unknown Doctor",
            entityType: "doctor",
            grade: d.lab_grade,
            isVerified: d.is_verified,
            specialty: d.specialty,
          })
        );
      }

      if (entityTypeFilter === "all" || entityTypeFilter === "pathologist") {
        const { data } = await supabase
          .from("pathologist_profiles")
          .select("user_id, full_name, lab_name, is_verified, lab_grade");
        data?.forEach((p: any) =>
          entities.push({
            id: p.user_id,
            name: p.lab_name || p.full_name || "Unknown Lab",
            entityType: "pathologist",
            grade: p.lab_grade,
            isVerified: p.is_verified,
            specialty: null,
          })
        );
      }

      if (entityTypeFilter === "all" || entityTypeFilter === "hospital") {
        const { data } = await supabase
          .from("hospitals")
          .select("id, name, lab_grade");
        data?.forEach((h: any) =>
          entities.push({
            id: h.id,
            name: h.name || "Unknown Hospital",
            entityType: "hospital",
            grade: h.lab_grade,
            isVerified: undefined,
            specialty: null,
          })
        );
      }

      return entities;
    },
  });

  const assignGradeMutation = useMutation({
    mutationFn: async ({
      entity,
      grade,
      reason,
    }: {
      entity: GradableEntity;
      grade: string;
      reason: string;
    }) => {
      // Update the profile table
      const table =
        entity.entityType === "doctor"
          ? "doctor_profiles"
          : entity.entityType === "pathologist"
          ? "pathologist_profiles"
          : "hospitals";

      const idColumn =
        entity.entityType === "hospital" ? "id" : "user_id";

      const { error: updateError } = await (supabase as any)
        .from(table)
        .update({ lab_grade: grade })
        .eq(idColumn, entity.id);

      if (updateError) throw updateError;

      // Insert audit record
      const { error: auditError } = await (supabase as any)
        .from("entity_gradings")
        .insert({
          entity_type: entity.entityType,
          entity_id: entity.id,
          grade,
          previous_grade: entity.grade,
          reason,
          graded_by: user?.id,
        });

      if (auditError) throw auditError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-grading"] });
      toast({ title: "Grade assigned", description: "Entity grade updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    entities: entitiesQuery.data || [],
    isLoading: entitiesQuery.isLoading,
    assignGrade: assignGradeMutation.mutate,
    isAssigning: assignGradeMutation.isPending,
  };
}
