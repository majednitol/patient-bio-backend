import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface StudyProtocolTemplate {
  id: string;
  name: string;
  study_type: string;
  description: string | null;
  icon_name: string | null;
  default_disease_categories: string[];
  default_cohort_filters: Record<string, unknown>;
  default_milestones: MilestoneTemplate[];
  default_consent_scopes: string[];
  estimated_duration_days: number | null;
  min_sample_size: number | null;
}

export interface MilestoneTemplate {
  name: string;
  description: string;
  order: number;
  estimated_days: number;
}

export interface ResearcherStudy {
  id: string;
  researcher_id: string;
  template_id: string | null;
  title: string;
  study_type: string;
  description: string | null;
  status: string;
  disease_categories: string[];
  cohort_filters: Record<string, unknown>;
  consent_scopes: string[];
  target_sample_size: number | null;
  current_sample_size: number;
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudyMilestone {
  id: string;
  study_id: string;
  name: string;
  description: string | null;
  milestone_order: number;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useResearcherStudies = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["study-protocol-templates"],
    queryFn: async (): Promise<StudyProtocolTemplate[]> => {
      const { data, error } = await supabase
        .from("study_protocol_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) {
        console.error("Error fetching templates:", error);
        return [];
      }
      return (data || []).map((t: Record<string, unknown>) => ({
        ...t,
        default_milestones: (t.default_milestones as MilestoneTemplate[]) || [],
        default_disease_categories: (t.default_disease_categories as string[]) || [],
        default_consent_scopes: (t.default_consent_scopes as string[]) || [],
        default_cohort_filters: (t.default_cohort_filters as Record<string, unknown>) || {},
      })) as StudyProtocolTemplate[];
    },
    staleTime: STALE_TIMES.REFERENCE,
  });

  // Fetch researcher's studies
  const { data: studies = [], isLoading: loadingStudies, refetch } = useQuery({
    queryKey: ["researcher-studies", user?.id],
    queryFn: async (): Promise<ResearcherStudy[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("researcher_studies")
        .select("*")
        .eq("researcher_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching studies:", error);
        return [];
      }
      return (data || []) as ResearcherStudy[];
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  // Create study from template
  const createStudy = useMutation({
    mutationFn: async (params: {
      template_id?: string;
      title: string;
      study_type: string;
      description?: string;
      disease_categories?: string[];
      target_sample_size?: number;
      consent_scopes?: string[];
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Calculate dates from template
      const template = templates.find((t) => t.id === params.template_id);
      const startDate = new Date();
      const expectedEndDate = template?.estimated_duration_days
        ? new Date(startDate.getTime() + template.estimated_duration_days * 86400000)
        : undefined;

      const { data: study, error } = await supabase
        .from("researcher_studies")
        .insert({
          researcher_id: user.id,
          template_id: params.template_id || null,
          title: params.title,
          study_type: params.study_type,
          description: params.description || null,
          disease_categories: params.disease_categories || [],
          consent_scopes: params.consent_scopes || [],
          target_sample_size: params.target_sample_size || template?.min_sample_size || null,
          start_date: startDate.toISOString().split("T")[0],
          expected_end_date: expectedEndDate?.toISOString().split("T")[0] || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create milestones from template
      if (template?.default_milestones?.length) {
        let cumulativeDays = 0;
        const milestones = template.default_milestones
          .sort((a, b) => a.order - b.order)
          .map((m) => {
            cumulativeDays += m.estimated_days;
            const dueDate = new Date(startDate.getTime() + cumulativeDays * 86400000);
            return {
              study_id: study.id,
              name: m.name,
              description: m.description,
              milestone_order: m.order,
              due_date: dueDate.toISOString().split("T")[0],
            };
          });

        const { error: mError } = await supabase
          .from("researcher_study_milestones")
          .insert(milestones);
        if (mError) console.error("Error creating milestones:", mError);
      }

      return study;
    },
    onSuccess: () => {
      toast({ title: "Study Created", description: "Your study has been set up with milestones." });
      queryClient.invalidateQueries({ queryKey: ["researcher-studies", user?.id] });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to create study.", variant: "destructive" });
      console.error("Error creating study:", error);
    },
  });

  // Update study
  const updateStudy = useMutation({
    mutationFn: async ({ studyId, updates }: { studyId: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("researcher_studies")
        .update(updates)
        .eq("id", studyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Study Updated" });
      queryClient.invalidateQueries({ queryKey: ["researcher-studies", user?.id] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update study.", variant: "destructive" });
    },
  });

  // Delete study
  const deleteStudy = useMutation({
    mutationFn: async (studyId: string) => {
      const { error } = await supabase.from("researcher_studies").delete().eq("id", studyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Study Deleted" });
      queryClient.invalidateQueries({ queryKey: ["researcher-studies", user?.id] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete study.", variant: "destructive" });
    },
  });

  return {
    templates,
    studies,
    isLoading: loadingTemplates || loadingStudies,
    loadingTemplates,
    refetch,
    createStudy: createStudy.mutateAsync,
    updateStudy: updateStudy.mutate,
    deleteStudy: deleteStudy.mutate,
    isCreating: createStudy.isPending,
  };
};

// Separate hook for milestones (per-study)
export const useStudyMilestones = (studyId: string | null) => {
  const queryClient = useQueryClient();

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ["study-milestones", studyId],
    queryFn: async (): Promise<StudyMilestone[]> => {
      if (!studyId) return [];
      const { data, error } = await supabase
        .from("researcher_study_milestones")
        .select("*")
        .eq("study_id", studyId)
        .order("milestone_order", { ascending: true });
      if (error) {
        console.error("Error fetching milestones:", error);
        return [];
      }
      return (data || []) as StudyMilestone[];
    },
    enabled: !!studyId,
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ milestoneId, updates }: { milestoneId: string; updates: Partial<StudyMilestone> }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.status === "completed" && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("researcher_study_milestones")
        .update(updateData)
        .eq("id", milestoneId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-milestones", studyId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update milestone.", variant: "destructive" });
    },
  });

  const addMilestone = useMutation({
    mutationFn: async (params: { name: string; description?: string; due_date?: string }) => {
      if (!studyId) throw new Error("No study selected");
      const nextOrder = milestones.length > 0 ? Math.max(...milestones.map((m) => m.milestone_order)) + 1 : 1;
      const { error } = await supabase
        .from("researcher_study_milestones")
        .insert({
          study_id: studyId,
          name: params.name,
          description: params.description || null,
          due_date: params.due_date || null,
          milestone_order: nextOrder,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Milestone Added" });
      queryClient.invalidateQueries({ queryKey: ["study-milestones", studyId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add milestone.", variant: "destructive" });
    },
  });

  const deleteMilestone = useMutation({
    mutationFn: async (milestoneId: string) => {
      const { error } = await supabase
        .from("researcher_study_milestones")
        .delete()
        .eq("id", milestoneId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Milestone Removed" });
      queryClient.invalidateQueries({ queryKey: ["study-milestones", studyId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete milestone.", variant: "destructive" });
    },
  });

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  return {
    milestones,
    isLoading,
    updateMilestone: updateMilestone.mutate,
    addMilestone: addMilestone.mutate,
    deleteMilestone: deleteMilestone.mutate,
    isUpdating: updateMilestone.isPending,
    isAdding: addMilestone.isPending,
    completedCount,
    totalCount: milestones.length,
    progress,
  };
};

// Cross-study milestones for KPI stats
export const useAllStudyMilestones = (studyIds: string[]) => {
  return useQuery({
    queryKey: ["all-study-milestones", studyIds],
    queryFn: async (): Promise<StudyMilestone[]> => {
      if (studyIds.length === 0) return [];
      const { data, error } = await supabase
        .from("researcher_study_milestones")
        .select("*")
        .in("study_id", studyIds)
        .order("due_date", { ascending: true });
      if (error) return [];
      return (data || []) as StudyMilestone[];
    },
    enabled: studyIds.length > 0,
    staleTime: STALE_TIMES.STANDARD,
  });
};
