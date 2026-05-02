import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a random session ID (persisted for the tab lifetime via sessionStorage).
 */
function getSessionId(): string {
  const key = "pb_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) return "mobile";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  return "desktop";
}

/**
 * Tracks page views on every route change by inserting into public.page_views.
 * Fires once per path per mount cycle.
 */
export function usePageViewTracker() {
  const location = useLocation();
  const lastPath = useRef<string>("");

  useEffect(() => {
    const path = location.pathname;
    // Avoid duplicate tracking for same path
    if (path === lastPath.current) return;
    lastPath.current = path;

    const sessionId = getSessionId();

    // Fire-and-forget insert — no await needed
    supabase
      .from("page_views" as any)
      .insert({
        session_id: sessionId,
        path,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        device_type: getDeviceType(),
      })
      .then(({ error }) => {
        if (error) console.warn("[PageView] tracking error:", error.message);
      });
  }, [location.pathname]);
}
