import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCachedFamilyMembers } from "@/lib/offlineDB";

export interface FamilyMember {
  id: string;
  account_holder_id: string;
  patient_id: string;
  relationship: string;
  is_primary: boolean;
  can_manage_records: boolean;
  can_share_data: boolean;
  claimed_at: string | null;
  claimed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export const RELATIONSHIP_OPTIONS = [
  { value: "parent", label: "Parent" },
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" },
] as const;

export type RelationshipType = typeof RELATIONSHIP_OPTIONS[number]["value"];

interface QuickRegisterWithFamilyInput {
  hospitalId: string;
  // Patient details
  display_name: string;
  phone: string;
  date_of_birth: string | null;
  gender: string | null;
  // Family member details
  family_member_name: string;
  family_member_phone: string;
  relationship: string;
}

export const useFamilyMembers = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ["family-members", targetUserId],
    queryFn: async (): Promise<FamilyMember[]> => {
      if (!targetUserId) return [];

      try {
        const { data, error } = await supabase
          .from("family_members")
          .select("id, account_holder_id, patient_id, relationship, is_primary, can_manage_records, can_share_data, claimed_at, claimed_by_user_id, created_at, updated_at")
          .or(`account_holder_id.eq.${targetUserId},patient_id.eq.${targetUserId}`)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (err) {
        if (!navigator.onLine) {
          const cached = await getCachedFamilyMembers(targetUserId);
          if (cached.length > 0) {
            return cached.map(c => ({
              id: c.id,
              account_holder_id: c.accountHolderId,
              patient_id: c.patientId,
              relationship: c.relationship,
              is_primary: c.isPrimary,
              can_manage_records: c.canManageRecords,
              can_share_data: c.canShareData,
              claimed_at: null,
              claimed_by_user_id: null,
              created_at: c.cachedAt,
              updated_at: c.cachedAt,
            })) as FamilyMember[];
          }
        }
        throw err;
      }
    },
    enabled: !!targetUserId,
  });
};

export const useRemoveFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
    },
  });
};

export const useQuickRegisterWithFamily = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      hospitalId,
      display_name,
      phone,
      date_of_birth,
      gender,
      family_member_name,
      family_member_phone,
      relationship,
    }: QuickRegisterWithFamilyInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Generate UUIDs for guest patient and family member account holder
      const guestPatientId = crypto.randomUUID();
      const accountHolderId = crypto.randomUUID();

      // 1. Create family member (account holder) profile
      const { error: holderError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: accountHolderId,
          display_name: family_member_name,
          phone: family_member_phone,
          is_guest_patient: true,
          registered_by_hospital_id: hospitalId,
        });

      if (holderError) throw holderError;

      // 2. Create patient profile
      const { data: patientProfile, error: patientError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: guestPatientId,
          display_name,
          phone,
          date_of_birth: date_of_birth || null,
          gender: gender || null,
          is_guest_patient: true,
          registered_by_hospital_id: hospitalId,
        })
        .select()
        .single();

      if (patientError) throw patientError;

      // 3. Create family member relationship
      const { error: familyError } = await supabase
        .from("family_members")
        .insert({
          account_holder_id: accountHolderId,
          patient_id: guestPatientId,
          relationship,
          is_primary: true,
          can_manage_records: true,
          can_share_data: true,
        });

      if (familyError) throw familyError;

      // 4. Grant doctor/staff access to the patient
      const { error: accessError } = await supabase
        .from("doctor_patient_access")
        .insert({
          doctor_id: user.id,
          patient_id: guestPatientId,
          is_active: true,
        });

      if (accessError) throw accessError;

      return {
        patient: patientProfile,
        patientId: guestPatientId,
        accountHolderId,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-patients"] });
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
    },
  });
};
