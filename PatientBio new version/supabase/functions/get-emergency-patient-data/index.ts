import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmergencyData {
  patient_name: string;
  date_of_birth: string | null;
  blood_group: string | null;
  allergies: string[];
  current_medications: string[];
  medications_detailed: { name: string; dosage: string | null; frequency: string }[];
  chronic_conditions: string[];
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  access_level: string;
  expires_at: string;
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const emergencyToken = url.searchParams.get("token");
    const pin = url.searchParams.get("pin");

    if (!emergencyToken) {
      return new Response(JSON.stringify({ error: "Missing emergency token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Emergency access attempt for token: ${emergencyToken.slice(0, 4)}...`);

    // Fetch the emergency token
    const { data: tokenData, error: tokenError } = await supabase
      .from("emergency_access_tokens")
      .select("*")
      .eq("emergency_token", emergencyToken)
      .eq("is_active", true)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Invalid or expired emergency token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
      return new Response(JSON.stringify({ error: "Emergency access has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify PIN if required (with rate limiting)
    if (tokenData.emergency_pin_hash) {
      if (!pin) {
        return new Response(JSON.stringify({ 
          error: "PIN required",
          requires_pin: true 
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check rate limiting
      const { data: attemptData } = await supabase
        .from("emergency_pin_attempts")
        .select("*")
        .eq("token_id", tokenData.id)
        .maybeSingle();

      if (attemptData?.locked_until) {
        const lockedUntil = new Date(attemptData.locked_until);
        if (now < lockedUntil) {
          console.log("Token locked due to too many failed attempts");
          return new Response(JSON.stringify({ error: "Too many failed attempts. Try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Lock expired, reset attempts
        await supabase
          .from("emergency_pin_attempts")
          .update({ failed_attempts: 0, locked_until: null, last_attempt_at: now.toISOString() })
          .eq("token_id", tokenData.id);
      }

      // Verify PIN using SHA-256 hash
      const expectedHash = await hashPin(pin, tokenData.patient_id.slice(0, 8));
      const isValid = tokenData.emergency_pin_hash === expectedHash;

      if (!isValid) {
        // Record failed attempt
        const currentAttempts = (attemptData?.failed_attempts || 0) + 1;
        const lockUntil = currentAttempts >= 5
          ? new Date(now.getTime() + 60 * 60 * 1000).toISOString() // 1 hour lockout
          : null;

        await supabase
          .from("emergency_pin_attempts")
          .upsert({
            token_id: tokenData.id,
            failed_attempts: currentAttempts,
            last_attempt_at: now.toISOString(),
            locked_until: lockUntil,
          }, { onConflict: "token_id" });

        console.log(`Invalid PIN. Attempt ${currentAttempts}/5`);
        return new Response(JSON.stringify({ error: "Invalid PIN" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Successful PIN - reset attempts
      if (attemptData) {
        await supabase
          .from("emergency_pin_attempts")
          .update({ failed_attempts: 0, locked_until: null })
          .eq("token_id", tokenData.id);
      }
    }

    // Fetch patient data
    const patientId = tokenData.patient_id;
    
    const [profileResult, healthDataResult, medicationRemindersResult] = await Promise.all([
      supabase.from("user_profiles").select("user_id, display_name, date_of_birth, notification_push_enabled, notification_preferences").eq("user_id", patientId).single(),
      supabase.from("health_data").select("blood_group, health_allergies, current_medications, chronic_diseases, emergency_contact_name, emergency_contact_phone").eq("user_id", patientId).single(),
      supabase.from("medication_reminders").select("medication_name, dosage, frequency").eq("user_id", patientId).eq("is_active", true),
    ]);

    const profile = profileResult.data;
    const healthData = healthDataResult.data;
    const medicationReminders = medicationRemindersResult.data || [];

    if (!profile) {
      return new Response(JSON.stringify({ error: "Patient data not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parseList = (str: string | null): string[] => {
      if (!str) return [];
      return str.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    };

    const medicationsDetailed = medicationReminders.map((m: any) => ({
      name: m.medication_name,
      dosage: m.dosage || null,
      frequency: m.frequency || "",
    }));

    const emergencyData: EmergencyData = {
      patient_name: profile.display_name || "Unknown",
      date_of_birth: profile.date_of_birth || null,
      blood_group: healthData?.blood_group || null,
      allergies: parseList(healthData?.health_allergies),
      current_medications: parseList(healthData?.current_medications),
      medications_detailed: medicationsDetailed,
      chronic_conditions: tokenData.access_level === "full" 
        ? parseList(healthData?.chronic_diseases) 
        : [],
      emergency_contact_name: healthData?.emergency_contact_name || null,
      emergency_contact_phone: healthData?.emergency_contact_phone || null,
      access_level: tokenData.access_level,
      expires_at: tokenData.expires_at,
    };

    // Update access count
    await supabase
      .from("emergency_access_tokens")
      .update({
        accessed_at: now.toISOString(),
        access_count: (tokenData.access_count || 0) + 1,
      })
      .eq("id", tokenData.id);

    // Log the access
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    await supabase.from("emergency_access_logs").insert({
      emergency_token_id: tokenData.id,
      patient_id: patientId,
      ip_address: ipAddress,
      user_agent: userAgent,
      data_accessed: {
        blood_group: !!healthData?.blood_group,
        allergies: emergencyData.allergies.length,
        medications: emergencyData.current_medications.length,
        medications_detailed: medicationsDetailed.length,
        conditions: emergencyData.chronic_conditions.length,
      },
    });

    // Notify patient
    const notificationPrefs = profile?.notification_preferences as { emergency_access?: boolean } | null;
    const shouldNotify = notificationPrefs?.emergency_access !== false;

    if (shouldNotify) {
      await supabase.from("notifications").insert({
        user_id: patientId,
        title: "🚨 Emergency Access",
        message: `Your emergency health data was accessed by a first responder.`,
        type: "emergency_access",
        metadata: {
          token_id: tokenData.id,
          accessed_at: now.toISOString(),
          ip_address: ipAddress,
          is_critical: true,
        },
      });

      if (profile?.notification_push_enabled !== false) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-access-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              user_id: patientId,
              title: "🚨 Emergency Access Alert",
              body: "Your emergency health data was accessed by a first responder.",
              url: "/dashboard/access-analytics",
              requireInteraction: true,
            }),
          });
        } catch (pushError) {
          console.error("Error sending emergency push notification:", pushError);
        }
      }
    }

    console.log(`Emergency data accessed for patient ${patientId.slice(0, 8)}...`);

    return new Response(JSON.stringify(emergencyData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=30" },
    });

  } catch (error) {
    console.error("Emergency access error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
