import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticTap, hapticSuccess, hapticWarning } from "@/lib/haptics";

interface SecurityPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  title?: string;
  description?: string;
}

const PIN_LENGTH = 4;

/**
 * 4-digit PIN confirmation dialog for sensitive actions
 * (sharing records, revoking access tokens, etc.)
 * PIN is stored as a SHA-256 hash in localStorage per user.
 */
export const SecurityPinDialog = ({
  open,
  onOpenChange,
  onVerified,
  title = "Confirm Action",
  description = "Enter your 4-digit security PIN to continue.",
}: SecurityPinDialogProps) => {
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"verify" | "setup">("verify");
  const [setupPin, setSetupPin] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check if user has a PIN set
  useEffect(() => {
    if (open) {
      const userId = localStorage.getItem("auth-user-id");
      const hasPin = userId && localStorage.getItem(`security-pin-${userId}`);
      setMode(hasPin ? "verify" : "setup");
      setPin(Array(PIN_LENGTH).fill(""));
      setError("");
      setSetupPin(null);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  const hashPin = async (value: string): Promise<string> => {
    const encoded = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleInput = useCallback((index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    hapticTap();

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError("");

    if (value && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === PIN_LENGTH - 1 && newPin.every(d => d !== "")) {
      handleSubmit(newPin.join(""));
    }
  }, [pin]);

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (enteredPin: string) => {
    setLoading(true);
    const userId = localStorage.getItem("auth-user-id");
    if (!userId) return;

    const hashed = await hashPin(enteredPin);

    if (mode === "setup") {
      if (!setupPin) {
        // First entry: store temporarily and ask to confirm
        setSetupPin(hashed);
        setPin(Array(PIN_LENGTH).fill(""));
        setError("");
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
        setLoading(false);
        return;
      }

      // Confirm entry
      if (hashed === setupPin) {
        localStorage.setItem(`security-pin-${userId}`, hashed);
        hapticSuccess();
        onVerified();
        onOpenChange(false);
      } else {
        hapticWarning();
        setError("PINs don't match. Try again.");
        setSetupPin(null);
        setPin(Array(PIN_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } else {
      // Verify against stored hash
      const storedHash = localStorage.getItem(`security-pin-${userId}`);
      if (hashed === storedHash) {
        hapticSuccess();
        onVerified();
        onOpenChange(false);
      } else {
        hapticWarning();
        setError("Incorrect PIN. Try again.");
        setPin(Array(PIN_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    }
    setLoading(false);
  };

  const getDescription = () => {
    if (mode === "setup") {
      return setupPin ? "Re-enter your PIN to confirm." : "Create a 4-digit security PIN for sensitive actions.";
    }
    return description;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs sm:max-w-sm text-center">
        <DialogHeader className="items-center">
          <div className="p-3 rounded-full bg-primary/10 mb-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>{mode === "setup" ? "Set Security PIN" : title}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-3 my-4">
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInput(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={cn(
                "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-muted/50 outline-none transition-all",
                "focus:border-primary focus:ring-2 focus:ring-primary/20",
                error ? "border-destructive shake" : "border-border"
              )}
              disabled={loading}
              autoComplete="off"
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-destructive font-medium animate-in fade-in-0">{error}</p>
        )}

        {loading && (
          <div className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Hook to gate an action behind the security PIN dialog.
 * Usage:
 *   const { requestPin, PinDialog } = useSecurityPin();
 *   const handleShare = () => requestPin(() => { doShare(); });
 *   return <>{PinDialog}<button onClick={handleShare}>Share</button></>;
 */
export const useSecurityPin = () => {
  const [open, setOpen] = useState(false);
  const callbackRef = useRef<(() => void) | null>(null);

  const requestPin = (onSuccess: () => void, opts?: { title?: string; description?: string }) => {
    callbackRef.current = onSuccess;
    titleRef.current = opts?.title || "Confirm Action";
    descRef.current = opts?.description || "Enter your 4-digit security PIN to continue.";
    setOpen(true);
  };

  const titleRef = useRef("Confirm Action");
  const descRef = useRef("Enter your 4-digit security PIN to continue.");

  // Store user id for PIN storage
  useEffect(() => {
    const sub = () => {
      const uid = JSON.parse(localStorage.getItem("sb-mepbtytqjupnyqhbckja-auth-token") || "{}");
      if (uid?.user?.id) localStorage.setItem("auth-user-id", uid.user.id);
    };
    sub();
  }, []);

  const PinDialog = (
    <SecurityPinDialog
      open={open}
      onOpenChange={setOpen}
      onVerified={() => callbackRef.current?.()}
      title={titleRef.current}
      description={descRef.current}
    />
  );

  return { requestPin, PinDialog };
};
