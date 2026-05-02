import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface FHIRSubscription {
  id: string;
  user_id: string;
  subscriber_name: string;
  endpoint_url: string;
  topic: string;
  filter_criteria: Record<string, unknown>;
  status: string;
  secret: string | null;
  headers: Record<string, string>;
  retry_policy: Record<string, unknown>;
  last_triggered_at: string | null;
  last_error: string | null;
  error_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface CreateSubscriptionParams {
  subscriberName: string;
  endpointUrl: string;
  topic: string;
  filterCriteria?: Record<string, unknown>;
  secret?: string;
  headers?: Record<string, string>;
  expiresAt?: string;
}

export const SUBSCRIPTION_TOPICS = [
  { value: "*", label: "All Resources" },
  { value: "Patient", label: "Patient Demographics" },
  { value: "Observation", label: "Observations (Vitals, Labs)" },
  { value: "Condition", label: "Conditions & Diagnoses" },
  { value: "MedicationStatement", label: "Medications" },
  { value: "AllergyIntolerance", label: "Allergies" },
  { value: "DocumentReference", label: "Documents" },
];

/**
 * Hook for fetching all subscriptions
 */
export function useFHIRSubscriptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["fhir-subscriptions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fhir_subscriptions")
        .select("id, user_id, subscriber_name, endpoint_url, topic, filter_criteria, status, secret, headers, retry_policy, last_triggered_at, last_error, error_count, created_at, updated_at, expires_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FHIRSubscription[];
    },
    enabled: !!user,
  });
}

/**
 * Hook for fetching a single subscription
 */
export function useFHIRSubscription(subscriptionId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["fhir-subscriptions", subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return null;

      const { data, error } = await supabase
        .from("fhir_subscriptions")
        .select("id, user_id, subscriber_name, endpoint_url, topic, filter_criteria, status, secret, headers, retry_policy, last_triggered_at, last_error, error_count, created_at, updated_at, expires_at")
        .eq("id", subscriptionId)
        .single();

      if (error) throw error;
      return data as FHIRSubscription;
    },
    enabled: !!user && !!subscriptionId,
  });
}

/**
 * Hook for creating a new subscription
 */
export function useCreateFHIRSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateSubscriptionParams) => {
      if (!user) throw new Error("User not authenticated");

      const insertData = {
        user_id: user.id,
        subscriber_name: params.subscriberName,
        endpoint_url: params.endpointUrl,
        topic: params.topic,
        filter_criteria: (params.filterCriteria || {}) as Json,
        secret: params.secret || null,
        headers: (params.headers || {}) as Json,
        expires_at: params.expiresAt || null,
      };

      const { data, error } = await supabase
        .from("fhir_subscriptions")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as FHIRSubscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fhir-subscriptions"] });
      toast({ title: "Subscription created successfully" });
    },
    onError: (error) => {
      console.error("Failed to create subscription:", error);
      toast({ title: "Failed to create subscription", variant: "destructive" });
    },
  });
}

/**
 * Hook for updating a subscription
 */
export function useUpdateFHIRSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FHIRSubscription> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.subscriber_name) updateData.subscriber_name = updates.subscriber_name;
      if (updates.endpoint_url) updateData.endpoint_url = updates.endpoint_url;
      if (updates.status) updateData.status = updates.status;
      if (updates.filter_criteria) updateData.filter_criteria = updates.filter_criteria as Json;
      if (updates.headers) updateData.headers = updates.headers as Json;
      if (updates.expires_at !== undefined) updateData.expires_at = updates.expires_at;

      const { data, error } = await supabase
        .from("fhir_subscriptions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FHIRSubscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fhir-subscriptions"] });
      toast({ title: "Subscription updated" });
    },
    onError: (error) => {
      console.error("Failed to update subscription:", error);
      toast({ title: "Failed to update subscription", variant: "destructive" });
    },
  });
}

/**
 * Hook for deleting a subscription
 */
export function useDeleteFHIRSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from("fhir_subscriptions")
        .delete()
        .eq("id", subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fhir-subscriptions"] });
      toast({ title: "Subscription deleted" });
    },
    onError: (error) => {
      console.error("Failed to delete subscription:", error);
      toast({ title: "Failed to delete subscription", variant: "destructive" });
    },
  });
}

/**
 * Hook for pausing/resuming a subscription
 */
export function useToggleSubscriptionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "paused" }) => {
      const { data, error } = await supabase
        .from("fhir_subscriptions")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FHIRSubscription;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fhir-subscriptions"] });
      toast({ title: `Subscription ${data.status === "active" ? "resumed" : "paused"}` });
    },
    onError: (error) => {
      console.error("Failed to toggle subscription:", error);
      toast({ title: "Failed to update subscription status", variant: "destructive" });
    },
  });
}

/**
 * Hook for testing a subscription webhook
 */
export function useTestFHIRSubscription() {
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("fhir-subscription", {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Use query params for the test action
      const testResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fhir-subscription?action=test&id=${subscriptionId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!testResponse.ok) {
        const error = await testResponse.json();
        throw new Error(error.error || "Test failed");
      }

      return testResponse.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Test notification sent successfully" });
      } else {
        toast({
          title: "Test notification failed",
          description: `HTTP ${data.status}`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error("Failed to test subscription:", error);
      toast({ title: "Failed to send test notification", variant: "destructive" });
    },
  });
}

/**
 * Hook for fetching subscription notifications
 */
export function useSubscriptionNotifications(subscriptionId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["fhir-subscription-notifications", subscriptionId],
    queryFn: async () => {
      let query = supabase
        .from("fhir_subscription_notifications")
        .select("id, subscription_id, event_type, resource_type, resource_id, payload, delivery_status, http_status, error_message, attempt_count, created_at, delivered_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (subscriptionId) {
        query = query.eq("subscription_id", subscriptionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
