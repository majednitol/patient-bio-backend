import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXPORTABLE_TABLES = [
  "user_profiles", "user_roles", "health_records", "access_tokens", "access_logs",
  "prescriptions", "appointments", "doctor_profiles", "pathologist_profiles",
  "researcher_profiles", "hospitals", "hospital_staff", "audit_trail",
  "blockchain_transactions", "consent_records", "data_access_requests",
  "doctor_patient_access", "pathologist_reports", "patient_wallets",
] as const;

const BATCH_SIZE = 1000;

const FREQUENCY_MS: Record<string, number> = {
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

async function fetchAllRows(
  client: ReturnType<typeof createClient>,
  table: string,
): Promise<{ rows: unknown[]; error: string | null }> {
  const allRows: unknown[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await client.from(table).select("*").range(offset, offset + BATCH_SIZE - 1);
    if (error) return { rows: [], error: error.message };
    if (data && data.length > 0) allRows.push(...data);
    if (!data || data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }
  return { rows: allRows, error: null };
}

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function computeNextRunAt(frequency: string, fromDate: Date = new Date()): string {
  const ms = FREQUENCY_MS[frequency] ?? FREQUENCY_MS["daily"];
  return new Date(fromDate.getTime() + ms).toISOString();
}

async function triggerCloudUpload(
  supabaseUrl: string,
  supabaseServiceKey: string,
  runId: string,
  exportData: Record<string, unknown[]>,
  destination: string,
  folderId: string | null,
  scheduleName: string,
) {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/backup-cloud-upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        run_id: runId,
        backup_data: exportData,
        destination,
        folder_id: folderId,
        schedule_name: scheduleName,
      }),
    });
    if (!res.ok) {
      console.error("Cloud upload returned non-OK:", await res.text());
    }
  } catch (err) {
    console.error("Cloud upload call failed:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    let targetScheduleId: string | null = null;
    let isRetry = false;
    try {
      const body = await req.json();
      targetScheduleId = body.schedule_id ?? null;
      isRetry = body.is_retry ?? false;
    } catch {
      // No body = cron trigger
    }

    let query = serviceClient.from("backup_schedules").select("*").eq("is_enabled", true);
    if (targetScheduleId) {
      query = query.eq("id", targetScheduleId);
    } else {
      query = query.lte("next_run_at", new Date().toISOString());
    }

    const { data: schedules, error: schedError } = await query;
    if (schedError) {
      return new Response(JSON.stringify({ error: schedError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ message: "No schedules due" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ schedule_id: string; status: string; error?: string }> = [];

    for (const schedule of schedules) {
      const startTime = Date.now();
      const storageDestination = schedule.storage_destination ?? "local";

      const { data: runData, error: runInsertError } = await serviceClient
        .from("backup_runs")
        .insert({
          schedule_id: schedule.id,
          run_type: isRetry ? "retry" : "scheduled",
          status: "running",
          tables_exported: schedule.tables,
          started_at: new Date().toISOString(),
          storage_destination: storageDestination,
          cloud_upload_status: storageDestination === "local" ? "skipped" : "pending",
        })
        .select("id")
        .single();

      if (runInsertError || !runData) {
        results.push({ schedule_id: schedule.id, status: "failed", error: "Could not create run record" });
        continue;
      }

      const runId = runData.id;

      try {
        const validTables = (schedule.tables as string[]).filter((t: string) =>
          (EXPORTABLE_TABLES as readonly string[]).includes(t)
        );
        if (validTables.length === 0) throw new Error("No valid tables in schedule");

        const exportData: Record<string, unknown[]> = {};
        const rowCounts: Record<string, number> = {};

        for (const table of validTables) {
          const { rows, error } = await fetchAllRows(serviceClient, table);
          if (error) {
            exportData[table] = [];
            rowCounts[table] = 0;
          } else {
            exportData[table] = rows;
            rowCounts[table] = rows.length;
          }
        }

        const checksum = await sha256(JSON.stringify(exportData));
        const durationMs = Date.now() - startTime;

        await serviceClient.from("backup_runs").update({
          status: "success",
          row_counts: rowCounts,
          checksum_sha256: checksum,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        }).eq("id", runId);

        // Trigger cloud upload if destination is not local-only
        if (storageDestination !== "local") {
          // Fire-and-forget to avoid blocking
          triggerCloudUpload(
            supabaseUrl,
            supabaseServiceKey,
            runId,
            exportData,
            storageDestination,
            schedule.cloud_folder_id ?? null,
            schedule.name,
          );
        }

        const now = new Date();
        await serviceClient.from("backup_schedules").update({
          last_run_at: now.toISOString(),
          next_run_at: computeNextRunAt(schedule.frequency, now),
        }).eq("id", schedule.id);

        await serviceClient.from("audit_trail").insert({
          event_type: "SYSTEM_BACKUP",
          entity_type: "system",
          entity_id: null,
          user_id: schedule.created_by,
          action: "auto_backup_completed",
          details: {
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            tables: validTables,
            row_counts: rowCounts,
            checksum_sha256: checksum,
            duration_ms: durationMs,
            run_type: isRetry ? "retry" : "scheduled",
            storage_destination: storageDestination,
          },
        });

        results.push({ schedule_id: schedule.id, status: "success" });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        const durationMs = Date.now() - startTime;

        const { data: currentRun } = await serviceClient
          .from("backup_runs").select("retry_count").eq("id", runId).single();
        const retryCount = (currentRun?.retry_count ?? 0) + (isRetry ? 1 : 0);

        await serviceClient.from("backup_runs").update({
          status: "failed",
          error_message: errorMsg,
          retry_count: retryCount,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
          cloud_upload_status: "skipped",
        }).eq("id", runId);

        results.push({ schedule_id: schedule.id, status: "failed", error: errorMsg });
      }
    }

    // Cleanup old runs
    for (const schedule of schedules) {
      const retentionDays = schedule.retention_days ?? 30;
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
      await serviceClient.from("backup_runs").delete()
        .eq("schedule_id", schedule.id).lt("created_at", cutoff);
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Auto-backup runner error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
