import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";

export type VerificationStatus = "pending" | "approved" | "rejected" | "expired";
export type ProviderType = "doctor" | "pathologist" | "hospital_admin" | "researcher";

export interface ProviderVerification {
  id: string;
  user_id: string;
  provider_type: ProviderType;
  license_number: string | null;
  issuing_authority: string | null;
  issuing_country: string | null;
  license_expiry_date: string | null;
  document_url: string | null;
  additional_documents: string[] | null;
  status: VerificationStatus;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitVerificationData {
  provider_type: ProviderType;
  license_number: string;
  issuing_authority: string;
  issuing_country: string;
  license_expiry_date?: string;
  document_url?: string;
  notes?: string;
}

// License expiry helpers
export const isExpiringSoon = (expiryDate: string | null): boolean => {
  if (!expiryDate) return false;
  const daysUntilExpiry = differenceInDays(new Date(expiryDate), new Date());
  return daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
};

export const isExpired = (expiryDate: string | null): boolean => {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
};

export const useProviderVerification = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's verification status
  const { data: verification, isLoading } = useQuery({
    queryKey: ["provider-verification", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("provider_verifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching verification:", error);
        throw error;
      }

      return data as ProviderVerification | null;
    },
    enabled: !!user?.id,
  });

  // Upload verification document
  const uploadDocument = async (file: File): Promise<string> => {
    if (!user?.id) throw new Error("Not authenticated");

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("provider-verifications")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    return fileName;
  };

  // Get signed URL for document
  const getDocumentUrl = async (filePath: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from("provider-verifications")
      .createSignedUrl(filePath, 60 * 60); // 1 hour

    return data?.signedUrl || null;
  };

  // Submit verification
  const submitMutation = useMutation({
    mutationFn: async (data: SubmitVerificationData & { file?: File; additionalFiles?: File[] }) => {
      if (!user?.id) throw new Error("Not authenticated");

      let documentUrl = data.document_url;

      // Upload primary file if provided
      if (data.file) {
        documentUrl = await uploadDocument(data.file);
      }

      // Upload additional files
      let additionalDocuments: string[] = [];
      if (data.additionalFiles && data.additionalFiles.length > 0) {
        additionalDocuments = await Promise.all(
          data.additionalFiles.map(f => uploadDocument(f))
        );
      }

      const { data: result, error } = await supabase
        .from("provider_verifications")
        .insert({
          user_id: user.id,
          provider_type: data.provider_type,
          license_number: data.license_number,
          issuing_authority: data.issuing_authority,
          issuing_country: data.issuing_country,
          license_expiry_date: data.license_expiry_date || null,
          document_url: documentUrl || null,
          additional_documents: additionalDocuments.length > 0 ? additionalDocuments : null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-verification", user?.id] });
      toast.success("Verification submitted successfully!");
    },
    onError: (error: Error) => {
      console.error("Verification submission error:", error);
      toast.error("Failed to submit verification");
    },
  });

  // Resubmit verification (after rejection)
  const resubmitMutation = useMutation({
    mutationFn: async (data: SubmitVerificationData & { file?: File; additionalFiles?: File[] }) => {
      if (!user?.id) throw new Error("Not authenticated");

      let documentUrl = data.document_url;

      if (data.file) {
        documentUrl = await uploadDocument(data.file);
      }

      let additionalDocuments: string[] = [];
      if (data.additionalFiles && data.additionalFiles.length > 0) {
        additionalDocuments = await Promise.all(
          data.additionalFiles.map(f => uploadDocument(f))
        );
      }

      // Insert new verification (old one stays as record)
      const { data: result, error } = await supabase
        .from("provider_verifications")
        .insert({
          user_id: user.id,
          provider_type: data.provider_type,
          license_number: data.license_number,
          issuing_authority: data.issuing_authority,
          issuing_country: data.issuing_country,
          license_expiry_date: data.license_expiry_date || null,
          document_url: documentUrl || null,
          additional_documents: additionalDocuments.length > 0 ? additionalDocuments : null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-verification", user?.id] });
      toast.success("Verification resubmitted successfully!");
    },
    onError: (error: Error) => {
      console.error("Resubmission error:", error);
      toast.error("Failed to resubmit verification");
    },
  });

  return {
    verification,
    isLoading,
    submitVerification: submitMutation.mutate,
    isSubmitting: submitMutation.isPending,
    resubmitVerification: resubmitMutation.mutate,
    isResubmitting: resubmitMutation.isPending,
    getDocumentUrl,
    uploadDocument,
  };
};

// Admin hook for reviewing verifications
export const useAdminVerifications = () => {
  const queryClient = useQueryClient();

  const { data: verifications, isLoading } = useQuery({
    queryKey: ["admin-verifications"],
    queryFn: async () => {
      // First, fetch all verifications
      const { data: verificationData, error: verificationError } = await supabase
        .from("provider_verifications")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(200);

      if (verificationError) {
        console.error("Error fetching verifications:", verificationError);
        throw verificationError;
      }

      // Fetch profile data for each verification type
      const userIds = verificationData.map(v => v.user_id);
      
      const [doctorRes, pathologistRes, researcherRes] = await Promise.all([
        supabase.from("doctor_profiles").select("user_id, full_name").in("user_id", userIds),
        supabase.from("pathologist_profiles").select("user_id, full_name").in("user_id", userIds),
        supabase.from("researcher_profiles").select("user_id, full_name").in("user_id", userIds),
      ]);

      const doctorMap = new Map(doctorRes.data?.map(d => [d.user_id, d.full_name]) || []);
      const pathologistMap = new Map(pathologistRes.data?.map(p => [p.user_id, p.full_name]) || []);
      const researcherMap = new Map(researcherRes.data?.map(r => [r.user_id, r.full_name]) || []);

      // Combine the data
      return verificationData.map(v => ({
        ...v,
        provider_name: 
          v.provider_type === "doctor" ? doctorMap.get(v.user_id) :
          v.provider_type === "pathologist" ? pathologistMap.get(v.user_id) :
          researcherMap.get(v.user_id) || null,
      })) as (ProviderVerification & { provider_name?: string | null })[];
    },
  });

  const { data: pendingCount } = useQuery({
    queryKey: ["admin-verifications-pending-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("provider_verifications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch verification history for a specific user
  const fetchVerificationHistory = async (userId: string): Promise<ProviderVerification[]> => {
    const { data, error } = await supabase
      .from("provider_verifications")
      .select("*")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return (data || []) as ProviderVerification[];
  };

  // Review verification (approve/reject)
  const reviewMutation = useMutation({
    mutationFn: async ({
      verificationId,
      status,
      rejectionReason,
      adminNotes,
    }: {
      verificationId: string;
      status: "approved" | "rejected";
      rejectionReason?: string;
      adminNotes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updatePayload: Record<string, unknown> = {
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: status === "rejected" ? rejectionReason : null,
      };

      // Store admin notes in the notes field
      if (adminNotes) {
        updatePayload.notes = adminNotes;
      }

      const { data, error } = await supabase
        .from("provider_verifications")
        .update(updatePayload)
        .eq("id", verificationId)
        .select()
        .single();

      if (error) throw error;

      // Create notification for the provider
      const notificationTitle = status === "approved" 
        ? "Verification Approved" 
        : "Verification Not Approved";
      
      const notificationMessage = status === "approved"
        ? "Your credentials have been verified. Your profile now displays a verified badge."
        : `Your verification was not approved. ${rejectionReason || "Please review and resubmit with updated documents."}`;

      await supabase.from("notifications").insert({
        user_id: data.user_id,
        type: status === "approved" ? "verification_approved" : "verification_rejected",
        title: notificationTitle,
        message: notificationMessage,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-verifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-verifications-pending-count"] });
      toast.success(
        variables.status === "approved"
          ? "Provider verified successfully!"
          : "Verification rejected"
      );
    },
    onError: (error: Error) => {
      console.error("Review error:", error);
      toast.error("Failed to process review");
    },
  });

  // Bulk review mutation
  const bulkReviewMutation = useMutation({
    mutationFn: async ({
      verificationIds,
      status,
      rejectionReason,
    }: {
      verificationIds: string[];
      status: "approved" | "rejected";
      rejectionReason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const results = await Promise.all(
        verificationIds.map(async (id) => {
          const { data, error } = await supabase
            .from("provider_verifications")
            .update({
              status,
              reviewed_by: user.id,
              reviewed_at: new Date().toISOString(),
              rejection_reason: status === "rejected" ? rejectionReason : null,
            })
            .eq("id", id)
            .select()
            .single();

          if (error) throw error;

          // Notification
          await supabase.from("notifications").insert({
            user_id: data.user_id,
            type: status === "approved" ? "verification_approved" : "verification_rejected",
            title: status === "approved" ? "Verification Approved" : "Verification Not Approved",
            message: status === "approved"
              ? "Your credentials have been verified. Your profile now displays a verified badge."
              : `Your verification was not approved. ${rejectionReason || "Please review and resubmit with updated documents."}`,
          });

          return data;
        })
      );

      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-verifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-verifications-pending-count"] });
      toast.success(
        `${variables.verificationIds.length} verification(s) ${variables.status === "approved" ? "approved" : "rejected"}`
      );
    },
    onError: (error: Error) => {
      console.error("Bulk review error:", error);
      toast.error("Failed to process bulk review");
    },
  });

  // Get document URL for admin
  const getDocumentUrl = async (filePath: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from("provider-verifications")
      .createSignedUrl(filePath, 60 * 60);

    return data?.signedUrl || null;
  };

  return {
    verifications: verifications || [],
    isLoading,
    pendingCount,
    reviewVerification: reviewMutation.mutate,
    isReviewing: reviewMutation.isPending,
    bulkReviewVerification: bulkReviewMutation.mutate,
    isBulkReviewing: bulkReviewMutation.isPending,
    fetchVerificationHistory,
    getDocumentUrl,
  };
};
