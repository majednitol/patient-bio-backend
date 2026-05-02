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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, redirectTo } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating verification link for ${email}`);

    // Use signup type to generate proper email confirmation link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email,
      options: {
        redirectTo: redirectTo || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/verify-email`,
      },
    });

    if (linkError) {
      console.error("Failed to generate link:", linkError);
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract token_hash and type from the action link
    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      return new Response(
        JSON.stringify({ error: "Failed to generate verification link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the action link to extract token_hash - it may be in query params or hash fragment
    const url = new URL(actionLink);
    const token_hash =
      url.searchParams.get("token_hash") ||
      url.searchParams.get("token") ||
      url.hash?.match(/token_hash=([^&]+)/)?.[1] ||
      url.hash?.match(/token=([^&]+)/)?.[1];

    if (!token_hash) {
      console.error("Could not extract token from action link:", actionLink);
      return new Response(
        JSON.stringify({ error: "Failed to extract verification token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the redirect URL with type=email to match VerifyEmailPage expectations
    const appRedirectTo = redirectTo || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/verify-email`;
    const verificationUrl = `${appRedirectTo}?token_hash=${token_hash}&type=email`;

    console.log(`Sending verification email to ${email}`);

    // Send email via Resend
    // TODO: Configure a verified domain for production and update 'from' address
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "PatientBio <onboarding@resend.dev>",
        to: [email],
        subject: "Verify your email - PatientBio",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
              <div style="background: linear-gradient(135deg, #0ea5e9, #6366f1); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">PatientBio</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Your Health, Your Data</p>
              </div>
              <div style="padding: 32px;">
                <h2 style="margin: 0 0 16px; font-size: 20px; color: #18181b;">Verify your email address</h2>
                <p style="color: #52525b; line-height: 1.6; margin: 0 0 24px;">
                  Thank you for creating an account! Please click the button below to verify your email address and get started.
                </p>
                <a href="${verificationUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #6366f1); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
                  Verify Email Address
                </a>
                <p style="color: #a1a1aa; font-size: 13px; line-height: 1.5; margin: 24px 0 0;">
                  If you didn't create an account, you can safely ignore this email. This link expires in 24 hours.
                </p>
              </div>
              <div style="padding: 16px 32px; background: #f4f4f5; text-align: center;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} PatientBio. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      // Return 422 for domain/validation errors so the client falls back to built-in email
      const status = emailResponse.status === 403 ? 422 : 500;
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${errorText}`, fallback: status === 422 }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResult = await emailResponse.json();
    console.log("Verification email sent successfully:", emailResult.id);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-verification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
