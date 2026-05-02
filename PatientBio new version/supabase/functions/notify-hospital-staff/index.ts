import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotifyRequest {
  hospital_id: string;
  event_type: "admission" | "discharge" | "appointment" | "doctor_application";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  exclude_user_id?: string; // Don't notify the user who triggered the event
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("notify-hospital-staff function called");

    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: NotifyRequest = await req.json();
    console.log("Request body:", JSON.stringify(body));

    const { hospital_id, event_type, title, message, metadata, exclude_user_id } = body;

    if (!hospital_id || !event_type || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get all active staff members for this hospital
    console.log("Fetching staff for hospital:", hospital_id);
    const { data: staffList, error: staffError } = await supabase
      .from("hospital_staff")
      .select("user_id")
      .eq("hospital_id", hospital_id)
      .eq("is_active", true);

    if (staffError) {
      console.error("Error fetching staff:", staffError);
      throw staffError;
    }

    if (!staffList || staffList.length === 0) {
      console.log("No staff found for hospital");
      return new Response(
        JSON.stringify({ success: true, notified_count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${staffList.length} staff members`);

    // Filter out the user who triggered the event (if provided)
    const staffToNotify = exclude_user_id
      ? staffList.filter((s) => s.user_id !== exclude_user_id)
      : staffList;

    console.log(`Notifying ${staffToNotify.length} staff members`);

    // Create notifications for all staff
    const notifications = staffToNotify.map((staff) => ({
      user_id: staff.user_id,
      type: `hospital_${event_type}`,
      title,
      message,
      metadata: {
        ...metadata,
        hospital_id,
        event_type,
      },
      is_read: false,
    }));

    // Insert notifications in batch
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
        throw insertError;
      }

      console.log(`Successfully created ${notifications.length} notifications`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified_count: notifications.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in notify-hospital-staff:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
