import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

// ─── Background Info (single row upsert) ───
export function useBackgroundInfo() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["clinical-background", user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_background_info")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = { ...values, user_id: user!.id };
      const { data, error } = await supabase
        .from("patient_background_info")
        .upsert(payload as any, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast({ title: "Background saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { ...query, save: mutation.mutateAsync, saving: mutation.isPending };
}

// ─── Comorbidities (single row upsert) ───
export function useComorbidities() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["clinical-comorbidities", user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_comorbidities")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = { ...values, user_id: user!.id };
      const { data, error } = await supabase
        .from("patient_comorbidities")
        .upsert(payload as any, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast({ title: "Comorbidities saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { ...query, save: mutation.mutateAsync, saving: mutation.isPending };
}

// ─── Clinical Investigations (multi-row CRUD with update) ───
export function useClinicalInvestigations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["clinical-investigations", user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_clinical_investigations")
        .select("*")
        .eq("user_id", user!.id)
        .order("investigation_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = { ...values, user_id: user!.id };
      const { data, error } = await supabase
        .from("patient_clinical_investigations")
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast({ title: "Investigation added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...values }: Record<string, unknown> & { id: string }) => {
      const { data, error } = await supabase
        .from("patient_clinical_investigations")
        .update(values as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast({ title: "Investigation updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patient_clinical_investigations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast({ title: "Investigation removed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { ...query, add: add.mutateAsync, update: update.mutateAsync, remove: remove.mutateAsync, adding: add.isPending };
}

// ─── Treatments (multi-row CRUD with update) ───
export function useTreatments() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["clinical-treatments", user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_running_treatments")
        .select("*")
        .eq("user_id", user!.id)
        .order("treatment_start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = { ...values, user_id: user!.id };
      const { data, error } = await supabase
        .from("patient_running_treatments")
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast({ title: "Treatment added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...values }: Record<string, unknown> & { id: string }) => {
      const { data, error } = await supabase
        .from("patient_running_treatments")
        .update(values as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast({ title: "Treatment updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patient_running_treatments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast({ title: "Treatment removed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { ...query, add: add.mutateAsync, update: update.mutateAsync, remove: remove.mutateAsync, adding: add.isPending };
}

// ─── Care Team (multi-row CRUD) ───
export function useCareTeam() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["clinical-care-team", user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_care_team")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = { ...values, user_id: user!.id };
      const { data, error } = await supabase
        .from("patient_care_team")
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast({ title: "Physician added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...values }: Record<string, unknown> & { id: string }) => {
      const { data, error } = await supabase
        .from("patient_care_team")
        .update(values as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast({ title: "Physician updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patient_care_team").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast({ title: "Physician removed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { ...query, add: add.mutateAsync, update: update.mutateAsync, remove: remove.mutateAsync, adding: add.isPending };
}

// ─── Complications Status (single row upsert) ───
export function useComplicationsStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["clinical-complications", user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_complications_status")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = { ...values, user_id: user!.id };
      const { data, error } = await supabase
        .from("patient_complications_status")
        .upsert(payload as any, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast({ title: "Complications status saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { ...query, save: mutation.mutateAsync, saving: mutation.isPending };
}
