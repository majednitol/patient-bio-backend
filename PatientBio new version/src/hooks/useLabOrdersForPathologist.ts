import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { LabOrder, LabOrderTest } from "./useHospitalLabOrders";

export interface IncomingLabOrder extends LabOrder {
  hospital?: {
    name: string;
    logo_url: string | null;
  };
  sample_barcode?: string | null;
  received_at?: string | null;
  processing_started_at?: string | null;
  quality_checked_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  rejected_by?: string | null;
}

export function useLabOrdersForPathologist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["pathologist-lab-orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        const { data, error } = await supabase
          .from("hospital_lab_orders")
          .select(`
            *,
            patient_profile:user_profiles!hospital_lab_orders_patient_id_fkey(display_name, patient_passport_id),
            hospital:hospitals!hospital_lab_orders_hospital_id_fkey(name, logo_url),
            admission:admissions(
              bed:beds(
                bed_number,
                ward:wards(name)
              )
            )
          `)
          .eq("pathologist_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) throw error;
        
        // Filter: active orders + completed orders from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        return (data as unknown as IncomingLabOrder[]).filter(o => {
          if (o.status !== "completed") return true;
          return new Date(o.completed_at || o.created_at) >= thirtyDaysAgo;
        });
      } catch (err) {
        console.warn("Join query failed, falling back to basic query:", err);
        const { data, error } = await supabase
          .from("hospital_lab_orders")
            .select("id, hospital_id, patient_id, pathologist_id, admission_id, status, priority, clinical_notes, created_at, completed_at, sample_barcode, received_at, processing_started_at, quality_checked_at")
          .eq("pathologist_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) throw error;
        const thirtyDaysAgoFb = new Date();
        thirtyDaysAgoFb.setDate(thirtyDaysAgoFb.getDate() - 30);
        return (data as unknown as IncomingLabOrder[]).filter(o => {
          if (o.status !== "completed") return true;
          return new Date(o.completed_at || o.created_at) >= thirtyDaysAgoFb;
        });
      }
    },
    enabled: !!user?.id,
    retry: 1,
  });

  const pendingCount = orders?.filter(o => o.status === "ordered" || o.status === "sample_collected").length || 0;

  const updateOrderStatus = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: LabOrder["status"];
    }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("hospital_lab_orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pathologist-lab-orders"] });
      toast.success("Order status updated");
    },
    onError: (error) => {
      toast.error("Failed to update order: " + error.message);
    },
  });

  const completeOrder = useMutation({
    mutationFn: async ({
      orderId,
      reportId,
      patientId,
    }: {
      orderId: string;
      reportId: string;
      patientId: string;
    }) => {
      // Get report details for auto-creating health record
      const { data: report, error: reportError } = await supabase
        .from("pathologist_reports")
        .select("id, report_name, report_type, disease_category, findings, file_url, has_abnormal_values, abnormal_flags, created_at, patient_id, pathologist_id")
        .eq("id", reportId)
        .single();

      if (reportError) throw reportError;

      // Create health record for patient
      let healthRecordId: string | null = null;
      if (report?.file_url) {
        const { data: healthRecord, error: healthRecordError } = await supabase
          .from("health_records")
          .insert([{
            user_id: patientId,
            title: report.report_name || "Lab Report",
            category: "lab_result" as const,
            file_url: report.file_url,
            disease_category: (report.disease_category as "cancer" | "covid19" | "diabetes" | "general" | "heart_disease" | "other") || "general",
            provider_name: report.pathologist_id,
            record_date: new Date().toISOString().split("T")[0],
          }])
          .select()
          .single();

        if (!healthRecordError && healthRecord) {
          healthRecordId = healthRecord.id;
        }
      }

      // Create lab result record
      const { error: resultError } = await supabase
        .from("hospital_lab_results")
        .insert({
          order_id: orderId,
          pathologist_report_id: reportId,
          health_record_id: healthRecordId,
        });

      if (resultError) throw resultError;

      // Update order status to completed
      const { error: orderError } = await supabase
        .from("hospital_lab_orders")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      return { healthRecordId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pathologist-lab-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pathologist-reports"] });
      toast.success("Order completed and results sent to hospital");
    },
    onError: (error) => {
      toast.error("Failed to complete order: " + error.message);
    },
  });

  return {
    orders: orders || [],
    isLoading,
    pendingCount,
    updateOrderStatus,
    completeOrder,
  };
}
