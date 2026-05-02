 import { supabase } from "@/integrations/supabase/client";
 
 interface RedirectResult {
   path: string;
   isLoading: boolean;
 }
 
 /**
  * Determines the appropriate redirect path based on user's role and profiles.
  * Priority: Admin > Doctor > Pathologist > Researcher > Hospital Staff > Patient
  */
 export const getRoleBasedRedirectPath = async (userId: string): Promise<string> => {
   if (!userId) return "/dashboard";
 
   try {
     // 1. Check user_roles table first for admin
     const { data: roleData } = await supabase
       .from("user_roles")
       .select("role")
       .eq("user_id", userId)
       .maybeSingle();
 
     if (roleData?.role === "admin") return "/admin";
 
     // 2. Check for portal-specific profiles in parallel
     const [doctorProfile, pathProfile, researcherProfile, hospitalStaff] = 
       await Promise.all([
         supabase.from("doctor_profiles").select("id").eq("user_id", userId).maybeSingle(),
         supabase.from("pathologist_profiles").select("id").eq("user_id", userId).maybeSingle(),
         supabase.from("researcher_profiles").select("id").eq("user_id", userId).maybeSingle(),
         supabase.from("hospital_staff").select("hospital_id").eq("user_id", userId).eq("is_active", true).limit(1),
       ]);
 
     // 3. Return path based on first matching profile (priority order)
     if (doctorProfile.data) return "/doctor";
     if (pathProfile.data) return "/pathologist";
     if (researcherProfile.data) return "/researcher";
     if (hospitalStaff.data && hospitalStaff.data.length > 0) {
       return `/hospital/${hospitalStaff.data[0].hospital_id}`;
     }
 
     // 4. Default to patient dashboard
     return "/dashboard";
   } catch (error) {
     console.error("Error determining redirect path:", error);
     return "/dashboard";
   }
 };
 
 /**
  * Hook for role-based redirect with loading state
  */
 import { useQuery } from "@tanstack/react-query";
 import { STALE_TIMES } from "@/lib/queryConfig";
 import { useAuth } from "@/contexts/AuthContext";
 
 export const useRoleBasedRedirect = (): RedirectResult => {
   const { user } = useAuth();
 
   const { data, isLoading } = useQuery({
     queryKey: ["redirect-path", user?.id],
     queryFn: () => getRoleBasedRedirectPath(user!.id),
     enabled: !!user?.id,
     staleTime: STALE_TIMES.SHORT,
   });
 
   return {
     path: data || "/dashboard",
     isLoading,
   };
 };