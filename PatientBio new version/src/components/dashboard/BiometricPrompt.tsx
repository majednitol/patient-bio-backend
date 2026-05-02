import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { isPlatformAuthenticatorAvailable, isWebAuthnSupported } from "@/hooks/useBiometricAuth";
import { supabase } from "@/integrations/supabase/client";

const PROMPT_DISMISSED_KEY = "biometric-prompt-dismissed";

/**
 * One-time prompt shown after login suggesting biometric enrollment.
 * Only appears on mobile, when WebAuthn platform authenticator is available,
 * and the user hasn't already registered or dismissed the prompt.
 */
export const BiometricPrompt = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      // Already dismissed?
      if (localStorage.getItem(`${PROMPT_DISMISSED_KEY}-${user.id}`)) return;

      // WebAuthn available?
      if (!isWebAuthnSupported()) return;
      const platform = await isPlatformAuthenticatorAvailable();
      if (!platform) return;

      // Already has credentials?
      const { data } = await supabase
        .from("user_biometric_credentials")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (data && data.length > 0) return;

      // Show after a short delay so it doesn't compete with page load
      setTimeout(() => setShow(true), 2000);
    };

    check();
  }, [user]);

  const dismiss = () => {
    setShow(false);
    if (user) localStorage.setItem(`${PROMPT_DISMISSED_KEY}-${user.id}`, "1");
  };

  const goToSettings = () => {
    dismiss();
    window.location.href = "/dashboard/settings";
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed bottom-20 left-3 right-3 z-50 lg:hidden"
        >
          <div className="bg-card border border-border shadow-xl rounded-2xl p-4 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
              <Fingerprint className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Enable Quick Login</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use Face ID or fingerprint for faster, more secure access.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="h-8 text-xs" onClick={goToSettings}>
                  Enable Now
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={dismiss}>
                  Not Now
                </Button>
              </div>
            </div>
            <button onClick={dismiss} className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
