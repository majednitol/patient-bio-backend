import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useResendVerification = () => {
  const [isResending, setIsResending] = useState(false);
  const [lastResendTime, setLastResendTime] = useState<number | null>(null);

  const resendVerificationEmail = async (email: string): Promise<{ error: Error | null }> => {
    // Rate limiting: 60 seconds between resends
    if (lastResendTime && Date.now() - lastResendTime < 60000) {
      const secondsLeft = Math.ceil((60000 - (Date.now() - lastResendTime)) / 1000);
      return { 
        error: new Error(`Please wait ${secondsLeft} seconds before requesting another email.`) 
      };
    }

    setIsResending(true);
    try {
      const redirectTo = `${window.location.origin}/verify-email`;
      let sent = false;

      // Try sending via custom Resend edge function first
      try {
        const { error: fnError } = await supabase.functions.invoke("send-verification-email", {
          body: { email, redirectTo },
        });
        if (!fnError) {
          sent = true;
        } else {
          console.warn("Custom verification email failed:", fnError);
        }
      } catch (fnErr) {
        console.warn("Custom verification email error:", fnErr);
      }

      // Fallback to Supabase built-in resend
      if (!sent) {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: {
            emailRedirectTo: redirectTo,
          },
        });
        if (error) {
          return { error };
        }
      }

      setLastResendTime(Date.now());
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    } finally {
      setIsResending(false);
    }
  };

  const canResend = !lastResendTime || Date.now() - lastResendTime >= 60000;

  return {
    resendVerificationEmail,
    isResending,
    canResend,
  };
};