import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface LabOrderTest {
  name: string;
  code?: string;
  price: number;
}

export interface LabOrder {
  id: string;
  hospital_id: string;
  admission_id: string | null;
  patient_id: string;
  pathologist_id: string;
  ordered_by: string;
  is_internal_lab: boolean;
  consent_status: "pending" | "approved" | "rejected";
  data_access_request_id: string | null;
  tests: LabOrderTest[];
  clinical_notes: string | null;
  urgency: "routine" | "urgent" | "stat";
  status: "pending_consent" | "ordered" | "sample_collected" | "processing" | "completed" | "cancelled";
  sample_collected_at: string | null;
  sample_collected_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  patient_profile?: {
    display_name: string | null;
    patient_passport_id: string | null;
  };
  pathologist_profile?: {
    full_name: string;
    lab_name: string | null;
  };
  ordered_by_profile?: {
    full_name?: string;
    display_name?: string;
  };
  admission?: {
    bed: {
      bed_number: string;
      ward: { name: string };
    } | null;
  };
}

export interface CreateLabOrderInput {
  admission_id?: string;
  patient_id: string;
  pathologist_id: string;
  is_internal_lab: boolean;
  tests: LabOrderTest[];
  clinical_notes?: string;
  urgency?: "routine" | "urgent" | "stat";
}

export function useHospitalLabOrders(hospitalId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["hospital-lab-orders", hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_lab_orders")
        .select(`
          *,
          patient_profile:user_profiles!hospital_lab_orders_patient_id_fkey(display_name, patient_passport_id),
          pathologist_profile:pathologist_profiles!hospital_lab_orders_pathologist_id_fkey(full_name, lab_name),
          ordered_by_profile:user_profiles!hospital_lab_orders_ordered_by_fkey(display_name),
          admission:admissions(
            bed:beds(
              bed_number,
              ward:wards(name)
            )
          )
        `)
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as LabOrder[];
    },
    enabled: !!hospitalId,
  });

  const createLabOrder = useMutation({
    mutationFn: async (input: CreateLabOrderInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Determine initial status based on internal/external lab
      const initialStatus = input.is_internal_lab ? "ordered" : "pending_consent";
      const initialConsentStatus = input.is_internal_lab ? "approved" : "pending";

      // If external lab, create a data access request first
      let dataAccessRequestId: string | null = null;
      if (!input.is_internal_lab) {
        // Get hospital name for the request reason
        const { data: hospital } = await supabase
          .from("hospitals")
          .select("name")
          .eq("id", hospitalId)
          .single();

        const { data: request, error: requestError } = await supabase
          .from("data_access_requests")
          .insert({
            patient_id: input.patient_id,
            requester_id: user.id,
            requester_type: "hospital_lab",
            reason: `Lab test order from ${hospital?.name || "Hospital"}: ${input.tests.map(t => t.name).join(", ")}`,
          })
          .select()
          .single();

        if (requestError) throw requestError;
        dataAccessRequestId = request.id;
      }

      const { data, error } = await supabase
        .from("hospital_lab_orders")
        .insert([{
          hospital_id: hospitalId,
          admission_id: input.admission_id || null,
          patient_id: input.patient_id,
          pathologist_id: input.pathologist_id,
          ordered_by: user.id,
          is_internal_lab: input.is_internal_lab,
          consent_status: initialConsentStatus,
          data_access_request_id: dataAccessRequestId,
          tests: JSON.parse(JSON.stringify(input.tests)),
          clinical_notes: input.clinical_notes || null,
          urgency: input.urgency || "routine",
          status: initialStatus,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hospital-lab-orders", hospitalId] });
      if (data.is_internal_lab) {
        toast.success("Lab order created successfully");
      } else {
        toast.success("Lab order created - awaiting patient consent");
      }
    },
    onError: (error) => {
      toast.error("Failed to create lab order: " + error.message);
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({
      orderId,
      status,
      sample_collected_by,
    }: {
      orderId: string;
      status: LabOrder["status"];
      sample_collected_by?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (status === "sample_collected") {
        updateData.sample_collected_at = new Date().toISOString();
        updateData.sample_collected_by = sample_collected_by || user?.id;
      } else if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("hospital_lab_orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospital-lab-orders", hospitalId] });
      toast.success("Order status updated");
    },
    onError: (error) => {
      toast.error("Failed to update order: " + error.message);
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("hospital_lab_orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospital-lab-orders", hospitalId] });
      toast.success("Order cancelled");
    },
    onError: (error) => {
      toast.error("Failed to cancel order: " + error.message);
    },
  });

  return {
    orders: orders || [],
    isLoading,
    createLabOrder,
    updateOrderStatus,
    cancelOrder,
  };
}

export function useAdmissionLabOrders(admissionId: string | null) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admission-lab-orders", admissionId],
    queryFn: async () => {
      if (!admissionId) return [];
      
      const { data, error } = await supabase
        .from("hospital_lab_orders")
        .select(`
          *,
          pathologist_profile:pathologist_profiles!hospital_lab_orders_pathologist_id_fkey(full_name, lab_name)
        `)
        .eq("admission_id", admissionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as LabOrder[];
    },
    enabled: !!admissionId,
  });

  return { orders: orders || [], isLoading };
}

// Hook to check if an order has results
export function useLabOrderResults(orderId: string | null) {
  const { data: result, isLoading } = useQuery({
    queryKey: ["lab-order-results", orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from("hospital_lab_results")
        .select(`
          *,
          pathologist_report:pathologist_reports(
            id,
            report_name,
            file_url,
            created_at
          )
        `)
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  return { result, isLoading };
}
