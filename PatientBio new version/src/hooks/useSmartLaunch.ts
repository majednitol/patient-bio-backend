import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SmartLaunchSession {
  id: string;
  status: string;
  patient_context: string | null;
  encounter_context: string | null;
  fhir_user: string | null;
  ehr_url: string;
  scope: string[];
  created_at: string;
  expires_at: string;
}

export interface SmartLaunchParams {
  iss: string; // EHR base URL
  launch?: string; // Launch context parameter
  clientId: string;
  scope?: string;
  redirectUri?: string;
}

export function useSmartLaunch() {
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<SmartLaunchSession | null>(null);

  /**
   * Initiate a SMART on FHIR launch
   */
  const initiateLaunch = async (params: SmartLaunchParams) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-launch?action=initiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to initiate SMART launch");
      }

      const data = await response.json();

      // Redirect to EHR authorization
      window.location.href = data.authorizationUrl;

      return data;
    } catch (error: any) {
      console.error("SMART launch error:", error);
      toast({
        title: "SMART Launch Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get session status after callback
   */
  const getSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-launch?action=session&session_id=${sessionId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get session");
      }

      const data = await response.json();
      setSession(data);
      return data as SmartLaunchSession;
    } catch (error: any) {
      console.error("Failed to get SMART session:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Complete the launch and associate with current user
   */
  const completeLaunch = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-launch?action=complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({ sessionId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete launch");
      }

      const data = await response.json();
      toast({
        title: "SMART Launch Complete",
        description: `Connected to EHR${data.patientContext ? ` for patient ${data.patientContext}` : ""}`,
      });

      return data;
    } catch (error: any) {
      console.error("Failed to complete SMART launch:", error);
      toast({
        title: "Launch Completion Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get the SMART configuration for this server
   */
  const getSmartConfiguration = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-launch?action=configuration`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch SMART configuration");
      }

      return response.json();
    } catch (error) {
      console.error("Failed to get SMART configuration:", error);
      throw error;
    }
  };

  return {
    initiateLaunch,
    getSession,
    completeLaunch,
    getSmartConfiguration,
    session,
    isLoading,
  };
}

export default useSmartLaunch;
