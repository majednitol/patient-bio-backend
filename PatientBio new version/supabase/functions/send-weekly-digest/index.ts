import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DigestData {
  accessCount: number;
  uniqueProviders: number;
  recentAccessor: string | null;
  recentAccessDate: string | null;
  newRecords: number;
  newReports: number;
  medicationsTaken: number;
  medicationsSkipped: number;
  adherenceRate: number;
  upcomingAppointments: Array<{
    doctor_name: string;
    date: string;
    time: string;
  }>;
}

const getDayName = (day: number): string => {
  const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return days[day] || "Monday";
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating weekly digest for user:", user_id);

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
    if (userError || !userData?.user?.email) {
      console.error("Failed to get user email:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = userData.user.email;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoISO = oneWeekAgo.toISOString();

    // Fetch data in parallel
    const [accessLogsRes, recordsRes, reportsRes, medicationLogsRes, appointmentsRes, profileRes] = await Promise.all([
      // Access logs from last 7 days
      supabase
        .from("access_logs")
        .select("accessor_name, accessed_at")
        .eq("user_id", user_id)
        .gte("accessed_at", oneWeekAgoISO)
        .order("accessed_at", { ascending: false }),
      
      // New records uploaded
      supabase
        .from("health_records")
        .select("id")
        .eq("user_id", user_id)
        .gte("created_at", oneWeekAgoISO),
      
      // New pathologist reports
      supabase
        .from("pathologist_reports")
        .select("id")
        .eq("patient_id", user_id)
        .gte("created_at", oneWeekAgoISO),
      
      // Medication logs
      supabase
        .from("medication_reminder_logs")
        .select("status")
        .eq("user_id", user_id)
        .gte("scheduled_time", oneWeekAgoISO),
      
      // Upcoming appointments (next 7 days)
      supabase
        .from("appointments")
        .select("appointment_date, start_time, doctor_id")
        .eq("patient_id", user_id)
        .eq("status", "scheduled")
        .gte("appointment_date", new Date().toISOString().split("T")[0])
        .order("appointment_date", { ascending: true })
        .limit(5),
      
      // User profile for name
      supabase
        .from("user_profiles")
        .select("display_name")
        .eq("user_id", user_id)
        .single(),
    ]);

    // Process access logs
    const accessLogs = accessLogsRes.data || [];
    const uniqueProviders = new Set(accessLogs.map((l) => l.accessor_name)).size;
    const recentAccess = accessLogs[0];

    // Process medication logs
    const medLogs = medicationLogsRes.data || [];
    const taken = medLogs.filter((l) => l.status === "taken").length;
    const skipped = medLogs.filter((l) => l.status === "skipped").length;
    const total = taken + skipped;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

    // Get doctor names for appointments
    const appointments = appointmentsRes.data || [];
    const doctorIds = [...new Set(appointments.map((a) => a.doctor_id))];
    let doctorNames: Record<string, string> = {};
    
    if (doctorIds.length > 0) {
      const { data: doctors } = await supabase
        .from("doctor_profiles")
        .select("user_id, full_name")
        .in("user_id", doctorIds);
      
      doctorNames = (doctors || []).reduce((acc, d) => {
        acc[d.user_id] = d.full_name;
        return acc;
      }, {} as Record<string, string>);
    }

    const digestData: DigestData = {
      accessCount: accessLogs.length,
      uniqueProviders,
      recentAccessor: recentAccess?.accessor_name || null,
      recentAccessDate: recentAccess ? formatDate(recentAccess.accessed_at) : null,
      newRecords: (recordsRes.data || []).length,
      newReports: (reportsRes.data || []).length,
      medicationsTaken: taken,
      medicationsSkipped: skipped,
      adherenceRate,
      upcomingAppointments: appointments.map((a) => ({
        doctor_name: doctorNames[a.doctor_id] || "Doctor",
        date: formatDate(a.appointment_date),
        time: a.start_time,
      })),
    };

    const userName = profileRes.data?.display_name || "there";

    // Generate email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly PatientBio Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">📊 Weekly Health Summary</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Hi ${userName}, here's your PatientBio update</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              
              <!-- Data Access Section -->
              <div style="margin-bottom: 24px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #6366f1;">
                <h2 style="margin: 0 0 12px; font-size: 16px; color: #1e293b;">🔐 Data Access This Week</h2>
                ${digestData.accessCount > 0 ? `
                  <p style="margin: 0; color: #475569; font-size: 14px;">
                    <strong>${digestData.accessCount}</strong> view${digestData.accessCount !== 1 ? 's' : ''} from <strong>${digestData.uniqueProviders}</strong> provider${digestData.uniqueProviders !== 1 ? 's' : ''}
                  </p>
                  ${digestData.recentAccessor ? `<p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Most recent: ${digestData.recentAccessor} on ${digestData.recentAccessDate}</p>` : ''}
                ` : `
                  <p style="margin: 0; color: #475569; font-size: 14px;">No one accessed your data this week</p>
                `}
              </div>
              
              <!-- Records Section -->
              <div style="margin-bottom: 24px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
                <h2 style="margin: 0 0 12px; font-size: 16px; color: #1e293b;">📁 Records</h2>
                <p style="margin: 0; color: #475569; font-size: 14px;">
                  ${digestData.newRecords > 0 ? `<strong>${digestData.newRecords}</strong> new prescription${digestData.newRecords !== 1 ? 's' : ''} uploaded` : 'No new prescriptions'}
                  ${digestData.newReports > 0 ? `<br><strong>${digestData.newReports}</strong> pathologist report${digestData.newReports !== 1 ? 's' : ''} received` : ''}
                </p>
              </div>
              
              <!-- Medications Section -->
              ${total > 0 ? `
              <div style="margin-bottom: 24px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <h2 style="margin: 0 0 12px; font-size: 16px; color: #1e293b;">💊 Medications</h2>
                <p style="margin: 0; color: #475569; font-size: 14px;">
                  <strong>${digestData.adherenceRate}%</strong> adherence rate<br>
                  ${digestData.medicationsTaken} dose${digestData.medicationsTaken !== 1 ? 's' : ''} taken, ${digestData.medicationsSkipped} skipped
                </p>
              </div>
              ` : ''}
              
              <!-- Appointments Section -->
              ${digestData.upcomingAppointments.length > 0 ? `
              <div style="margin-bottom: 24px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <h2 style="margin: 0 0 12px; font-size: 16px; color: #1e293b;">📅 Upcoming Appointments</h2>
                ${digestData.upcomingAppointments.map((apt) => `
                  <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
                    ${apt.doctor_name} • ${apt.date} at ${apt.time}
                  </p>
                `).join('')}
              </div>
              ` : ''}
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="https://medical-memo-maker.lovable.app/dashboard" 
                   style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  View Dashboard
                </a>
              </div>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 12px;">
                You're receiving this because you have weekly digests enabled.
              </p>
              <a href="https://medical-memo-maker.lovable.app/dashboard/profile" 
                 style="color: #6366f1; text-decoration: none; font-size: 12px;">
                Manage email preferences
              </a>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: "PatientBio <noreply@lovable.dev>",
      to: [userEmail],
      subject: "📊 Your Weekly PatientBio Summary",
      html: emailHtml,
    });

    if (emailError) {
      console.error("Failed to send email:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last_sent_at
    await supabase
      .from("patient_digest_preferences")
      .update({ last_sent_at: new Date().toISOString() })
      .eq("user_id", user_id);

    console.log("Weekly digest sent successfully to:", userEmail);

    return new Response(
      JSON.stringify({ success: true, email_id: emailResult?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending weekly digest:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
