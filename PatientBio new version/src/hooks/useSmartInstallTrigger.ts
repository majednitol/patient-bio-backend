const VISIT_COUNT_KEY = "pb_visit_count";
const INSTALL_ELIGIBLE_KEY = "pb_install_eligible";
const VISIT_THRESHOLD = 1;

/**
 * Tracks visit count and appointment-booking events to decide
 * when the PWA install banner should appear.
 * Returns `true` once the user has either:
 *  - visited the app ≥ 3 times (separate sessions), OR
 *  - successfully booked an appointment.
 */
export function useSmartInstallEligible(): boolean {
  if (typeof window === "undefined") return false;

  // Fast path: already eligible
  if (sessionStorage.getItem(INSTALL_ELIGIBLE_KEY) === "1") return true;

  // Count visits (once per session)
  if (!sessionStorage.getItem("pb_visit_counted")) {
    const prev = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0", 10);
    const next = prev + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(next));
    sessionStorage.setItem("pb_visit_counted", "1");
  }

  const visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0", 10);
  if (visits >= VISIT_THRESHOLD) {
    sessionStorage.setItem(INSTALL_ELIGIBLE_KEY, "1");
    return true;
  }

  return sessionStorage.getItem(INSTALL_ELIGIBLE_KEY) === "1";
}

/** Call after a successful appointment booking to immediately unlock the banner */
export function markInstallEligibleAfterBooking() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(INSTALL_ELIGIBLE_KEY, "1");
}
