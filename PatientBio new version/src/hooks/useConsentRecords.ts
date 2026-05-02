import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getCachedConsentRecords } from "@/lib/offlineDB";

export type ConsentType = 
  | "data_sharing" 
  | "research_participation" 
  | "marketing" 
  | "emergency_access" 
  | "third_party_access";

export type GrantedToType = 
  | "doctor" 
  | "hospital" 
  | "pathologist" 
  | "researcher" 
  | "system" 
  | "emergency_services";

export interface ConsentRecord {
  id: string;
  patient_id: string;
  consent_type: ConsentType;
  granted_to_id: string | null;
  granted_to_type: GrantedToType | null;
  purpose: string;
  scope: string[];
  is_active: boolean;
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  digital_signature: string | null;
  signature_method: string;
  consent_version: string;
  created_at: string;
  updated_at: string;
}

interface CreateConsentParams {
  consent_type: ConsentType;
  granted_to_id?: string | null;
  granted_to_type?: GrantedToType | null;
  purpose: string;
  scope?: string[];
  expires_at?: string | null;
}

interface RevokeConsentParams {
  id: string;
  reason: string;
}

export const useConsentRecords = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: consents, isLoading, error } = useQuery({
    queryKey: ["consent-records", user?.id],
    queryFn: async (): Promise<ConsentRecord[]> => {
      if (!user?.id) return [];

      try {
        const { data, error } = await supabase
          .from("consent_records")
          .select("id, patient_id, consent_type, granted_to_id, granted_to_type, purpose, scope, is_active, granted_at, expires_at, revoked_at, revocation_reason, digital_signature, signature_method, consent_version, created_at, updated_at")
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        return (data || []).map(record => ({
          ...record,
          scope: Array.isArray(record.scope) ? record.scope : []
        })) as ConsentRecord[];
      } catch (err) {
        // Offline fallback
        if (!navigator.onLine) {
          const cached = await getCachedConsentRecords(user.id);
          return cached.map(c => ({
            id: c.id,
            patient_id: user.id,
            consent_type: c.consentType as ConsentType,
            granted_to_id: null,
            granted_to_type: (c.grantedToType as GrantedToType) || null,
            purpose: c.purpose,
            scope: c.scope,
            is_active: c.isActive,
            granted_at: c.grantedAt || "",
            expires_at: c.expiresAt,
            revoked_at: null,
            revocation_reason: null,
            digital_signature: null,
            signature_method: "offline_cache",
            consent_version: "1.0",
            created_at: c.grantedAt || "",
            updated_at: c.grantedAt || "",
          }));
        }
        throw err;
      }
    },
    enabled: !!user?.id,
  });

  const createConsent = useMutation({
    mutationFn: async (params: CreateConsentParams) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("consent_records")
        .insert({
          patient_id: user.id,
          consent_type: params.consent_type,
          granted_to_id: params.granted_to_id || null,
          granted_to_type: params.granted_to_type || null,
          purpose: params.purpose,
          scope: params.scope || [],
          expires_at: params.expires_at || null,
          user_agent: navigator.userAgent,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent-records", user?.id] });
      toast({
        title: "Consent Recorded",
        description: "Your consent has been digitally signed and recorded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeConsent = useMutation({
    mutationFn: async ({ id, reason }: RevokeConsentParams) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("consent_records")
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revocation_reason: reason,
        })
        .eq("id", id)
        .eq("patient_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent-records", user?.id] });
      toast({
        title: "Consent Revoked",
        description: "The consent has been successfully revoked.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const activeConsents = (consents || []).filter(c => c.is_active);
  const revokedConsents = (consents || []).filter(c => !c.is_active);

  return {
    consents: consents || [],
    activeConsents,
    revokedConsents,
    isLoading,
    error,
    createConsent: createConsent.mutate,
    revokeConsent: revokeConsent.mutate,
    isCreating: createConsent.isPending,
    isRevoking: revokeConsent.isPending,
  };
};
