import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { SharedScopes, DEFAULT_SCOPES } from "@/components/dashboard/DataScopeSelector";

export interface AccessToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  accessed_at: string | null;
  access_count: number;
  is_revoked: boolean;
  label: string | null;
  shared_scopes: SharedScopes | null;
}

interface CreateTokenParams {
  expiresInHours: number;
  label?: string;
  sharedScopes?: SharedScopes;
  forUserId?: string;
}

const generateToken = () => {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const useAccessTokens = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tokens, isLoading } = useQuery({
    queryKey: ["access-tokens", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("access_tokens")
        .select("id, user_id, token, expires_at, created_at, accessed_at, access_count, is_revoked, label, shared_scopes")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data as unknown as AccessToken[]);
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  const createTokenMutation = useMutation({
    mutationFn: async ({ expiresInHours, label, sharedScopes, forUserId }: CreateTokenParams) => {
      if (!user?.id) throw new Error("Not authenticated");

      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      const insertData: any = {
        user_id: forUserId || user.id,
        token,
        expires_at: expiresAt.toISOString(),
        label: label || null,
        shared_scopes: sharedScopes || DEFAULT_SCOPES,
      };

      const { data, error } = await supabase
        .from("access_tokens")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AccessToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-tokens", user?.id] });
      toast({
        title: "Link Created",
        description: "Your shareable access link has been generated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("access_tokens")
        .update({ is_revoked: true })
        .eq("id", tokenId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-tokens", user?.id] });
      toast({
        title: "Link Revoked",
        description: "The access link has been deactivated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Revoke",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("access_tokens")
        .delete()
        .eq("id", tokenId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-tokens", user?.id] });
      toast({
        title: "Link Deleted",
        description: "The access link has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Delete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkRevokeMutation = useMutation({
    mutationFn: async (tokenIds: string[]) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("access_tokens")
        .update({ is_revoked: true })
        .in("id", tokenIds)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-tokens", user?.id] });
      toast({ title: "Links Revoked", description: "Selected links have been deactivated." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Revoke", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (tokenIds: string[]) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("access_tokens")
        .delete()
        .in("id", tokenIds)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-tokens", user?.id] });
      toast({ title: "Links Deleted", description: "Selected links have been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Delete", description: error.message, variant: "destructive" });
    },
  });

  const isTokenExpired = (token: AccessToken) => {
    return new Date(token.expires_at) < new Date();
  };

  const isTokenActive = (token: AccessToken) => {
    return !token.is_revoked && !isTokenExpired(token);
  };

  return {
    tokens: tokens || [],
    isLoading,
    createToken: createTokenMutation.mutate,
    isCreating: createTokenMutation.isPending,
    revokeToken: revokeTokenMutation.mutate,
    isRevoking: revokeTokenMutation.isPending,
    deleteToken: deleteTokenMutation.mutate,
    isDeleting: deleteTokenMutation.isPending,
    bulkRevoke: bulkRevokeMutation.mutate,
    isBulkRevoking: bulkRevokeMutation.isPending,
    bulkDelete: bulkDeleteMutation.mutate,
    isBulkDeleting: bulkDeleteMutation.isPending,
    isTokenExpired,
    isTokenActive,
  };
};
