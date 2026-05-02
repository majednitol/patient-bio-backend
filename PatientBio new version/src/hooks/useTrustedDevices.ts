import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface TrustedDevice {
  id: string;
  user_id: string;
  device_fingerprint: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  last_used_at: string | null;
  created_at: string;
  is_active: boolean | null;
}

// Generate a simple device fingerprint from browser characteristics
export const generateDeviceFingerprint = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || "unknown",
    navigator.platform,
  ];
  
  // Simple hash function
  const str = components.join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + "-" + Date.now().toString(36);
};

// Parse user agent for device info
const parseUserAgent = () => {
  const ua = navigator.userAgent;
  
  // Browser detection
  let browser = "Unknown";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  
  // OS detection
  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  return { browser, os };
};

export const useTrustedDevices = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all trusted devices for user
  const { data: devices, isLoading } = useQuery({
    queryKey: ["trusted-devices", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("trusted_devices")
        .select("id, user_id, device_fingerprint, device_name, browser, os, last_used_at, created_at, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("last_used_at", { ascending: false });

      if (error) throw error;
      return data as TrustedDevice[];
    },
    enabled: !!user?.id,
  });

  // Check if current device is trusted
  const checkDeviceTrusted = async (): Promise<boolean> => {
    if (!user?.id) return false;
    
    const storedFingerprint = localStorage.getItem("device_fingerprint");
    if (!storedFingerprint) return false;

    const { data, error } = await supabase
      .from("trusted_devices")
      .select("id")
      .eq("user_id", user.id)
      .eq("device_fingerprint", storedFingerprint)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return false;

    // Update last used time
    await supabase
      .from("trusted_devices")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id);

    return true;
  };

  // Trust current device
  const trustDevice = useMutation({
    mutationFn: async (deviceName?: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      let fingerprint = localStorage.getItem("device_fingerprint");
      if (!fingerprint) {
        fingerprint = generateDeviceFingerprint();
        localStorage.setItem("device_fingerprint", fingerprint);
      }

      const { browser, os } = parseUserAgent();

      const { data, error } = await supabase
        .from("trusted_devices")
        .upsert({
          user_id: user.id,
          device_fingerprint: fingerprint,
          device_name: deviceName || `${browser} on ${os}`,
          browser,
          os,
          last_used_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: "user_id,device_fingerprint" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trusted-devices"] });
      toast.success("This device is now trusted");
    },
    onError: (error) => {
      toast.error("Failed to trust device: " + error.message);
    },
  });

  // Remove trusted device
  const removeTrustedDevice = useMutation({
    mutationFn: async (deviceId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("trusted_devices")
        .update({ is_active: false })
        .eq("id", deviceId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trusted-devices"] });
      toast.success("Device removed from trusted list");
    },
    onError: (error) => {
      toast.error("Failed to remove device: " + error.message);
    },
  });

  // Get current device fingerprint
  const getCurrentFingerprint = () => {
    return localStorage.getItem("device_fingerprint");
  };

  return {
    devices: devices || [],
    isLoading,
    checkDeviceTrusted,
    trustDevice,
    removeTrustedDevice,
    getCurrentFingerprint,
    parseUserAgent,
  };
};
