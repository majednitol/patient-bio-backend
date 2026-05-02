import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const HEARTBEAT_INTERVAL = 60_000; // 60 seconds

/**
 * Tracks doctor online presence via heartbeat.
 * Sets is_online=true on mount, heartbeats last_seen_at every 60s,
 * and sets is_online=false on unmount/beforeunload.
 */
export function useDoctorPresence() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const setOnline = async () => {
      await supabase
        .from("doctor_profiles")
        .update({ is_online: true, last_seen_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);
    };

    const setOffline = () => {
      // Use sendBeacon-friendly approach; fire-and-forget
      supabase
        .from("doctor_profiles")
        .update({ is_online: false, last_seen_at: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .then(() => {});
    };

    const heartbeat = async () => {
      await supabase
        .from("doctor_profiles")
        .update({ last_seen_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);
    };

    // Go online
    setOnline();

    // Heartbeat interval
    intervalRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    // Cleanup on unmount
    const handleBeforeUnload = () => setOffline();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setOffline();
    };
  }, [user?.id]);
}
