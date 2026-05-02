/**
 * Haptic feedback utility using the Vibration API.
 * Silent no-op on unsupported devices.
 */

const canVibrate = () => typeof navigator !== "undefined" && "vibrate" in navigator;

/** Short tap – successful action (record uploaded, medication taken) */
export const hapticSuccess = () => {
  if (canVibrate()) navigator.vibrate(50);
};

/** Double tap – warning or attention needed */
export const hapticWarning = () => {
  if (canVibrate()) navigator.vibrate([30, 50, 30]);
};

/** Long buzz – critical alert (emergency access) */
export const hapticCritical = () => {
  if (canVibrate()) navigator.vibrate([100, 50, 100, 50, 200]);
};

/** Light tap – generic interaction feedback */
export const hapticTap = () => {
  if (canVibrate()) navigator.vibrate(15);
};
