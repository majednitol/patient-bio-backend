import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface EmergencyToken {
  id: string;
  patient_id: string;
  emergency_token: string;
  emergency_pin_hash: string | null;
  access_level: "critical_only" | "full";
  expires_at: string;
  created_at: string;
  accessed_at: string | null;
  access_count: number;
  is_active: boolean;
  created_by: "patient" | "qr_scan" | "system";
  responder_identifier: string | null;
}

interface CreateEmergencyTokenParams {
  duration_minutes: number;
  access_level: "critical_only" | "full";
  pin?: string;
}

export const useEmergencyAccess = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  // Fetch active emergency tokens
  const { data: activeTokens, isLoading } = useQuery({
    queryKey: ["emergency-tokens", user?.id],
    queryFn: async (): Promise<EmergencyToken[]> => {
      if (!user?.id) return [];

      // Use the safe view that excludes emergency_pin_hash
      const { data, error } = await supabase
        .from("emergency_tokens_safe" as any)
        .select("id, patient_id, emergency_token, access_level, expires_at, created_at, accessed_at, access_count, is_active, created_by, responder_identifier")
        .eq("patient_id", user.id)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as EmergencyToken[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Check expiry every 30 seconds
  });

  // Create emergency token
  const createToken = useMutation({
    mutationFn: async (params: CreateEmergencyTokenParams) => {
      if (!user?.id) throw new Error("Not authenticated");

      setIsCreating(true);
      
      // Generate a secure random token
      const tokenArray = new Uint8Array(16);
      crypto.getRandomValues(tokenArray);
      const emergencyToken = Array.from(tokenArray)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
        .slice(0, 12);

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + params.duration_minutes);

      // Hash PIN using SHA-256 via Web Crypto API
      let pinHash: string | null = null;
      if (params.pin) {
        const encoder = new TextEncoder();
        const data = encoder.encode(params.pin + user.id.slice(0, 8));
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        pinHash = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }

      const { data, error } = await supabase
        .from("emergency_access_tokens")
        .insert({
          patient_id: user.id,
          emergency_token: emergencyToken,
          emergency_pin_hash: pinHash,
          access_level: params.access_level,
          expires_at: expiresAt.toISOString(),
          created_by: "patient",
        })
        .select()
        .single();

      if (error) throw error;
      return data as EmergencyToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-tokens", user?.id] });
      toast({
        title: "Emergency Access Enabled",
        description: "First responders can now scan your QR code to access critical health information.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsCreating(false);
    },
  });

  // Revoke emergency token
  const revokeToken = useMutation({
    mutationFn: async (tokenId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("emergency_access_tokens")
        .update({ is_active: false })
        .eq("id", tokenId)
        .eq("patient_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-tokens", user?.id] });
      toast({
        title: "Emergency Access Disabled",
        description: "Your emergency QR code is no longer accessible.",
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

  // Revoke all active tokens
  const revokeAllTokens = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("emergency_access_tokens")
        .update({ is_active: false })
        .eq("patient_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-tokens", user?.id] });
      toast({
        title: "All Emergency Access Revoked",
        description: "All emergency access tokens have been disabled.",
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

  // Get current active token (most recent)
  const activeToken = activeTokens?.[0] || null;
  const hasActiveEmergencyAccess = !!activeToken;

  // Calculate remaining time
  const getRemainingTime = (token: EmergencyToken): string => {
    const now = new Date();
    const expires = new Date(token.expires_at);
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Expired";
    
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  return {
    activeTokens: activeTokens || [],
    activeToken,
    hasActiveEmergencyAccess,
    isLoading,
    isCreating,
    createToken: createToken.mutate,
    revokeToken: revokeToken.mutate,
    revokeAllTokens: revokeAllTokens.mutate,
    getRemainingTime,
  };
};
