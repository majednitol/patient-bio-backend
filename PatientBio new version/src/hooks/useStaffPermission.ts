import { useStaffAccess } from "@/hooks/useStaffAccess";
import { DEFAULT_PERMISSIONS } from "@/constants/staffPermissions";

/**
 * Returns a function that checks whether the current staff user
 * has a given permission. Non-staff users (doctors) always return true.
 */
export function useStaffPermission() {
  const { isStaff, staffRecord } = useStaffAccess();

  const hasPermission = (key: string): boolean => {
    if (!isStaff) return true;
    const perms = staffRecord?.permissions;
    if (!perms) return DEFAULT_PERMISSIONS[key] ?? true;
    return perms[key] ?? DEFAULT_PERMISSIONS[key] ?? true;
  };

  return { hasPermission, isStaff };
}
