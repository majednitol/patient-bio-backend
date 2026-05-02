import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface TemplateStructure {
  report_type: string;
  disease_category: string;
  findings_template: string;
  icon: string;
  normal_ranges?: Array<{
    parameter: string;
    low: number;
    high: number;
    unit: string;
  }>;
}

export interface SavedReportTemplate {
  id: string;
  pathologist_id: string;
  name: string;
  category: string | null;
  test_type: string | null;
  template_structure: TemplateStructure;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useReportTemplateLibrary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const templates = useQuery({
    queryKey: ["pathologist-report-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pathologist_report_templates")
        .select("id, pathologist_id, name, category, test_type, template_structure, is_active, created_at, updated_at")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []).map((t) => ({
        ...t,
        template_structure: t.template_structure as unknown as TemplateStructure,
      })) as SavedReportTemplate[];
    },
    enabled: !!user,
  });

  const createTemplate = useMutation({
    mutationFn: async (input: {
      name: string;
      category?: string;
      test_type?: string;
      template_structure: TemplateStructure;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("pathologist_report_templates")
        .insert({
          pathologist_id: user.id,
          name: input.name,
          category: input.category || null,
          test_type: input.test_type || null,
          template_structure: input.template_structure as unknown as Json,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pathologist-report-templates"] });
      toast({ title: "Template saved", description: "Your custom template has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error saving template", description: err.message, variant: "destructive" });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pathologist_report_templates")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pathologist-report-templates"] });
      toast({ title: "Template removed" });
    },
  });

  return {
    savedTemplates: templates.data || [],
    isLoading: templates.isLoading,
    createTemplate,
    deleteTemplate,
  };
}
