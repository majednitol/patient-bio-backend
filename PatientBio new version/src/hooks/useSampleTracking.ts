import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface SampleTrackingEvent {
  id: string;
  order_id: string;
  event_type: string;
  notes: string | null;
  performed_by: string | null;
  performer_name: string | null;
  created_at: string;
}

export function useSampleTracking(orderId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch tracking events for a specific order
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["sample-tracking-events", orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await supabase
        .from("sample_tracking_events")
        .select("id, order_id, event_type, notes, performed_by, created_at, performer:user_profiles!sample_tracking_events_performed_by_fkey(display_name)")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data as unknown as Array<any>).map(e => ({
        ...e,
        performer_name: e.performer?.display_name || null,
      })) as SampleTrackingEvent[];
    },
    enabled: !!orderId && !!user?.id,
  });

  // Add tracking event
  const addTrackingEvent = useMutation({
    mutationFn: async ({
      orderId,
      eventType,
      notes,
    }: {
      orderId: string;
      eventType: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from("sample_tracking_events")
        .insert({
          order_id: orderId,
          event_type: eventType,
          notes,
          performed_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sample-tracking-events"] });
      queryClient.invalidateQueries({ queryKey: ["pathologist-lab-orders"] });
    },
    onError: (error) => {
      toast.error("Failed to log tracking event: " + error.message);
    },
  });

  // Generate barcode for an order
  const generateBarcode = useMutation({
    mutationFn: async (orderId: string) => {
      // Call database function to generate barcode
      const { data: barcode, error: barcodeError } = await supabase
        .rpc("generate_sample_barcode");

      if (barcodeError) throw barcodeError;

      // Update the order with the barcode
      const { error: updateError } = await supabase
        .from("hospital_lab_orders")
        .update({ sample_barcode: barcode })
        .eq("id", orderId);

      if (updateError) throw updateError;

      return barcode as string;
    },
    onSuccess: (barcode) => {
      queryClient.invalidateQueries({ queryKey: ["pathologist-lab-orders"] });
      toast.success(`Barcode generated: ${barcode}`);
    },
    onError: (error) => {
      toast.error("Failed to generate barcode: " + error.message);
    },
  });

  // Mark sample as received
  const markSampleReceived = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes?: string }) => {
      // Update order with received timestamp
      const { error: updateError } = await supabase
        .from("hospital_lab_orders")
        .update({ received_at: new Date().toISOString() })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Add tracking event
      const { error: eventError } = await supabase
        .from("sample_tracking_events")
        .insert({
          order_id: orderId,
          event_type: "received",
          notes,
          performed_by: user?.id,
        });

      if (eventError) throw eventError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pathologist-lab-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sample-tracking-events"] });
      toast.success("Sample marked as received");
    },
    onError: (error) => {
      toast.error("Failed to mark sample received: " + error.message);
    },
  });

  // Start processing
  const startProcessing = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes?: string }) => {
      const { error: updateError } = await supabase
        .from("hospital_lab_orders")
        .update({ 
          processing_started_at: new Date().toISOString(),
          status: "processing"
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      const { error: eventError } = await supabase
        .from("sample_tracking_events")
        .insert({
          order_id: orderId,
          event_type: "processing_started",
          notes,
          performed_by: user?.id,
        });

      if (eventError) throw eventError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pathologist-lab-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sample-tracking-events"] });
      toast.success("Processing started");
    },
    onError: (error) => {
      toast.error("Failed to start processing: " + error.message);
    },
  });

  // Mark QC passed
  const markQCPassed = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes?: string }) => {
      const { error: updateError } = await supabase
        .from("hospital_lab_orders")
        .update({ quality_checked_at: new Date().toISOString() })
        .eq("id", orderId);

      if (updateError) throw updateError;

      const { error: eventError } = await supabase
        .from("sample_tracking_events")
        .insert({
          order_id: orderId,
          event_type: "qc_passed",
          notes,
          performed_by: user?.id,
        });

      if (eventError) throw eventError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pathologist-lab-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sample-tracking-events"] });
      toast.success("Quality check passed");
    },
    onError: (error) => {
      toast.error("Failed to mark QC passed: " + error.message);
    },
  });

  // Search by barcode
  const searchByBarcode = async (barcode: string) => {
    const { data, error } = await supabase
      .from("hospital_lab_orders")
      .select(`
        *,
        patient_profile:user_profiles!hospital_lab_orders_patient_id_fkey(display_name, patient_passport_id),
        hospital:hospitals!hospital_lab_orders_hospital_id_fkey(name, logo_url)
      `)
      .eq("sample_barcode", barcode)
      .eq("pathologist_id", user?.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw error;
    }
    return data as unknown;
  };

  // Reject sample
  const rejectSample = useMutation({
    mutationFn: async ({
      orderId,
      reason,
      notes,
    }: {
      orderId: string;
      reason: string;
      notes?: string;
    }) => {
      const { error: updateError } = await supabase
        .from("hospital_lab_orders")
        .update({
          status: "rejected" as any,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          rejected_by: user?.id,
        } as any)
        .eq("id", orderId);

      if (updateError) throw updateError;

      const { error: eventError } = await supabase
        .from("sample_tracking_events")
        .insert({
          order_id: orderId,
          event_type: "rejected",
          notes: `Reason: ${reason}${notes ? `. ${notes}` : ""}`,
          performed_by: user?.id,
        });

      if (eventError) throw eventError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pathologist-lab-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sample-tracking-events"] });
      toast.success("Sample rejected");
    },
    onError: (error) => {
      toast.error("Failed to reject sample: " + error.message);
    },
  });

  return {
    events: events || [],
    eventsLoading,
    addTrackingEvent,
    generateBarcode,
    markSampleReceived,
    startProcessing,
    markQCPassed,
    rejectSample,
    searchByBarcode,
  };
}
