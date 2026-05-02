import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Database, Json } from "@/integrations/supabase/types";

type TransferAgreementInsert = Database["public"]["Tables"]["data_transfer_agreements"]["Insert"];
export type JurisdictionCode = 'EU' | 'US' | 'UK' | 'IN' | 'BD' | 'CN' | 'JP' | 'AU' | 'CA' | 'BR' | 'SG' | 'AE' | 'ZA' | 'OTHER';
export type TransferBasis = 'explicit_consent' | 'standard_contractual_clauses' | 'binding_corporate_rules' | 'adequacy_decision' | 'derogation_vital_interests' | 'derogation_public_interest';

export interface DataTransferAgreement {
  id: string;
  user_id: string;
  access_token_id: string | null;
  source_jurisdiction: JurisdictionCode;
  destination_jurisdiction: JurisdictionCode;
  transfer_basis: TransferBasis;
  recipient_name: string | null;
  recipient_type: string | null;
  data_categories: string[];
  purpose: string;
  retention_period_days: number | null;
  acknowledged_risks: boolean;
  acknowledged_at: string | null;
  consent_timestamp: string;
  expires_at: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  transfer_impact_assessment: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransferAgreementParams {
  accessTokenId?: string;
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  transferBasis: TransferBasis;
  recipientName?: string;
  recipientType?: 'healthcare_provider' | 'researcher' | 'insurance' | 'government' | 'other';
  dataCategories: string[];
  purpose: string;
  retentionPeriodDays?: number;
  acknowledgedRisks: boolean;
  expiresAt?: string;
  transferImpactAssessment?: Record<string, unknown>;
}

export const JURISDICTION_LABELS: Record<JurisdictionCode, string> = {
  EU: "European Union",
  US: "United States",
  UK: "United Kingdom",
  IN: "India",
  BD: "Bangladesh",
  CN: "China",
  JP: "Japan",
  AU: "Australia",
  CA: "Canada",
  BR: "Brazil",
  SG: "Singapore",
  AE: "United Arab Emirates",
  ZA: "South Africa",
  OTHER: "Other",
};

export const TRANSFER_BASIS_LABELS: Record<TransferBasis, string> = {
  explicit_consent: "Explicit Consent",
  standard_contractual_clauses: "Standard Contractual Clauses (SCCs)",
  binding_corporate_rules: "Binding Corporate Rules",
  adequacy_decision: "Adequacy Decision",
  derogation_vital_interests: "Vital Interests Derogation",
  derogation_public_interest: "Public Interest Derogation",
};

export const DATA_CATEGORY_OPTIONS = [
  { value: "demographics", label: "Demographics" },
  { value: "conditions", label: "Conditions & Diagnoses" },
  { value: "medications", label: "Medications" },
  { value: "lab_results", label: "Lab Results" },
  { value: "vitals", label: "Vital Signs" },
  { value: "allergies", label: "Allergies" },
  { value: "procedures", label: "Procedures" },
  { value: "immunizations", label: "Immunizations" },
  { value: "documents", label: "Clinical Documents" },
];

/**
 * Check if a cross-border transfer requires additional consent
 */
export function requiresCrossBorderConsent(
  source: JurisdictionCode,
  destination: JurisdictionCode
): boolean {
  // Same jurisdiction never requires cross-border consent
  if (source === destination) return false;
  
  // EU to EU/UK transfers are covered by adequacy
  if (source === 'EU' && (destination === 'EU' || destination === 'UK')) return false;
  
  // All other cross-border transfers require explicit consent
  return true;
}

/**
 * Get recommended transfer basis based on jurisdictions
 */
export function getRecommendedTransferBasis(
  source: JurisdictionCode,
  destination: JurisdictionCode
): TransferBasis {
  if (!requiresCrossBorderConsent(source, destination)) {
    return 'adequacy_decision';
  }
  
  // For transfers from EU to countries with no adequacy decision
  if (source === 'EU') {
    return 'standard_contractual_clauses';
  }
  
  // Default to explicit consent
  return 'explicit_consent';
}

/**
 * Hook for fetching all transfer agreements for the current user
 */
export function useDataTransferAgreements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["data-transfer-agreements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_transfer_agreements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as DataTransferAgreement[];
    },
    enabled: !!user,
  });
}

/**
 * Hook for fetching active (non-revoked) transfer agreements
 */
export function useActiveTransferAgreements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["data-transfer-agreements", "active", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_transfer_agreements")
        .select("*")
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as DataTransferAgreement[];
    },
    enabled: !!user,
  });
}

/**
 * Hook for fetching agreements for a specific access token
 */
export function useTokenTransferAgreements(accessTokenId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["data-transfer-agreements", "token", accessTokenId],
    queryFn: async () => {
      if (!accessTokenId) return [];
      
      const { data, error } = await supabase
        .from("data_transfer_agreements")
        .select("*")
        .eq("access_token_id", accessTokenId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as DataTransferAgreement[];
    },
    enabled: !!user && !!accessTokenId,
  });
}

/**
 * Hook for creating a new transfer agreement
 */
export function useCreateTransferAgreement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateTransferAgreementParams) => {
      if (!user) throw new Error("User not authenticated");

      const insertData: TransferAgreementInsert = {
        user_id: user.id,
        access_token_id: params.accessTokenId || null,
        source_jurisdiction: params.sourceJurisdiction as any,
        destination_jurisdiction: params.destinationJurisdiction as any,
        transfer_basis: params.transferBasis,
        recipient_name: params.recipientName || null,
        recipient_type: params.recipientType || null,
        data_categories: params.dataCategories,
        purpose: params.purpose,
        retention_period_days: params.retentionPeriodDays || null,
        acknowledged_risks: params.acknowledgedRisks,
        acknowledged_at: params.acknowledgedRisks ? new Date().toISOString() : null,
        expires_at: params.expiresAt || null,
        transfer_impact_assessment: (params.transferImpactAssessment || null) as Json,
      };

      const { data, error } = await supabase
        .from("data_transfer_agreements")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as DataTransferAgreement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-transfer-agreements"] });
      toast({ title: "Cross-border transfer agreement created" });
    },
    onError: (error) => {
      console.error("Failed to create transfer agreement:", error);
      toast({ title: "Failed to create transfer agreement", variant: "destructive" });
    },
  });
}

/**
 * Hook for revoking a transfer agreement
 */
export function useRevokeTransferAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data, error } = await supabase
        .from("data_transfer_agreements")
        .update({
          revoked_at: new Date().toISOString(),
          revocation_reason: reason || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as DataTransferAgreement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-transfer-agreements"] });
      toast({ title: "Transfer agreement revoked" });
    },
    onError: (error) => {
      console.error("Failed to revoke transfer agreement:", error);
      toast({ title: "Failed to revoke transfer agreement", variant: "destructive" });
    },
  });
}

/**
 * Hook for transfer agreement statistics
 */
export function useTransferAgreementStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["data-transfer-agreements", "stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_transfer_agreements")
        .select("destination_jurisdiction, revoked_at, transfer_basis");

      if (error) throw error;

      const agreements = data || [];
      const active = agreements.filter((a) => !a.revoked_at);
      
      const byDestination = active.reduce((acc, a) => {
        acc[a.destination_jurisdiction] = (acc[a.destination_jurisdiction] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byBasis = active.reduce((acc, a) => {
        acc[a.transfer_basis] = (acc[a.transfer_basis] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total: agreements.length,
        active: active.length,
        revoked: agreements.length - active.length,
        byDestination,
        byBasis,
      };
    },
    enabled: !!user,
  });
}
