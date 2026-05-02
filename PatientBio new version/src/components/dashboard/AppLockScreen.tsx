import { useState, useRef, useEffect, useCallback } from "react";
import { Fingerprint, Lock, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hapticTap, hapticSuccess, hapticWarning } from "@/lib/haptics";
import { isPlatformAuthenticatorAvailable, isWebAuthnSupported } from "@/hooks/useBiometricAuth";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { useTranslation } from "react-i18next";

interface AppLockScreenProps {
  onUnlock: () => void;
}

const PIN_LENGTH = 4;

/**
 * Full-screen lock overlay. Supports biometric (fingerprint / Face ID)
 * and 4-digit PIN verification. Renders on top of the entire app.
 */
export const AppLockScreen = ({ onUnlock }: AppLockScreenProps) => {
  const { t } = useTranslation();
  const { authenticate, hasBiometricEnabled, authenticating } = useBiometricAuth();
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const check = async () => {
      const supported = isWebAuthnSupported();
      const platform = supported && (await isPlatformAuthenticatorAvailable());
      setBiometricAvailable(!!platform && hasBiometricEnabled);
    };
    check();
  }, [hasBiometricEnabled]);

  // Auto-trigger biometric on mount if available
  useEffect(() => {
    if (biometricAvailable && !showPin) {
      handleBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricAvailable]);

  const handleBiometric = async () => {
    const success = await authenticate();
    if (success) {
      hapticSuccess();
      onUnlock();
    }
  };

  const hashPin = async (value: string): Promise<string> => {
    const encoded = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const handlePinInput = useCallback(
    (index: number, value: string) => {
      if (!/^\d?$/.test(value)) return;
      hapticTap();

      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);
      setError("");

      if (value && index < PIN_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      if (value && index === PIN_LENGTH - 1 && newPin.every((d) => d !== "")) {
        verifyPin(newPin.join(""));
      }
    },
    [pin],
  );

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyPin = async (entered: string) => {
    setLoading(true);
    const userId = localStorage.getItem("auth-user-id");
    if (!userId) {
      setError("Session expired. Please log in again.");
      setLoading(false);
      return;
    }

    const hashed = await hashPin(entered);
    const storedHash = localStorage.getItem(`security-pin-${userId}`);

    if (!storedHash) {
      setError("No PIN set. Use biometrics or log in again.");
      setLoading(false);
      return;
    }

    if (hashed === storedHash) {
      hapticSuccess();
      onUnlock();
    } else {
      hapticWarning();
      setError("Incorrect PIN. Try again.");
      setPin(Array(PIN_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
    setLoading(false);
  };

  const hasPinConfigured = (() => {
    const userId = localStorage.getItem("auth-user-id");
    return !!userId && !!localStorage.getItem(`security-pin-${userId}`);
  })();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background safe-area-top safe-area-bottom">
      {/* Gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5 pointer-events-none" />

      <div className="relative flex flex-col items-center gap-6 px-6 max-w-sm w-full">
        {/* Logo / icon */}
        <div className="p-4 rounded-full bg-primary/10 mb-2">
          <ShieldCheck className="h-10 w-10 text-primary" />
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold">
            {t("appLock.title", "App Locked")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("appLock.subtitle", "Verify your identity to continue")}
          </p>
        </div>

        {!showPin ? (
          <div className="flex flex-col items-center gap-3 w-full">
            {biometricAvailable && (
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={handleBiometric}
                disabled={authenticating}
              >
                {authenticating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Fingerprint className="h-5 w-5" />
                )}
                {t("appLock.useBiometric", "Unlock with Biometrics")}
              </Button>
            )}

            {hasPinConfigured && (
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2"
                onClick={() => {
                  setShowPin(true);
                  setTimeout(() => inputRefs.current[0]?.focus(), 150);
                }}
              >
                <Lock className="h-4 w-4" />
                {t("appLock.usePin", "Use PIN")}
              </Button>
            )}

            {!biometricAvailable && !hasPinConfigured && (
              <p className="text-sm text-muted-foreground text-center">
                {t(
                  "appLock.noMethodAvailable",
                  "No unlock method available. Please log in again.",
                )}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex justify-center gap-3">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinInput(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={cn(
                    "w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 bg-muted/50 outline-none transition-all",
                    "focus:border-primary focus:ring-2 focus:ring-primary/20",
                    error ? "border-destructive shake" : "border-border",
                  )}
                  disabled={loading}
                  autoComplete="off"
                />
              ))}
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium animate-in fade-in-0">
                {error}
              </p>
            )}

            {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}

            {biometricAvailable && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  setShowPin(false);
                  setPin(Array(PIN_LENGTH).fill(""));
                  setError("");
                }}
              >
                <Fingerprint className="h-4 w-4 mr-1" />
                {t("appLock.switchToBiometric", "Use Biometrics instead")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
