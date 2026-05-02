import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30", 10);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (days - 1));
    const startISO = startDate.toISOString();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const { data: views, error: viewsError } = await supabase
      .from("page_views")
      .select("session_id, path, referrer, device_type, created_at")
      .gte("created_at", startISO)
      .order("created_at", { ascending: true })
      .limit(10000);

    if (viewsError) throw viewsError;

    const rows = views || [];

    // Unique sessions
    const uniqueSessions = new Set(rows.map((r: any) => r.session_id));
    const totalVisitors = uniqueSessions.size;
    const totalPageviews = rows.length;
    const avgPagesPerVisitor = totalVisitors > 0 ? Math.round((totalPageviews / totalVisitors) * 100) / 100 : 0;

    // Session durations & bounce rate
    const sessionMap = new Map<string, { first: number; last: number; count: number }>();
    for (const r of rows) {
      const ts = new Date(r.created_at).getTime();
      const s = sessionMap.get(r.session_id);
      if (!s) {
        sessionMap.set(r.session_id, { first: ts, last: ts, count: 1 });
      } else {
        s.last = Math.max(s.last, ts);
        s.count++;
      }
    }

    let totalDuration = 0;
    let bounces = 0;
    for (const s of sessionMap.values()) {
      totalDuration += (s.last - s.first) / 1000;
      if (s.count === 1) bounces++;
    }
    const avgSessionDuration = totalVisitors > 0 ? Math.round(totalDuration / totalVisitors) : 0;
    const bounceRate = totalVisitors > 0 ? Math.round((bounces / totalVisitors) * 100) : 0;

    // Daily trend with per-day metrics
    const dailyMap = new Map<string, { visitors: Set<string>; pageviews: number; sessions: Map<string, { first: number; last: number; count: number }> }>();
    const cursor = new Date(startDate);
    while (cursor <= now) {
      dailyMap.set(formatDate(cursor), { visitors: new Set(), pageviews: 0, sessions: new Map() });
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const r of rows) {
      const day = r.created_at.split("T")[0];
      const entry = dailyMap.get(day);
      if (entry) {
        entry.visitors.add(r.session_id);
        entry.pageviews++;
        const ts = new Date(r.created_at).getTime();
        const sess = entry.sessions.get(r.session_id);
        if (!sess) {
          entry.sessions.set(r.session_id, { first: ts, last: ts, count: 1 });
        } else {
          sess.last = Math.max(sess.last, ts);
          sess.count++;
        }
      }
    }

    const dailyTrend = Array.from(dailyMap.entries()).map(([date, v]) => {
      const dayVisitors = v.visitors.size;
      const dayPageviews = v.pageviews;
      let dayDuration = 0;
      let dayBounces = 0;
      for (const s of v.sessions.values()) {
        dayDuration += (s.last - s.first) / 1000;
        if (s.count === 1) dayBounces++;
      }
      return {
        date,
        visitors: dayVisitors,
        pageviews: dayPageviews,
        pageviewsPerVisit: dayVisitors > 0 ? Math.round((dayPageviews / dayVisitors) * 100) / 100 : 0,
        sessionDuration: dayVisitors > 0 ? Math.round(dayDuration / dayVisitors) : 0,
        bounceRate: dayVisitors > 0 ? Math.round((dayBounces / dayVisitors) * 100) : 0,
      };
    });

    // Sources
    const sourceCount = new Map<string, Set<string>>();
    for (const r of rows) {
      let source = "Direct";
      if (r.referrer) {
        try { source = new URL(r.referrer).hostname.replace(/^www\./, ""); } catch { source = r.referrer; }
      }
      if (!sourceCount.has(source)) sourceCount.set(source, new Set());
      sourceCount.get(source)!.add(r.session_id);
    }
    const sources = Array.from(sourceCount.entries())
      .map(([name, sessions]) => ({
        name,
        visitors: sessions.size,
        percentage: totalVisitors > 0 ? Math.round((sessions.size / totalVisitors) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.visitors - a.visitors);

    // Pages
    const pageCount = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!pageCount.has(r.path)) pageCount.set(r.path, new Set());
      pageCount.get(r.path)!.add(r.session_id);
    }
    const pages = Array.from(pageCount.entries())
      .map(([path, sessions]) => ({ path, visitors: sessions.size }))
      .sort((a, b) => b.visitors - a.visitors);

    // Devices
    const deviceCount = new Map<string, Set<string>>();
    for (const r of rows) {
      const dt = r.device_type || "desktop";
      if (!deviceCount.has(dt)) deviceCount.set(dt, new Set());
      deviceCount.get(dt)!.add(r.session_id);
    }
    const mobileCount = (deviceCount.get("mobile")?.size || 0) + (deviceCount.get("tablet")?.size || 0);
    const desktopCount = deviceCount.get("desktop")?.size || 0;
    const devices = {
      mobile: { count: mobileCount, percentage: totalVisitors > 0 ? Math.round((mobileCount / totalVisitors) * 1000) / 10 : 0 },
      desktop: { count: desktopCount, percentage: totalVisitors > 0 ? Math.round((desktopCount / totalVisitors) * 1000) / 10 : 0 },
    };

    const countries: { code: string; name: string; visitors: number }[] = [];

    const result = {
      period: { start: formatDate(startDate), end: formatDate(now), days },
      summary: { totalVisitors, totalPageviews, avgPagesPerVisitor, avgSessionDuration, bounceRate },
      dailyTrend,
      sources,
      pages,
      devices,
      countries,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
