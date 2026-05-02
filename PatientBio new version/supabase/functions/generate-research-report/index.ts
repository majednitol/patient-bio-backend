import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { reportConfig } = await req.json();

    // Gather researcher data
    const [sharesRes, notesRes, broadcastsRes] = await Promise.all([
      supabase.from("patient_researcher_shares").select("*").eq("researcher_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("researcher_study_notes").select("*").eq("researcher_id", user.id).order("updated_at", { ascending: false }).limit(50),
      supabase.from("research_broadcast_requests").select("*").eq("researcher_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    const shares = sharesRes.data || [];
    const notes = notesRes.data || [];
    const broadcasts = broadcastsRes.data || [];

    const reportData = {
      generatedAt: new Date().toISOString(),
      researcher: user.email,
      summary: {
        totalShares: shares.length,
        completedShares: shares.filter((s: any) => s.status === "completed").length,
        pendingShares: shares.filter((s: any) => s.status === "pending").length,
        uniquePatients: new Set(shares.map((s: any) => s.patient_id)).size,
        totalNotes: notes.length,
        publishedNotes: notes.filter((n: any) => n.is_published).length,
        activeBroadcasts: broadcasts.filter((b: any) => b.status === "active").length,
      },
      diseaseBreakdown: shares.reduce((acc: Record<string, number>, s: any) => {
        const cat = s.disease_category || "General";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {}),
      recentActivity: {
        recentShares: shares.slice(0, 5).map((s: any) => ({
          date: s.created_at,
          status: s.status,
          disease: s.disease_category,
          anonymized: s.is_anonymized,
        })),
        recentNotes: notes.slice(0, 5).map((n: any) => ({
          title: n.study_title,
          updated: n.updated_at,
          published: n.is_published,
        })),
      },
      includeSections: reportConfig?.includeSections || ["summary", "disease", "activity"],
    };

    // Update last_generated_at if we have a schedule
    if (reportConfig?.scheduleId) {
      await supabase
        .from("researcher_scheduled_reports")
        .update({ last_generated_at: new Date().toISOString() })
        .eq("id", reportConfig.scheduleId)
        .eq("researcher_id", user.id);
    }

    return new Response(JSON.stringify({ report: reportData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
