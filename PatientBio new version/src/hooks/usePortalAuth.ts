import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PortalType = 'patient' | 'doctor' | 'hospital' | 'pathologist' | 'researcher' | 'admin';

// Map portal types to expected database roles
// Map portal types to expected database roles (doctor portal accepts both doctor and doctor_staff)
const portalRoleMap: Record<PortalType, string[]> = {
  patient: ['user'],
  doctor: ['doctor', 'doctor_staff'],
  hospital: ['hospital_admin'],
  pathologist: ['pathologist'],
  researcher: ['researcher'],
  admin: ['admin'],
};

// Map roles to portal names for user-friendly messages
const rolePortalNameMap: Record<string, string> = {
  user: 'Patient',
  doctor: 'Doctor',
  doctor_staff: 'Doctor',
  hospital_admin: 'Hospital',
  pathologist: 'Diagnostic Center',
  researcher: 'Researcher',
  admin: 'Admin',
};

export const usePortalAuth = (expectedPortal: PortalType) => {
  const { signIn: baseSignIn, signUp: baseSignUp } = useAuth();

  // Check if user has correct role for this portal (with retry for new users)
  const validatePortalAccess = async (userId: string, retries = 3): Promise<{ valid: boolean; userPortal?: string; userRole?: string }> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return { valid: false };
      }

      if (data) {
        const allowedRoles = portalRoleMap[expectedPortal];
        const isValid = allowedRoles.includes(data.role);
        const userPortal = rolePortalNameMap[data.role] || 'Unknown';
        return { valid: isValid, userPortal, userRole: data.role };
      }

      // Role not yet assigned (DB trigger race condition) — wait and retry
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return { valid: false };
  };

  // Assign the correct portal role for new OAuth users (e.g., Google sign-in)
  const assignPortalRole = async (userId: string): Promise<{ error: Error | null }> => {
    const portalRoleAssignment: Record<PortalType, string> = {
      patient: 'user',
      doctor: 'doctor',
      hospital: 'hospital_admin',
      pathologist: 'pathologist',
      researcher: 'researcher',
      admin: 'admin',
    };

    const targetRole = portalRoleAssignment[expectedPortal];

    // Use SECURITY DEFINER RPC to bypass RLS — only assigns if no role exists yet
    const { error } = await supabase.rpc('assign_own_role', { p_role: targetRole as any });

    if (error) {
      console.error('Failed to assign portal role:', error);
      return { error: new Error('Failed to assign role. Please try again.') };
    }

    // Update user metadata with portal_type so it's consistent
    await supabase.auth.updateUser({
      data: { portal_type: expectedPortal },
    });

    return { error: null };
  };

  // Portal-specific sign in with validation
  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { error } = await baseSignIn(email, password);

    if (error) {
      return { error };
    }

    // Get fresh user to check role
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { valid, userPortal, userRole } = await validatePortalAccess(user.id);

      if (!valid) {
        // Sign out and return error with portal link
        await supabase.auth.signOut();
        const portalLinks: Record<string, string> = {
          user: '/auth',
          doctor: '/doctors/login',
          doctor_staff: '/doctors/login',
          hospital_admin: '/hospital/login',
          pathologist: '/pathologist/login',
          researcher: '/researcher/login',
          admin: '/admin/login',
        };
        const correctPath = userRole ? portalLinks[userRole] || '' : '';
        const linkHint = correctPath ? ` Go to: ${window.location.origin}${correctPath}` : '';
        return {
          error: new Error(
            `This account is registered for the ${userPortal} Portal. ` +
            `Please use the correct portal to sign in.${linkHint}`
          ),
        };
      }
    }

    return { error: null };
  };

  // Portal-specific sign up with optional full name
  const signUp = async (email: string, password: string, fullName?: string): Promise<{ error: Error | null; session: any }> => {
    return baseSignUp(email, password, expectedPortal, fullName);
  };

  return { signIn, signUp, validatePortalAccess, assignPortalRole };
};

// Utility function to get portal name from role
export const getPortalNameFromRole = (role: string): string => {
  return rolePortalNameMap[role] || 'Unknown';
};
