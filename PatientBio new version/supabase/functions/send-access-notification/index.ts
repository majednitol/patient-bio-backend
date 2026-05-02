import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushToUser } from "../_shared/push-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  token_id: string;
  user_id: string;
  access_count: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token_id, user_id, access_count }: NotificationRequest = await req.json();

    if (!token_id || !user_id) {
      return new Response(JSON.stringify({ error: "token_id and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Processing access notification for user: ${user_id}, token: ${token_id}`);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("notification_email_enabled, display_name")
      .eq("user_id", user_id)
      .single();

    if (profileError) {
      return new Response(JSON.stringify({ message: "Profile not found, skipping notification" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);
    if (authError || !authUser?.user?.email) {
      return new Response(JSON.stringify({ error: "Could not fetch user email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userEmail = authUser.user.email;
    const userName = profile?.display_name || "there";

    const { data: tokenData } = await supabase.from("access_tokens").select("label, created_at").eq("id", token_id).single();
    const tokenLabel = tokenData?.label || "your shared health data link";

    const results = { email_sent: false, push_sent: false, notification_recorded: false };

    // Push notifications via shared utility
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

    if (vapidPublicKey && vapidPrivateKey) {
      results.push_sent = await sendPushToUser(supabase, user_id, {
        title: "Health Data Accessed",
        body: `Someone viewed "${tokenLabel}" (${access_count} total views)`,
        url: "/dashboard/access-analytics",
      }, vapidPrivateKey, vapidPublicKey);
    }

    // Email notification
    if (profile?.notification_email_enabled !== false) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Patient Bio <notifications@resend.dev>",
            to: [userEmail],
            subject: "Your health data was accessed",
            html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <h1 style="color:#7c3aed;font-size:24px">Hello ${userName}!</h1>
              <p style="color:#555;font-size:16px;line-height:1.6">Someone just viewed your shared health data through the link: <strong>${tokenLabel}</strong></p>
              <p style="color:#555;font-size:16px;line-height:1.6">This link has now been accessed <strong>${access_count} time${access_count !== 1 ? "s" : ""}</strong>.</p>
              <div style="background:#f5f5f5;padding:15px;border-radius:8px;margin:20px 0">
                <p style="color:#666;font-size:14px;margin:0">If you didn't expect this access, you can revoke this link from your dashboard at any time.</p>
              </div>
              <p style="color:#888;font-size:12px">You can disable these notifications in your Profile settings.</p>
            </div>`,
          }),
        });
        if (emailResponse.ok) results.email_sent = true;
        else console.error("Failed to send email:", await emailResponse.text());
      }
    }

    // Record notification
    const { error: insertError } = await supabase.from("access_notifications").insert({
      user_id, token_id, notification_type: "link_accessed",
      email_sent_to: results.email_sent ? userEmail : null, access_count_at_notification: access_count,
    });
    if (!insertError) results.notification_recorded = true;

    // In-app notification
    await supabase.from("notifications").insert({
      user_id, type: "data_access", title: "Health Data Accessed",
      message: `Someone viewed "${tokenLabel}" (${access_count} total views)`,
      metadata: { token_id, access_count },
    });

    return new Response(JSON.stringify({ message: "Notification processed", ...results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error processing notification:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
