import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hapticCritical } from "@/lib/haptics";
import { useNotifications } from "@/hooks/useNotifications";

/**
 * Full-screen red overlay for emergency_access notifications.
 * Requires a two-step dismiss (tap dismiss → confirm).
 */
export const CriticalAlertOverlay = () => {
  const { notifications, markAsRead } = useNotifications();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const emergencyNotifications = notifications.filter(
    (n) =>
      n.type === "emergency_access" &&
      !n.is_read &&
      !dismissed.has(n.id)
  );

  const current = emergencyNotifications[0] ?? null;

  useEffect(() => {
    if (current) {
      hapticCritical();
    }
  }, [current?.id]);

  const handleDismiss = useCallback(() => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    if (current) {
      markAsRead(current.id);
      setDismissed((prev) => new Set(prev).add(current.id));
      setConfirming(false);
    }
  }, [confirming, current, markAsRead]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-destructive/95 backdrop-blur-sm p-6"
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 30 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-sm bg-background rounded-2xl p-6 shadow-2xl text-center space-y-4"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-destructive animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-destructive flex items-center justify-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Emergency Access Alert
              </h2>
              <p className="text-sm font-medium text-foreground">{current.title}</p>
              {current.message && (
                <p className="text-xs text-muted-foreground">{current.message}</p>
              )}
            </div>

            <div className="pt-2">
              {!confirming ? (
                <Button
                  onClick={handleDismiss}
                  variant="destructive"
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Dismiss Alert
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Are you sure you want to dismiss this critical alert?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setConfirming(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleDismiss}
                    >
                      Confirm Dismiss
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
