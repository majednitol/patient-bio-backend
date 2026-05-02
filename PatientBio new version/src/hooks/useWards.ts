import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Ward {
  id: string;
  hospital_id: string;
  name: string;
  type: "general" | "icu" | "emergency" | "maternity" | "pediatric" | "private";
  floor: string | null;
  total_beds: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bed {
  id: string;
  ward_id: string;
  hospital_id: string;
  bed_number: string;
  bed_type: string;
  daily_rate: number;
  status: "available" | "occupied" | "maintenance" | "reserved";
  notes: string | null;
  created_at: string;
  updated_at: string;
  ward?: Ward;
}

// Cache configuration for better performance
const STALE_TIME = 30 * 1000; // 30 seconds
const GC_TIME = 5 * 60 * 1000; // 5 minutes

export const useWards = (hospitalId: string) => {
  return useQuery({
    queryKey: ["wards", hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wards")
        .select("*")
        .eq("hospital_id", hospitalId)
        .order("name");

      if (error) throw error;
      return data as Ward[];
    },
    enabled: !!hospitalId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useBeds = (hospitalId: string, wardId?: string) => {
  return useQuery({
    queryKey: ["beds", hospitalId, wardId],
    queryFn: async () => {
      let query = supabase
        .from("beds")
        .select("*, ward:wards(*)")
        .eq("hospital_id", hospitalId)
        .order("bed_number");

      if (wardId) {
        query = query.eq("ward_id", wardId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Bed[];
    },
    enabled: !!hospitalId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useAvailableBeds = (hospitalId: string) => {
  return useQuery({
    queryKey: ["available-beds", hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beds")
        .select("*, ward:wards(*)")
        .eq("hospital_id", hospitalId)
        .eq("status", "available")
        .order("bed_number");

      if (error) throw error;
      return data as Bed[];
    },
    enabled: !!hospitalId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useWardMutations = (hospitalId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createWard = useMutation({
    mutationFn: async (ward: Omit<Ward, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("wards")
        .insert(ward)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards", hospitalId] });
      toast({ title: "Ward created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create ward", description: error.message, variant: "destructive" });
    },
  });

  const updateWard = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Ward> & { id: string }) => {
      const { data, error } = await supabase
        .from("wards")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards", hospitalId] });
      toast({ title: "Ward updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update ward", description: error.message, variant: "destructive" });
    },
  });

  const deleteWard = useMutation({
    mutationFn: async (wardId: string) => {
      const { error } = await supabase.from("wards").delete().eq("id", wardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards", hospitalId] });
      toast({ title: "Ward deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete ward", description: error.message, variant: "destructive" });
    },
  });

  return { createWard, updateWard, deleteWard };
};

export const useBedMutations = (hospitalId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createBed = useMutation({
    mutationFn: async (bed: Omit<Bed, "id" | "created_at" | "updated_at" | "ward">) => {
      const { data, error } = await supabase
        .from("beds")
        .insert(bed)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds", hospitalId] });
      queryClient.invalidateQueries({ queryKey: ["available-beds", hospitalId] });
      toast({ title: "Bed created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create bed", description: error.message, variant: "destructive" });
    },
  });

  const updateBed = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Bed> & { id: string }) => {
      const { ward, ...cleanUpdates } = updates as Partial<Bed>;
      const { data, error } = await supabase
        .from("beds")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds", hospitalId] });
      queryClient.invalidateQueries({ queryKey: ["available-beds", hospitalId] });
      toast({ title: "Bed updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update bed", description: error.message, variant: "destructive" });
    },
  });

  const deleteBed = useMutation({
    mutationFn: async (bedId: string) => {
      const { error } = await supabase.from("beds").delete().eq("id", bedId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds", hospitalId] });
      queryClient.invalidateQueries({ queryKey: ["available-beds", hospitalId] });
      toast({ title: "Bed deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete bed", description: error.message, variant: "destructive" });
    },
  });

  return { createBed, updateBed, deleteBed };
};

export const WARD_TYPES = [
  { value: "general", label: "General" },
  { value: "icu", label: "ICU" },
  { value: "emergency", label: "Emergency" },
  { value: "maternity", label: "Maternity" },
  { value: "pediatric", label: "Pediatric" },
  { value: "private", label: "Private" },
] as const;

export const BED_STATUSES = [
  { value: "available", label: "Available", color: "bg-green-500" },
  { value: "occupied", label: "Occupied", color: "bg-red-500" },
  { value: "maintenance", label: "Maintenance", color: "bg-yellow-500" },
  { value: "reserved", label: "Reserved", color: "bg-blue-500" },
] as const;
