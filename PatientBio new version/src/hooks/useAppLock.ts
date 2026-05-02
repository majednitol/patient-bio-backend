import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

const APP_LOCK_ENABLED_KEY = "app-lock-enabled";
const APP_LOCK_TIMEOUT_KEY = "app-lock-timeout";
const APP_LOCK_LAST_ACTIVE_KEY = "app-lock-last-active";

/** Default timeout before requiring re-auth: 1 minute */
const DEFAULT_TIMEOUT_MS = 60_000;

export type AppLockMethod = "biometric" | "pin" | "both";

export interface AppLockConfig {
  enabled: boolean;
  timeoutMs: number;
}

/**
 * Manages app-level lock state based on page visibility.
 *
 * When the user switches away (tab hidden / phone locked) and returns
 * after the configured timeout, `isLocked` flips to true.  The consumer
 * renders a lock-screen overlay and calls `unlock()` after successful
 * biometric or PIN verification.
 */
export const useAppLock = () => {
  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const lastActiveRef = useRef<number>(Date.now());
  const userKey = user?.id ?? "anon";

  // --- persisted config helpers ---
  const getEnabled = useCallback(
    () => localStorage.getItem(`${APP_LOCK_ENABLED_KEY}-${userKey}`) === "true",
    [userKey],
  );

  const getTimeout = useCallback(
    () =>
      parseInt(localStorage.getItem(`${APP_LOCK_TIMEOUT_KEY}-${userKey}`) || "", 10) ||
      DEFAULT_TIMEOUT_MS,
    [userKey],
  );

  const [enabled, setEnabledState] = useState(false);
  const [timeoutMs, setTimeoutMsState] = useState(DEFAULT_TIMEOUT_MS);

  // Sync state from localStorage on mount / user change
  useEffect(() => {
    setEnabledState(getEnabled());
    setTimeoutMsState(getTimeout());

    const savedTs = parseInt(
      localStorage.getItem(`${APP_LOCK_LAST_ACTIVE_KEY}-${userKey}`) || "0",
      10,
    );
    if (savedTs) lastActiveRef.current = savedTs;

    // If returning after timeout, lock immediately
    if (getEnabled() && savedTs && Date.now() - savedTs > getTimeout()) {
      setIsLocked(true);
    }
  }, [userKey, getEnabled, getTimeout]);

  // --- visibility change listener ---
  useEffect(() => {
    if (!user) return;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Stamp departure time
        const now = Date.now();
        lastActiveRef.current = now;
        localStorage.setItem(`${APP_LOCK_LAST_ACTIVE_KEY}-${userKey}`, String(now));
      } else if (document.visibilityState === "visible") {
        if (!getEnabled()) return;

        const elapsed = Date.now() - lastActiveRef.current;
        if (elapsed > getTimeout()) {
          setIsLocked(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [user, userKey, getEnabled, getTimeout]);

  // --- public API ---
  const unlock = useCallback(() => {
    setIsLocked(false);
    lastActiveRef.current = Date.now();
    localStorage.setItem(`${APP_LOCK_LAST_ACTIVE_KEY}-${userKey}`, String(Date.now()));
  }, [userKey]);

  const setEnabled = useCallback(
    (value: boolean) => {
      localStorage.setItem(`${APP_LOCK_ENABLED_KEY}-${userKey}`, String(value));
      setEnabledState(value);
      if (!value) setIsLocked(false);
    },
    [userKey],
  );

  const setTimeout_ = useCallback(
    (ms: number) => {
      localStorage.setItem(`${APP_LOCK_TIMEOUT_KEY}-${userKey}`, String(ms));
      setTimeoutMsState(ms);
    },
    [userKey],
  );

  return {
    /** Whether the lock screen should be displayed */
    isLocked,
    /** Whether the user has opted into app lock */
    enabled,
    /** Current timeout in milliseconds */
    timeoutMs,
    /** Call after successful biometric / PIN verification */
    unlock,
    /** Toggle app lock on / off */
    setEnabled,
    /** Update the inactivity timeout */
    setTimeout: setTimeout_,
  };
};
