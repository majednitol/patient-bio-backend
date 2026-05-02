import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StaffInvitationRequest {
  invitationId: string;
  email: string;
  name: string;
  role: string;
  hospitalName: string;
  token: string;
}

const formatRole = (role: string): string => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    const { invitationId, email, name, role, hospitalName, token }: StaffInvitationRequest = await req.json();

    // Validate required fields
    if (!email || !token || !hospitalName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, token, and hospitalName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = name || email.split("@")[0];
    const formattedRole = formatRole(role || "staff");
    
    // Build the invitation URL
    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "").replace("https://", "");
    const invitationUrl = `https://id-preview--ca3d827a-9e84-4c68-a016-c83cb407e544.lovable.app/staff-invitation/${token}`;

    console.log(`Sending staff invitation email to ${email} for ${hospitalName}`);

    const emailResponse = await resend.emails.send({
      from: "Medical Memo Maker <noreply@resend.dev>",
      to: [email],
      subject: `You've been invited to join ${hospitalName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; margin-top: 0;">Hello ${displayName},</p>
            
            <p>You have been invited to join <strong>${hospitalName}</strong> as a <strong>${formattedRole}</strong>.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                ⏰ This invitation will expire in <strong>24 hours</strong>.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              <strong>What happens next?</strong><br>
              Click the button above to accept the invitation. If you don't have an account yet, you'll be able to create one. Once accepted, you'll have access to the ${hospitalName} portal.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            
            <p style="color: #999; font-size: 12px; margin-bottom: 0;">
              If you didn't expect this invitation, you can safely ignore this email.<br>
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${invitationUrl}" style="color: #667eea; word-break: break-all;">${invitationUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Staff invitation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-staff-invitation function:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
