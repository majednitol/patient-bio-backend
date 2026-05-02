import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushToUser } from "../_shared/push-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MessagePushRequest {
  recipient_id: string;
  sender_name: string;
  sender_role: "doctor" | "patient";
  message_preview: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recipient_id, sender_name, sender_role, message_preview }: MessagePushRequest =
      await req.json();

    if (!recipient_id || !sender_name || !message_preview) {
      return new Response(
        JSON.stringify({ error: "recipient_id, sender_name, and message_preview required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[notify-message-push] Sending to ${recipient_id} from ${sender_role}:${sender_name}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check recipient's notification preferences
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("notification_push_enabled, notification_preferences")
      .eq("user_id", recipient_id)
      .maybeSingle();

    if (profile?.notification_push_enabled === false) {
      return new Response(
        JSON.stringify({ push_sent: false, reason: "push_disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ push_sent: false, reason: "vapid_not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const truncatedPreview =
      message_preview.length > 100
        ? message_preview.substring(0, 97) + "..."
        : message_preview;

    const title =
      sender_role === "doctor"
        ? `Dr. ${sender_name} sent a message`
        : `Message from ${sender_name}`;

    const url =
      sender_role === "doctor"
        ? "/dashboard/messages"
        : "/doctor/messages";

    const pushSent = await sendPushToUser(
      supabase,
      recipient_id,
      {
        title,
        body: truncatedPreview,
        icon: "/pwa-192x192.png",
        url,
        data: { type: "doctor_message", sender_role },
        actions: [
          { action: "reply", title: "💬 Reply" },
          { action: "dismiss", title: "Dismiss" },
        ],
      },
      vapidPrivateKey,
      vapidPublicKey
    );

    // Also create in-app notification
    await supabase.from("notifications").insert({
      user_id: recipient_id,
      type: "doctor_message",
      title,
      message: truncatedPreview,
      metadata: { sender_role, sender_name },
    });

    console.log(`[notify-message-push] Result: push_sent=${pushSent}`);

    return new Response(
      JSON.stringify({ push_sent: pushSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[notify-message-push] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
