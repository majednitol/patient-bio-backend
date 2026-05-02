import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

export interface DepartmentReferral {
  id: string;
  hospital_id: string;
  patient_id: string;
  from_department_id: string;
  to_department_id: string;
  referred_by: string;
  accepted_by: string | null;
  status: "requested" | "accepted" | "in_progress" | "completed" | "cancelled";
  reason: string;
  clinical_notes: string | null;
  urgency: "routine" | "urgent" | "emergency";
  response_notes: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  // Joined
  from_department_name?: string;
  to_department_name?: string;
  patient_name?: string;
  referred_by_name?: string;
  accepted_by_name?: string;
}

export function useDepartmentReferrals(hospitalId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["department-referrals", hospitalId],
    enabled: !!hospitalId,
    queryFn: async (): Promise<DepartmentReferral[]> => {
      const { data, error } = await supabase
        .from("department_referrals")
        .select("id, hospital_id, patient_id, from_department_id, to_department_id, referred_by, accepted_by, status, reason, clinical_notes, urgency, response_notes, created_at, updated_at, accepted_at, completed_at")
        .eq("hospital_id", hospitalId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch department names
      const deptIds = [...new Set([
        ...data.map((r) => r.from_department_id),
        ...data.map((r) => r.to_department_id),
      ])];
      const patientIds = [...new Set(data.map((r) => r.patient_id))];
      const staffIds = [...new Set([
        ...data.map((r) => r.referred_by),
        ...data.filter((r) => r.accepted_by).map((r) => r.accepted_by!),
      ])];

      const [deptsRes, patientsRes, staffRes] = await Promise.all([
        supabase.from("hospital_departments").select("id, name").in("id", deptIds),
        supabase.from("user_profiles").select("id, display_name").in("id", patientIds),
        supabase.from("user_profiles").select("id, display_name").in("id", staffIds),
      ]);

      const deptMap = new Map(deptsRes.data?.map((d) => [d.id, d.name]) || []);
      const patientMap = new Map(patientsRes.data?.map((p) => [p.id, p.display_name]) || []);
      const staffMap = new Map(staffRes.data?.map((s) => [s.id, s.display_name]) || []);

      return data.map((r) => ({
        ...r,
        status: r.status as DepartmentReferral["status"],
        urgency: r.urgency as DepartmentReferral["urgency"],
        from_department_name: deptMap.get(r.from_department_id) || "Unknown",
        to_department_name: deptMap.get(r.to_department_id) || "Unknown",
        patient_name: patientMap.get(r.patient_id) || "Unknown",
        referred_by_name: staffMap.get(r.referred_by) || "Unknown",
        accepted_by_name: r.accepted_by ? staffMap.get(r.accepted_by) || "Unknown" : null,
      }));
    },
  });

  // Realtime
  useEffect(() => {
    if (!hospitalId) return;
    const channel = supabase
      .channel(`dept-referrals-${hospitalId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "department_referrals",
        filter: `hospital_id=eq.${hospitalId}`,
      }, () => queryClient.invalidateQueries({ queryKey: ["department-referrals", hospitalId] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hospitalId, queryClient]);

  const createReferral = useMutation({
    mutationFn: async (params: {
      hospital_id: string;
      patient_id: string;
      from_department_id: string;
      to_department_id: string;
      referred_by: string;
      reason: string;
      clinical_notes?: string;
      urgency: string;
    }) => {
      const { error } = await supabase.from("department_referrals").insert(params);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-referrals", hospitalId] });
      toast({ title: "Referral created" });
    },
    onError: (err) => toast({ title: "Failed to create referral", description: err.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, userId, notes }: { id: string; status: string; userId: string; notes?: string }) => {
      const updates: Record<string, any> = { status };
      if (status === "accepted") {
        updates.accepted_by = userId;
        updates.accepted_at = new Date().toISOString();
      }
      if (status === "completed") {
        updates.completed_at = new Date().toISOString();
      }
      if (notes) {
        updates.response_notes = notes;
      }
      const { error } = await supabase.from("department_referrals").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-referrals", hospitalId] });
      toast({ title: "Referral updated" });
    },
    onError: (err) => toast({ title: "Failed to update", description: err.message, variant: "destructive" }),
  });

  return { ...query, createReferral, updateStatus };
}
