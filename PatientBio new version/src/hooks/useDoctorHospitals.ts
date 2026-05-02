import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DoctorHospital {
  id: string;
  hospital_id: string;
  role: string;
  department: string | null;
  is_active: boolean;
  joined_at: string | null;
  hospital: {
    id: string;
    name: string;
    logo_url: string | null;
    city: string | null;
    type: string | null;
  };
}

export const useDoctorHospitals = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["doctor-hospitals", user?.id],
    queryFn: async (): Promise<DoctorHospital[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("hospital_staff")
        .select(`
          id,
          hospital_id,
          role,
          department,
          is_active,
          joined_at,
          hospital:hospitals(id, name, logo_url, city, type)
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("joined_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((item) => ({
        id: item.id,
        hospital_id: item.hospital_id,
        role: item.role,
        department: item.department,
        is_active: item.is_active,
        joined_at: item.joined_at,
        hospital: item.hospital as DoctorHospital["hospital"],
      }));
    },
    enabled: !!user?.id,
  });
};
