import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2 } from "lucide-react";
import { isPlatformAuthenticatorAvailable, isWebAuthnSupported } from "@/hooks/useBiometricAuth";

interface BiometricLoginButtonProps {
  onAuthenticate: () => Promise<boolean>;
  disabled?: boolean;
}

export const BiometricLoginButton = ({ onAuthenticate, disabled }: BiometricLoginButtonProps) => {
  const [authenticating, setAuthenticating] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!isWebAuthnSupported()) {
        setIsAvailable(false);
        return;
      }
      const available = await isPlatformAuthenticatorAvailable();
      setIsAvailable(available);
    };
    checkAvailability();
  }, []);

  if (!isAvailable) return null;

  const handleClick = async () => {
    setAuthenticating(true);
    try {
      await onAuthenticate();
    } finally {
      setAuthenticating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleClick}
      disabled={disabled || authenticating}
    >
      {authenticating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Authenticating...
        </>
      ) : (
        <>
          <Fingerprint className="mr-2 h-4 w-4" />
          Sign in with Biometrics
        </>
      )}
    </Button>
  );
};
