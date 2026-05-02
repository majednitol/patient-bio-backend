import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HospitalData {
  name: string;
  type: string;
  registration_number?: string;
  city: string;
  state?: string;
  address?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for inserting without RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header if present
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const supabaseClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id || null;
    }

    const hospitalData: HospitalData = await req.json();

    // Validate required fields
    if (!hospitalData.name || hospitalData.name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Facility name must be at least 2 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!hospitalData.city || hospitalData.city.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "City must be at least 2 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert hospital
    const { data: hospital, error: insertError } = await supabaseAdmin
      .from("hospitals")
      .insert({
        name: hospitalData.name.trim(),
        type: hospitalData.type || "hospital",
        registration_number: hospitalData.registration_number?.trim() || null,
        city: hospitalData.city.trim(),
        state: hospitalData.state?.trim() || null,
        address: hospitalData.address?.trim() || null,
        country: hospitalData.country?.trim() || "India",
        phone: hospitalData.phone?.trim() || null,
        email: hospitalData.email?.trim() || null,
        website: hospitalData.website?.trim() || null,
        created_by: userId,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to register hospital" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If user is authenticated, add them as admin staff
    if (userId) {
      await supabaseAdmin.from("hospital_staff").insert({
        hospital_id: hospital.id,
        user_id: userId,
        role: "admin",
        is_active: true,
      });
    }

    return new Response(
      JSON.stringify({ hospital }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
