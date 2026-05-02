/**
 * check-patient-chain-integrity - Scheduled edge function for patient tamper detection
 * Improvement #5: Tamper Detection Notifications for Patients
 * 
 * Runs daily, verifies chain links for each patient's transactions,
 * and creates notifications for any anomalies found.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/blockchain.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all distinct patient actor_ids
    const { data: actors, error: actorsError } = await supabase
      .from("blockchain_transactions")
      .select("actor_id")
      .limit(1000);

    if (actorsError) throw actorsError;

    const uniqueActors = [...new Set((actors || []).map((a: { actor_id: string }) => a.actor_id))];
    let anomaliesFound = 0;

    for (const actorId of uniqueActors) {
      // Get this patient's transactions in chronological order
      const { data: txns, error: txError } = await supabase
        .from("blockchain_transactions")
        .select("id, data_hash, previous_hash, created_at, transaction_type")
        .eq("actor_id", actorId)
        .order("created_at", { ascending: true })
        .limit(500);

      if (txError || !txns || txns.length < 2) continue;

      // Check chain links within this patient's transactions
      // Note: these are a subset of the full chain, so we only check
      // for obviously broken sequential patterns
      let brokenLinks = 0;
      const brokenDetails: string[] = [];

      // We can't verify intra-patient chain links since the global chain
      // interleaves with other patients. Instead, verify the full chain
      // integrity for transactions belonging to this patient by checking
      // if any of their transactions appear in the chain_break_alerts table.
      const txIds = txns.map((t: { id: string }) => t.id);
      const { data: breakAlerts, error: breakError } = await supabase
        .from("chain_break_alerts")
        .select("id, transaction_id, created_at")
        .in("transaction_id", txIds)
        .eq("is_resolved", false);

      if (!breakError && breakAlerts && breakAlerts.length > 0) {
        brokenLinks = breakAlerts.length;

        // Check if we already notified this patient about chain issues today
        const today = new Date().toISOString().slice(0, 10);
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", actorId)
          .eq("type", "chain_integrity_alert")
          .gte("created_at", today + "T00:00:00Z")
          .limit(1);

        if (!existingNotif || existingNotif.length === 0) {
          // Create notification for this patient
          await supabase.from("notifications").insert({
            user_id: actorId,
            type: "chain_integrity_alert",
            title: "⚠️ Data Integrity Alert",
            message: `${brokenLinks} blockchain anomal${brokenLinks === 1 ? "y" : "ies"} detected in your health data chain. Visit your Data Integrity page for details.`,
            metadata: {
              broken_links: brokenLinks,
              affected_transactions: breakAlerts.map((a: { transaction_id: string }) => a.transaction_id),
              checked_at: new Date().toISOString(),
            },
          });

          anomaliesFound++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          patients_checked: uniqueActors.length,
          anomalies_notified: anomaliesFound,
          checked_at: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-patient-chain-integrity error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
