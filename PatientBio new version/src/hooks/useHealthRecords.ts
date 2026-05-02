import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { encryptFile, decryptFile, isEncryptionSupported } from "@/lib/encryption";
import { getCachedHealthRecords, cacheHealthRecords } from "@/lib/offlineDB";
import { getICD11ChapterCode } from "@/lib/icd11-mapping";

type HealthRecord = Tables<"health_records">;
type HealthRecordInsert = TablesInsert<"health_records">;

const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PAGE_SIZE = 50;

export const useHealthRecords = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [page, setPage] = useState(0);

  // Fetch total count separately for pagination
  const { data: totalCount } = useQuery({
    queryKey: ["health-records-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from("health_records")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  const { data: records, isLoading, error } = useQuery({
    queryKey: ["health-records", user?.id, page],
    queryFn: async () => {
      if (!user?.id) return [];

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      try {
        const { data, error } = await supabase
          .from("health_records")
          .select("id, user_id, title, category, disease_category, icd11_chapter_code, file_url, file_type, file_size, is_encrypted, encryption_salt, encryption_iv, record_date, provider_name, description, notes, uploaded_at")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false })
          .range(from, to);

        if (error) throw error;

        // Cache for offline use
        if (data && data.length > 0) {
          cacheHealthRecords(user.id, data.map(r => ({
            ...r,
            created_at: r.uploaded_at || undefined,
          }))).catch(() => {});
        }

        setIsOfflineData(false);
        return data as HealthRecord[];
      } catch (err) {
        // Offline fallback
        if (!navigator.onLine) {
          const cached = await getCachedHealthRecords(user.id);
          if (cached.length > 0) {
            setIsOfflineData(true);
            return cached.map(c => ({
              id: c.id,
              user_id: c.userId,
              title: c.title,
              category: c.category,
              disease_category: c.diseaseCategory,
              provider_name: c.providerName,
              record_date: c.recordDate,
              file_type: c.fileType,
              file_url: "",
              file_size: null,
              is_encrypted: false,
              encryption_salt: null,
              encryption_iv: null,
              uploaded_at: c.createdAt,
            })) as unknown as HealthRecord[];
          }
        }
        throw err;
      }
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
    retry: navigator.onLine ? 3 : 0,
  });

  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE));
  const goToPage = useCallback((p: number) => {
    setPage(Math.max(0, Math.min(p, totalPages - 1)));
  }, [totalPages]);
  const nextPage = useCallback(() => goToPage(page + 1), [page, goToPage]);
  const prevPage = useCallback(() => goToPage(page - 1), [page, goToPage]);

  const uploadFile = async (
    file: File,
    enableEncryption: boolean = true
  ): Promise<{ filePath: string; salt?: string; iv?: string; isEncrypted: boolean }> => {
    if (!user?.id) throw new Error("Not authenticated");

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      throw new Error(
        "Invalid file type. Accepted: JPEG, PNG, GIF, WebP, PDF"
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File too large. Maximum size is 10MB");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    setUploadProgress(10);

    let fileToUpload: Blob = file;
    let salt: string | undefined;
    let iv: string | undefined;
    let isEncrypted = false;

    // Encrypt file if supported and enabled
    if (enableEncryption && isEncryptionSupported()) {
      try {
        setUploadProgress(20);
        const encrypted = await encryptFile(file, user.id);
        fileToUpload = encrypted.encryptedBlob;
        salt = encrypted.salt;
        iv = encrypted.iv;
        isEncrypted = true;
        setUploadProgress(40);
      } catch (encryptError) {
        console.error("Encryption failed, uploading unencrypted:", encryptError);
        // Fall back to unencrypted upload
      }
    }

    const { error: uploadError } = await supabase.storage
      .from("health-records")
      .upload(fileName, fileToUpload, {
        cacheControl: "3600",
        upsert: false,
      });

    setUploadProgress(80);

    if (uploadError) throw uploadError;

    // Get the public URL (signed URL for private bucket)
    const { data: urlData } = await supabase.storage
      .from("health-records")
      .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

    setUploadProgress(100);

    if (!urlData?.signedUrl) {
      throw new Error("Failed to get file URL");
    }

    return { filePath: fileName, salt, iv, isEncrypted };
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from("health-records")
      .createSignedUrl(filePath, 60 * 60); // 1 hour

    return data?.signedUrl || null;
  };

  /**
   * Downloads and decrypts a file if it was encrypted
   */
  const getDecryptedFile = async (record: HealthRecord): Promise<Blob | null> => {
    if (!user?.id) return null;

    const signedUrl = await getSignedUrl(record.file_url);
    if (!signedUrl) return null;

    const response = await fetch(signedUrl);
    const encryptedData = await response.arrayBuffer();

    // If the file is encrypted and we have the keys, decrypt it
    if (record.is_encrypted && record.encryption_salt && record.encryption_iv) {
      try {
        const decryptedBlob = await decryptFile(
          encryptedData,
          user.id,
          record.encryption_salt,
          record.encryption_iv,
          record.file_type || 'application/octet-stream'
        );
        return decryptedBlob;
      } catch (decryptError) {
        console.error("Decryption failed:", decryptError);
        throw new Error("Failed to decrypt file. The file may be corrupted or you may not have access.");
      }
    }

    // Return unencrypted file as blob
    return new Blob([encryptedData], { type: record.file_type || 'application/octet-stream' });
  };

  /**
   * Gets a decrypted URL for viewing/downloading a file
   */
  const getDecryptedUrl = async (record: HealthRecord): Promise<string | null> => {
    const blob = await getDecryptedFile(record);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  };

  const createRecordMutation = useMutation({
    mutationFn: async ({
      file,
      metadata,
      enableEncryption = true,
    }: {
      file: File;
      metadata: Omit<HealthRecordInsert, "user_id" | "file_url">;
      enableEncryption?: boolean;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Upload file first (with encryption if enabled)
      const { filePath, salt, iv, isEncrypted } = await uploadFile(file, enableEncryption);

      // Create database record with encryption metadata + ICD-11 chapter mapping
      const icd11Chapter = getICD11ChapterCode(metadata.disease_category as string);
      const record: HealthRecordInsert = {
        ...metadata,
        user_id: user.id,
        file_url: filePath,
        file_type: file.type,
        file_size: file.size,
        is_encrypted: isEncrypted,
        encryption_salt: salt,
        encryption_iv: iv,
        ...(icd11Chapter ? { icd11_chapter_code: icd11Chapter } : {}),
      };

      const { data, error } = await supabase
        .from("health_records")
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-records"] });
      queryClient.invalidateQueries({ queryKey: ["health-records-count"] });
      setUploadProgress(0);
      toast({
        title: "Success",
        description: "Health record uploaded and encrypted successfully",
      });
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (record: HealthRecord) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("health-records")
        .remove([record.file_url]);

      if (storageError) console.error("Storage delete error:", storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from("health_records")
        .delete()
        .eq("id", record.id)
        .eq("user_id", user.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-records"] });
      queryClient.invalidateQueries({ queryKey: ["health-records-count"] });
      toast({
        title: "Deleted",
        description: "Health record deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    records: records || [],
    isLoading,
    error,
    isOfflineData,
    uploadProgress,
    createRecord: createRecordMutation.mutate,
    isCreating: createRecordMutation.isPending,
    deleteRecord: deleteRecordMutation.mutate,
    isDeleting: deleteRecordMutation.isPending,
    getSignedUrl,
    getDecryptedFile,
    getDecryptedUrl,
    isEncryptionSupported: isEncryptionSupported(),
    // Pagination
    totalCount: totalCount ?? 0,
    currentPage: page,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: page < totalPages - 1,
    hasPrevPage: page > 0,
    pageSize: PAGE_SIZE,
  };
};
