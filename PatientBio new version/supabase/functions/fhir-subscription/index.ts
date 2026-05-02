import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FHIRSubscription {
  id: string;
  user_id: string;
  subscriber_name: string;
  endpoint_url: string;
  topic: string;
  filter_criteria: Record<string, unknown>;
  status: string;
  secret: string | null;
  headers: Record<string, string>;
}

interface WebhookPayload {
  subscriptionId: string;
  eventType: "create" | "update" | "delete";
  resourceType: string;
  resourceId: string;
  timestamp: string;
  resource?: unknown;
}

// Generate HMAC signature for webhook verification
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Send webhook notification
async function sendWebhook(
  supabase: any,
  subscription: FHIRSubscription,
  payload: WebhookPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  const payloadString = JSON.stringify(payload);
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Subscription-Id": subscription.id,
    "X-Event-Type": payload.eventType,
    "X-Resource-Type": payload.resourceType,
    ...(subscription.headers || {}),
  };

  if (subscription.secret) {
    headers["X-Hub-Signature-256"] = `sha256=${await generateSignature(payloadString, subscription.secret)}`;
  }

  try {
    const response = await fetch(subscription.endpoint_url, {
      method: "POST",
      headers,
      body: payloadString,
    });

    // Log the notification
    await supabase.from("fhir_subscription_notifications").insert({
      subscription_id: subscription.id,
      event_type: payload.eventType,
      resource_type: payload.resourceType,
      resource_id: payload.resourceId,
      payload,
      status: response.ok ? "sent" : "failed",
      response_status: response.status,
      response_body: await response.text().catch(() => null),
      attempt_count: 1,
      sent_at: new Date().toISOString(),
    });

    // Update subscription last triggered time
    await supabase
      .from("fhir_subscriptions")
      .update({
        last_triggered_at: new Date().toISOString(),
        last_error: response.ok ? null : `HTTP ${response.status}`,
        error_count: response.ok ? 0 : subscription.error_count + 1,
      })
      .eq("id", subscription.id);

    return { success: response.ok, status: response.status };
  } catch (error: any) {
    // Log failed notification
    await supabase.from("fhir_subscription_notifications").insert({
      subscription_id: subscription.id,
      event_type: payload.eventType,
      resource_type: payload.resourceType,
      resource_id: payload.resourceId,
      payload,
      status: "failed",
      response_body: error.message,
      attempt_count: 1,
    });

    await supabase
      .from("fhir_subscriptions")
      .update({
        last_error: error.message,
        error_count: subscription.error_count + 1,
      })
      .eq("id", subscription.id);

    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authHeader = req.headers.get("Authorization");

    // Trigger webhooks (internal use - called by database triggers or scheduled jobs)
    if (action === "trigger") {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { eventType, resourceType, resourceId, userId, resource } = await req.json();

      if (!eventType || !resourceType || !resourceId || !userId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find matching subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from("fhir_subscriptions")
        .select("id, user_id, subscriber_name, endpoint_url, topic, filter_criteria, status, secret, headers, error_count")
        .eq("user_id", userId)
        .eq("status", "active")
        .or(`topic.eq.${resourceType},topic.eq.*`);

      if (subError) {
        console.error("Error fetching subscriptions:", subError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch subscriptions" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const subscription of subscriptions || []) {
        const payload: WebhookPayload = {
          subscriptionId: subscription.id,
          eventType,
          resourceType,
          resourceId,
          timestamp: new Date().toISOString(),
          resource,
        };

        const result = await sendWebhook(supabase, subscription, payload);
        results.push({ subscriptionId: subscription.id, ...result });
      }

      return new Response(
        JSON.stringify({ triggered: results.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User-authenticated operations
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // List subscriptions
    if (req.method === "GET" && !action) {
      const { data: subscriptions, error } = await supabase
        .from("fhir_subscriptions")
        .select("id, user_id, subscriber_name, endpoint_url, topic, filter_criteria, status, secret, headers, error_count, last_triggered_at, last_error, expires_at, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(subscriptions), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" },
      });
    }

    // Create subscription
    if (req.method === "POST" && !action) {
      const body = await req.json();
      const { subscriberName, endpointUrl, topic, filterCriteria, secret, headers, expiresAt } = body;

      if (!subscriberName || !endpointUrl || !topic) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: subscriberName, endpointUrl, topic" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: subscription, error } = await supabase
        .from("fhir_subscriptions")
        .insert({
          user_id: user.id,
          subscriber_name: subscriberName,
          endpoint_url: endpointUrl,
          topic,
          filter_criteria: filterCriteria || {},
          secret: secret || null,
          headers: headers || {},
          expires_at: expiresAt || null,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(subscription), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update subscription
    if (req.method === "PATCH") {
      const subscriptionId = url.searchParams.get("id");
      if (!subscriptionId) {
        return new Response(
          JSON.stringify({ error: "Missing subscription id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const updates: Record<string, unknown> = {};

      if (body.status !== undefined) updates.status = body.status;
      if (body.endpointUrl !== undefined) updates.endpoint_url = body.endpointUrl;
      if (body.filterCriteria !== undefined) updates.filter_criteria = body.filterCriteria;
      if (body.headers !== undefined) updates.headers = body.headers;
      if (body.secret !== undefined) updates.secret = body.secret;
      if (body.expiresAt !== undefined) updates.expires_at = body.expiresAt;

      const { data: subscription, error } = await supabase
        .from("fhir_subscriptions")
        .update(updates)
        .eq("id", subscriptionId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(subscription), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete subscription
    if (req.method === "DELETE") {
      const subscriptionId = url.searchParams.get("id");
      if (!subscriptionId) {
        return new Response(
          JSON.stringify({ error: "Missing subscription id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("fhir_subscriptions")
        .delete()
        .eq("id", subscriptionId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get notification history
    if (req.method === "GET" && action === "notifications") {
      const subscriptionId = url.searchParams.get("id");
      
      let query = supabase
        .from("fhir_subscription_notifications")
        .select("*, fhir_subscriptions!inner(user_id)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (subscriptionId) {
        query = query.eq("subscription_id", subscriptionId);
      }

      const { data: notifications, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify(notifications), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=30" },
      });
    }

    // Test subscription (send a test notification)
    if (req.method === "POST" && action === "test") {
      const subscriptionId = url.searchParams.get("id");
      if (!subscriptionId) {
        return new Response(
          JSON.stringify({ error: "Missing subscription id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: subscription, error: subError } = await supabase
        .from("fhir_subscriptions")
        .select("id, user_id, subscriber_name, endpoint_url, topic, filter_criteria, status, secret, headers, error_count")
        .eq("id", subscriptionId)
        .single();

      if (subError || !subscription) {
        return new Response(
          JSON.stringify({ error: "Subscription not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const testPayload: WebhookPayload = {
        subscriptionId: subscription.id,
        eventType: "create",
        resourceType: "Test",
        resourceId: "test-" + Date.now(),
        timestamp: new Date().toISOString(),
        resource: {
          resourceType: "OperationOutcome",
          issue: [{
            severity: "information",
            code: "informational",
            diagnostics: "This is a test notification from PatientBio FHIR Subscriptions",
          }],
        },
      };

      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
      const result = await sendWebhook(serviceSupabase, subscription, testPayload);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action or method" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("FHIR subscription error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
