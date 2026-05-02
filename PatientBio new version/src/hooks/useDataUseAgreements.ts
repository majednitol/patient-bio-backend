import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface DataUseAgreement {
  id: string;
  study_id: string;
  researcher_id: string;
  institution_name: string;
  purpose: string;
  data_scope: Record<string, any>;
  retention_period_days: number;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  expiry_date: string | null;
  agreement_hash: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  study_title?: string;
}

// Simple SHA-256 hash for agreement tamper detection
async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const useDataUseAgreements = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ["data-use-agreements", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("data_use_agreements")
        .select("*")
        .eq("researcher_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Enrich with study titles
      const studyIds = (data || []).map((d: any) => d.study_id);
      if (studyIds.length === 0) return data || [];
      const { data: studies } = await supabase
        .from("researcher_studies")
        .select("id, title")
        .in("id", studyIds);
      const studyMap = new Map((studies || []).map((s: any) => [s.id, s.title]));

      return (data || []).map((d: any) => ({
        ...d,
        study_title: studyMap.get(d.study_id) || "Unknown Study",
      }));
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  const createAgreement = useMutation({
    mutationFn: async (input: {
      study_id: string;
      institution_name: string;
      purpose: string;
      data_scope: Record<string, any>;
      retention_period_days: number;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const hashInput = `${user.id}|${input.study_id}|${input.purpose}|${JSON.stringify(input.data_scope)}|${new Date().toISOString()}`;
      const hash = await computeHash(hashInput);

      const { data, error } = await supabase
        .from("data_use_agreements")
        .insert({
          study_id: input.study_id,
          researcher_id: user.id,
          institution_name: input.institution_name,
          purpose: input.purpose,
          data_scope: input.data_scope,
          retention_period_days: input.retention_period_days,
          agreement_hash: hash,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "DUA Created", description: "Data Use Agreement has been created as a draft." });
      queryClient.invalidateQueries({ queryKey: ["data-use-agreements"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create agreement.", variant: "destructive" });
    },
  });

  const submitAgreement = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("data_use_agreements")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", agreementId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "DUA Submitted", description: "Your agreement has been submitted for review." });
      queryClient.invalidateQueries({ queryKey: ["data-use-agreements"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit agreement.", variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "approved") {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = user?.id;
      }
      const { error } = await supabase
        .from("data_use_agreements")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status Updated" });
      queryClient.invalidateQueries({ queryKey: ["data-use-agreements"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const renewAgreement = useMutation({
    mutationFn: async (originalDua: DataUseAgreement) => {
      if (!user?.id) throw new Error("Not authenticated");

      const hashInput = `${user.id}|${originalDua.study_id}|${originalDua.purpose}|${JSON.stringify(originalDua.data_scope)}|${new Date().toISOString()}`;
      const hash = await computeHash(hashInput);

      const { data, error } = await supabase
        .from("data_use_agreements")
        .insert({
          study_id: originalDua.study_id,
          researcher_id: user.id,
          institution_name: originalDua.institution_name,
          purpose: originalDua.purpose,
          data_scope: originalDua.data_scope,
          retention_period_days: originalDua.retention_period_days,
          agreement_hash: hash,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "DUA Renewed", description: "A new agreement has been created with the same terms." });
      queryClient.invalidateQueries({ queryKey: ["data-use-agreements"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to renew agreement.", variant: "destructive" });
    },
  });

  const now = new Date();
  const getEffectiveExpiry = (a: DataUseAgreement) => {
    if (a.expiry_date) return new Date(a.expiry_date);
    return new Date(new Date(a.created_at).getTime() + a.retention_period_days * 24 * 60 * 60 * 1000);
  };

  const expiringWithin = (days: number) =>
    agreements.filter((a) => {
      if (a.status === "expired") return false;
      const expiry = getEffectiveExpiry(a);
      const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= days;
    });

  const stats = {
    total: agreements.length,
    draft: agreements.filter((a) => a.status === "draft").length,
    submitted: agreements.filter((a) => a.status === "submitted").length,
    approved: agreements.filter((a) => a.status === "approved").length,
    expired: agreements.filter((a) => a.status === "expired" || (a.expiry_date && new Date(a.expiry_date) < new Date())).length,
    expiring30: expiringWithin(30).length,
    expiring60: expiringWithin(60).length,
    expiring90: expiringWithin(90).length,
  };

  return {
    agreements,
    isLoading,
    stats,
    createAgreement: createAgreement.mutateAsync,
    submitAgreement: submitAgreement.mutate,
    updateStatus: updateStatus.mutate,
    renewAgreement: renewAgreement.mutateAsync,
    isCreating: createAgreement.isPending,
    isRenewing: renewAgreement.isPending,
    getEffectiveExpiry,
    expiringWithin,
  };
};
