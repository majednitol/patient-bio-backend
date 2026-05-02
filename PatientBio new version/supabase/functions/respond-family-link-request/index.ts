import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { request_id, action } = await req.json();

    if (!request_id || !action || !["approve", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "request_id and action (approve/reject) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: linkRequest, error: fetchError } = await supabase
      .from("family_link_requests")
      .select("id, requester_id, target_patient_id, relationship, can_manage_records, can_share_data, status")
      .eq("id", request_id)
      .single();

    if (fetchError || !linkRequest) {
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (linkRequest.target_patient_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You are not authorized to respond to this request" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (linkRequest.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "This request has already been responded to" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update request status
    const { error: updateError } = await supabase
      .from("family_link_requests")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        responded_at: new Date().toISOString(),
      })
      .eq("id", request_id);

    if (updateError) {
      console.error("Error updating request:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get patient name for notification
    const { data: patientProfile } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    const patientName = patientProfile?.display_name || "A patient";

    if (action === "approve") {
      // Create the family_members row
      const { error: familyError } = await supabase
        .from("family_members")
        .insert({
          account_holder_id: linkRequest.requester_id,
          patient_id: linkRequest.target_patient_id,
          relationship: linkRequest.relationship,
          is_primary: false,
          can_manage_records: linkRequest.can_manage_records,
          can_share_data: linkRequest.can_share_data,
        });

      if (familyError) {
        console.error("Error creating family member:", familyError);
        return new Response(
          JSON.stringify({ error: "Failed to create family link" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Notify requester of approval
      await supabase.from("notifications").insert({
        user_id: linkRequest.requester_id,
        type: "family_link_approved",
        title: "Family Link Approved",
        message: `${patientName} approved your request to manage their health records.`,
        metadata: { request_id: linkRequest.id, patient_id: linkRequest.target_patient_id },
      });
    } else {
      // Notify requester of rejection
      await supabase.from("notifications").insert({
        user_id: linkRequest.requester_id,
        type: "family_link_rejected",
        title: "Family Link Declined",
        message: `${patientName} declined your request to manage their health records.`,
        metadata: { request_id: linkRequest.id, patient_id: linkRequest.target_patient_id },
      });
    }

    return new Response(
      JSON.stringify({ success: true, status: action === "approve" ? "approved" : "rejected" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in respond-family-link-request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
