import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { addMonths } from "date-fns";

interface AnonymousContribution {
  id: string;
  patient_id: string;
  contribution_hash: string;
  anonymized_data: Record<string, unknown>;
  data_categories: string[];
  disease_categories: string[];
  age_range: string | null;
  gender: string | null;
  source_jurisdiction: string;
  requires_govt_approval: boolean;
  govt_approval_status: string;
  govt_reference_number: string | null;
  is_active: boolean;
  contributed_at: string;
  expires_at: string | null;
  auto_renew: boolean;
  updated_at: string;
  quality_score: number | null;
}

export interface ContributionWithBlockchain extends AnonymousContribution {
  blockchainHash?: string | null;
  blockchainTimestamp?: string | null;
  freshness?: "fresh" | "aging" | "stale";
}

export interface NewRecordsInfo {
  hasNew: boolean;
  lastDate: string | null;
  prescriptionCount: number;
  healthRecordCount: number;
}

function computeFreshness(contributedAt: string): "fresh" | "aging" | "stale" {
  const days = (Date.now() - new Date(contributedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 30) return "fresh";
  if (days < 90) return "aging";
  return "stale";
}

export const useAnonymousContributions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: contributions = [], isLoading } = useQuery({
    queryKey: ['anonymous-contributions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anonymous_health_contributions')
        .select('*')
        .eq('patient_id', user!.id)
        .order('contributed_at', { ascending: false });
      if (error) throw error;

      const contributionIds = (data || []).map(c => c.id);
      let blockchainMap: Record<string, { data_hash: string; created_at: string }> = {};
      if (contributionIds.length > 0) {
        const { data: bcData } = await supabase
          .from('blockchain_transactions')
          .select('target_resource_id, data_hash, created_at')
          .eq('target_resource_type', 'anonymous_contribution')
          .in('target_resource_id', contributionIds);
        if (bcData) {
          bcData.forEach(bc => {
            if (bc.target_resource_id) {
              blockchainMap[bc.target_resource_id] = { data_hash: bc.data_hash, created_at: bc.created_at };
            }
          });
        }
      }

      return (data as unknown as AnonymousContribution[]).map(c => ({
        ...c,
        blockchainHash: blockchainMap[c.id]?.data_hash ?? null,
        blockchainTimestamp: blockchainMap[c.id]?.created_at ?? null,
        freshness: computeFreshness(c.contributed_at),
      })) as ContributionWithBlockchain[];
    },
    enabled: !!user?.id,
  });

  // Usage counts per contribution from access log
  const { data: usageCounts = {} } = useQuery({
    queryKey: ['contribution-usage-counts', user?.id],
    queryFn: async () => {
      const activeIds = contributions.filter(c => c.is_active).map(c => c.id);
      if (activeIds.length === 0) return {};
      const { data, error } = await supabase
        .from('contribution_access_log')
        .select('contribution_id')
        .in('contribution_id', activeIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach(row => {
        counts[row.contribution_id] = (counts[row.contribution_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user?.id && contributions.length > 0,
  });

  // Total research usage count
  const totalUsageCount = Object.values(usageCounts).reduce((sum, c) => sum + c, 0);

  const submitContribution = useMutation({
    mutationFn: async ({ categories, jurisdiction, expiresAt }: { categories: string[]; jurisdiction: string; expiresAt?: string | null }) => {
      const { data: anonData, error: anonError } = await supabase.functions.invoke('anonymize-health-data', {
        body: { categories, jurisdiction },
      });
      if (anonError) throw anonError;

      const { data: inserted, error: insertError } = await supabase
        .from('anonymous_health_contributions')
        .insert([{
          patient_id: user!.id,
          contribution_hash: anonData.contribution_hash,
          anonymized_data: anonData.anonymized_data,
          data_categories: anonData.data_categories,
          disease_categories: anonData.disease_categories,
          age_range: anonData.age_range,
          gender: anonData.gender,
          source_jurisdiction: anonData.source_jurisdiction,
          requires_govt_approval: anonData.requires_govt_approval,
          govt_approval_status: anonData.govt_approval_status,
          expires_at: expiresAt || null,
          quality_score: anonData.quality_score ?? null,
        }])
        .select('id')
        .single();
      if (insertError) throw insertError;

      await supabase.rpc('record_blockchain_transaction', {
        p_transaction_type: 'CONSENT_GIVEN',
        p_actor_id: user!.id,
        p_target_resource_type: 'anonymous_contribution',
        p_target_resource_id: inserted.id,
        p_metadata: {
          action: 'data_contributed',
          data_categories: anonData.data_categories,
          disease_categories: anonData.disease_categories,
          jurisdiction: anonData.source_jurisdiction,
          contribution_hash: anonData.contribution_hash,
        },
      });

      await supabase.rpc('add_audit_entry', {
        p_event_type: 'DATA_CONTRIBUTED',
        p_entity_type: 'anonymous_contribution',
        p_entity_id: inserted.id,
        p_user_id: user!.id,
        p_action: 'contributed',
        p_details: {
          data_categories: anonData.data_categories,
          disease_categories: anonData.disease_categories,
          jurisdiction: anonData.source_jurisdiction,
        },
      });

      return anonData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anonymous-contributions'] });
      toast({ title: "Contribution submitted", description: "Your anonymized health data has been shared with the global research pool." });
    },
    onError: (error: Error) => {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    },
  });

  const withdrawContribution = useMutation({
    mutationFn: async (contributionId: string) => {
      const { error } = await supabase
        .from('anonymous_health_contributions')
        .update({ is_active: false })
        .eq('id', contributionId)
        .eq('patient_id', user!.id);
      if (error) throw error;

      await supabase.rpc('record_blockchain_transaction', {
        p_transaction_type: 'CONSENT_WITHDRAWN',
        p_actor_id: user!.id,
        p_target_resource_type: 'anonymous_contribution',
        p_target_resource_id: contributionId,
        p_metadata: { action: 'data_withdrawn' },
      });

      await supabase.rpc('add_audit_entry', {
        p_event_type: 'DATA_WITHDRAWN',
        p_entity_type: 'anonymous_contribution',
        p_entity_id: contributionId,
        p_user_id: user!.id,
        p_action: 'withdrawn',
        p_details: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anonymous-contributions'] });
      toast({ title: "Contribution withdrawn", description: "Your data has been removed from the global pool." });
    },
  });

  const updateGovtReference = useMutation({
    mutationFn: async ({ id, referenceNumber }: { id: string; referenceNumber: string }) => {
      const { error } = await supabase
        .from('anonymous_health_contributions')
        .update({ govt_reference_number: referenceNumber, govt_approval_status: 'pending' })
        .eq('id', id)
        .eq('patient_id', user!.id);
      if (error) throw error;

      await supabase.rpc('add_audit_entry', {
        p_event_type: 'GOVT_REFERENCE_UPDATED',
        p_entity_type: 'anonymous_contribution',
        p_entity_id: id,
        p_user_id: user!.id,
        p_action: 'updated',
        p_details: { govt_reference_number: referenceNumber },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anonymous-contributions'] });
      toast({ title: "Reference updated", description: "Government reference number has been saved." });
    },
  });

  // Granular per-category withdrawal
  const updateContributionCategories = useMutation({
    mutationFn: async ({ id, categories }: { id: string; categories: string[] }) => {
      if (categories.length === 0) {
        return withdrawContribution.mutateAsync(id);
      }
      const { error } = await supabase
        .from('anonymous_health_contributions')
        .update({ data_categories: categories })
        .eq('id', id)
        .eq('patient_id', user!.id);
      if (error) throw error;

      await supabase.rpc('add_audit_entry', {
        p_event_type: 'CATEGORIES_UPDATED',
        p_entity_type: 'anonymous_contribution',
        p_entity_id: id,
        p_user_id: user!.id,
        p_action: 'updated',
        p_details: { remaining_categories: categories },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anonymous-contributions'] });
      toast({ title: "Category removed", description: "Data category has been withdrawn from this contribution." });
    },
  });

  // Toggle auto-renew
  const toggleAutoRenew = useMutation({
    mutationFn: async ({ id, autoRenew }: { id: string; autoRenew: boolean }) => {
      const { error } = await supabase
        .from('anonymous_health_contributions')
        .update({ auto_renew: autoRenew } as any)
        .eq('id', id)
        .eq('patient_id', user!.id);
      if (error) throw error;

      await supabase.rpc('add_audit_entry', {
        p_event_type: 'AUTO_RENEW_TOGGLED',
        p_entity_type: 'anonymous_contribution',
        p_entity_id: id,
        p_user_id: user!.id,
        p_action: 'updated',
        p_details: { auto_renew: autoRenew },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anonymous-contributions'] });
      toast({ title: "Auto-renew updated" });
    },
  });

  // Bulk withdraw
  const bulkWithdraw = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await withdrawContribution.mutateAsync(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anonymous-contributions'] });
      toast({ title: "Bulk withdrawal complete", description: "Selected contributions have been withdrawn." });
    },
  });

  // Bulk extend expiry by 6 months
  const bulkExtendExpiry = useMutation({
    mutationFn: async (ids: string[]) => {
      const newExpiry = addMonths(new Date(), 6).toISOString();
      const { error } = await supabase
        .from('anonymous_health_contributions')
        .update({ expires_at: newExpiry })
        .in('id', ids)
        .eq('patient_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anonymous-contributions'] });
      toast({ title: "Expiry extended", description: "Selected contributions extended by 6 months." });
    },
  });

  // Bulk toggle auto-renew on
  const bulkToggleAutoRenew = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('anonymous_health_contributions')
        .update({ auto_renew: true } as any)
        .in('id', ids)
        .eq('patient_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anonymous-contributions'] });
      toast({ title: "Auto-renew enabled", description: "Selected contributions will auto-renew." });
    },
  });

  // Update contribution in-place (versioning)
  const updateContribution = useMutation({
    mutationFn: async (contributionId: string) => {
      const contribution = contributions.find(c => c.id === contributionId);
      if (!contribution) throw new Error("Contribution not found");

      const { data: anonData, error: anonError } = await supabase.functions.invoke('anonymize-health-data', {
        body: { categories: contribution.data_categories, jurisdiction: contribution.source_jurisdiction },
      });
      if (anonError) throw anonError;

      const { error: updateError } = await supabase
        .from('anonymous_health_contributions')
        .update({
          anonymized_data: anonData.anonymized_data,
          contribution_hash: anonData.contribution_hash,
          quality_score: anonData.quality_score ?? null,
          contributed_at: new Date().toISOString(),
          disease_categories: anonData.disease_categories,
        })
        .eq('id', contributionId)
        .eq('patient_id', user!.id);
      if (updateError) throw updateError;

      await supabase.rpc('record_blockchain_transaction', {
        p_transaction_type: 'HEALTH_RECORD_UPDATED',
        p_actor_id: user!.id,
        p_target_resource_type: 'anonymous_contribution',
        p_target_resource_id: contributionId,
        p_metadata: {
          action: 'data_updated',
          data_categories: anonData.data_categories,
          old_quality_score: contribution.quality_score,
          new_quality_score: anonData.quality_score,
        },
      });

      await supabase.rpc('add_audit_entry', {
        p_event_type: 'DATA_UPDATED',
        p_entity_type: 'anonymous_contribution',
        p_entity_id: contributionId,
        p_user_id: user!.id,
        p_action: 'updated',
        p_details: {
          old_quality_score: contribution.quality_score,
          new_quality_score: anonData.quality_score,
        },
      });

      return { oldScore: contribution.quality_score, newScore: anonData.quality_score };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['anonymous-contributions'] });
      const scoreDiff = (result.newScore ?? 0) - (result.oldScore ?? 0);
      toast({
        title: "Contribution updated",
        description: `Data refreshed with latest records.${scoreDiff !== 0 ? ` Quality: ${result.oldScore ?? '?'} → ${result.newScore ?? '?'}` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const activeCount = contributions.filter(c => c.is_active).length;
  const totalCategories = [...new Set(contributions.filter(c => c.is_active).flatMap(c => c.data_categories))].length;

  // Enhanced new records check with per-category counts
  const { data: newRecordsCheck } = useQuery({
    queryKey: ['new-records-check', user?.id],
    queryFn: async (): Promise<NewRecordsInfo> => {
      const lastContribution = contributions.find(c => c.is_active);
      if (!lastContribution) return { hasNew: false, lastDate: null, prescriptionCount: 0, healthRecordCount: 0 };
      const since = lastContribution.contributed_at;

      const [{ count: rxCount }, { count: hrCount }] = await Promise.all([
        supabase.from('prescriptions').select('*', { count: 'exact', head: true })
          .eq('patient_id', user!.id).gt('created_at', since),
        supabase.from('health_records').select('*', { count: 'exact', head: true })
          .eq('user_id', user!.id).gt('uploaded_at', since),
      ]);

      const rx = rxCount || 0;
      const hr = hrCount || 0;

      return {
        hasNew: (rx + hr) > 0,
        lastDate: since,
        prescriptionCount: rx,
        healthRecordCount: hr,
      };
    },
    enabled: !!user?.id && contributions.length > 0,
  });

  return {
    contributions,
    isLoading,
    submitContribution,
    withdrawContribution,
    updateContribution,
    updateGovtReference,
    updateContributionCategories,
    toggleAutoRenew,
    bulkWithdraw,
    bulkExtendExpiry,
    bulkToggleAutoRenew,
    activeCount,
    totalCategories,
    hasNewRecords: newRecordsCheck?.hasNew ?? false,
    lastContributionDate: newRecordsCheck?.lastDate ?? null,
    newRecordsInfo: newRecordsCheck ?? null,
    usageCounts,
    totalUsageCount,
  };
};
