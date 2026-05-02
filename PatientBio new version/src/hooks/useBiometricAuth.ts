import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BiometricCredential {
  id: string;
  user_id: string;
  credential_id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
}

// Check if WebAuthn is supported
export const isWebAuthnSupported = (): boolean => {
  return !!(
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === "function"
  );
};

// Check if platform authenticator (fingerprint/face) is available
export const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

// Convert ArrayBuffer to base64url string
const bufferToBase64url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};

// Convert base64url string to ArrayBuffer
const base64urlToBuffer = (base64url: string): ArrayBuffer => {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Generate a random challenge
const generateChallenge = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(32));
};

export const useBiometricAuth = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);

  // Check WebAuthn support on mount
  useEffect(() => {
    const checkSupport = async () => {
      setIsSupported(isWebAuthnSupported());
      const platformAvailable = await isPlatformAuthenticatorAvailable();
      setIsPlatformAvailable(platformAvailable);
    };
    checkSupport();
  }, []);

  // Fetch user's registered credentials
  const fetchCredentials = useCallback(async () => {
    if (!user) {
      setCredentials([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_biometric_credentials")
        .select("id, user_id, credential_id, device_name, created_at, last_used_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCredentials(data || []);
    } catch (err) {
      console.error("Error fetching biometric credentials:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Register a new biometric credential
  const registerCredential = async (deviceName?: string): Promise<boolean> => {
    if (!user || !isSupported) return false;

    setRegistering(true);
    try {
      const challenge = generateChallenge();
      const userId = new TextEncoder().encode(user.id);

      // Create credential options
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: challenge.buffer as ArrayBuffer,
        rp: {
          name: "Patient Bio",
          id: window.location.hostname,
        },
        user: {
          id: userId.buffer as ArrayBuffer,
          name: user.email || "user",
          displayName: user.email || "Patient Bio User",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      };

      // Create the credential
      const credential = (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      })) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Failed to create credential");
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Extract and encode credential data
      const credentialId = bufferToBase64url(credential.rawId);
      const publicKey = bufferToBase64url(response.getPublicKey() || new ArrayBuffer(0));
      const transports = response.getTransports?.() || [];

      // Store credential in database
      const { error } = await supabase
        .from("user_biometric_credentials")
        .insert({
          user_id: user.id,
          credential_id: credentialId,
          public_key: publicKey,
          device_name: deviceName || getDeviceName(),
          transports,
          counter: 0,
        });

      if (error) throw error;

      toast({
        title: "Biometric registered",
        description: "You can now sign in with your fingerprint or face.",
      });

      await fetchCredentials();
      return true;
    } catch (err: any) {
      console.error("Biometric registration error:", err);
      
      if (err.name === "NotAllowedError") {
        toast({
          title: "Registration cancelled",
          description: "Biometric registration was cancelled or denied.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registration failed",
          description: err.message || "Could not register biometric credential.",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setRegistering(false);
    }
  };

  // Authenticate using biometric
  const authenticate = async (): Promise<boolean> => {
    if (!user || credentials.length === 0) return false;

    setAuthenticating(true);
    try {
      const challenge = generateChallenge();

      // Prepare allowed credentials
      const allowCredentials: PublicKeyCredentialDescriptor[] = credentials.map((cred) => ({
        type: "public-key",
        id: base64urlToBuffer(cred.credential_id),
        transports: ["internal", "hybrid"] as AuthenticatorTransport[],
      }));

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge.buffer as ArrayBuffer,
        allowCredentials,
        userVerification: "required",
        timeout: 60000,
        rpId: window.location.hostname,
      };

      // Get the credential
      const assertion = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })) as PublicKeyCredential;

      if (!assertion) {
        throw new Error("Authentication failed");
      }

      // Update last_used_at for the credential
      const usedCredentialId = bufferToBase64url(assertion.rawId);
      await supabase
        .from("user_biometric_credentials")
        .update({ last_used_at: new Date().toISOString() })
        .eq("credential_id", usedCredentialId);

      return true;
    } catch (err: any) {
      console.error("Biometric authentication error:", err);
      
      if (err.name === "NotAllowedError") {
        toast({
          title: "Authentication cancelled",
          description: "Biometric authentication was cancelled or denied.",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setAuthenticating(false);
    }
  };

  // Remove a credential
  const removeCredential = async (credentialId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("user_biometric_credentials")
        .delete()
        .eq("id", credentialId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Credential removed",
        description: "The biometric credential has been removed.",
      });

      await fetchCredentials();
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to remove credential.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    credentials,
    loading,
    registering,
    authenticating,
    isSupported,
    isPlatformAvailable,
    hasBiometricEnabled: credentials.length > 0,
    registerCredential,
    authenticate,
    removeCredential,
    refetch: fetchCredentials,
  };
};

// Helper to get a friendly device name
const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android Device";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux PC";
  return "Unknown Device";
};
