import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRY_ATTEMPTS = 5;
const BATCH_LIMIT = 10; // Process up to 10 failed uploads per run

// ── AWS Signature V4 helpers (same as backup-cloud-upload) ──

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<Uint8Array> {
  let key = await hmacSha256(new TextEncoder().encode("AWS4" + secretKey), dateStamp);
  key = await hmacSha256(key, region);
  key = await hmacSha256(key, service);
  key = await hmacSha256(key, "aws4_request");
  return key;
}

async function uploadToR2(
  data: string,
  fileName: string,
  endpointUrl: string,
  bucketName: string,
  accessKeyId: string,
  secretAccessKey: string,
): Promise<string> {
  const cleanEndpoint = endpointUrl.replace(/\/+$/, "");
  const url = new URL(`${cleanEndpoint}/${bucketName}/${fileName}`);
  const host = url.hostname;
  const path = url.pathname;
  const region = "auto";
  const service = "s3";

  const bodyBytes = new TextEncoder().encode(data);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(data);

  const headers: Record<string, string> = {
    "content-length": bodyBytes.byteLength.toString(),
    "content-type": "application/json",
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  const signedHeaderKeys = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort().map((k) => `${k}:${headers[k]}\n`).join("");

  const canonicalRequest = ["PUT", path, "", canonicalHeaders, signedHeaderKeys, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  const signatureBytes = await hmacSha256(signingKey, stringToSign);
  const signature = [...signatureBytes].map((b) => b.toString(16).padStart(2, "0")).join("");

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaderKeys}, Signature=${signature}`;

  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: { ...headers, Authorization: authorization },
    body: bodyBytes,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`R2 upload failed (${res.status}): ${errText}`);
  }
  await res.text();
  return url.toString();
}

async function downloadFromLocalStorage(
  serviceClient: ReturnType<typeof createClient>,
  run: { started_at: string; schedule_id: string | null; tables_exported: string[] | null },
): Promise<string | null> {
  // Try to find the file in local storage by listing backup files
  const { data: files } = await serviceClient.storage.from("backups").list("", { limit: 200 });
  if (!files || files.length === 0) return null;

  // Match by timestamp proximity — the file was created around the same time as the run
  const runTime = new Date(run.started_at).getTime();
  let bestMatch: { name: string; diff: number } | null = null;

  for (const file of files) {
    if (!file.name.endsWith(".json")) continue;
    const fileTime = new Date(file.created_at).getTime();
    const diff = Math.abs(fileTime - runTime);
    // Within 5 minutes
    if (diff < 5 * 60 * 1000 && (!bestMatch || diff < bestMatch.diff)) {
      bestMatch = { name: file.name, diff };
    }
  }

  if (!bestMatch) return null;

  const { data, error } = await serviceClient.storage.from("backups").download(bestMatch.name);
  if (error || !data) return null;

  return await data.text();
}

async function reExportData(
  serviceClient: ReturnType<typeof createClient>,
  tables: string[],
): Promise<string> {
  const BATCH_SIZE = 1000;
  const exportData: Record<string, unknown[]> = {};

  for (const table of tables) {
    const allRows: unknown[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await serviceClient.from(table).select("*").range(offset, offset + BATCH_SIZE - 1);
      if (error) break;
      if (data && data.length > 0) allRows.push(...data);
      if (!data || data.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }
    exportData[table] = allRows;
  }

  return JSON.stringify(exportData);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check R2 credentials
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const endpointUrl = Deno.env.get("R2_ENDPOINT_URL");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");

    if (!accessKeyId || !secretAccessKey || !endpointUrl || !bucketName) {
      return new Response(
        JSON.stringify({ error: "R2 credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Allow manual trigger for a specific run
    let targetRunId: string | null = null;
    try {
      const body = await req.json();
      targetRunId = body.run_id ?? null;
    } catch {
      // No body = cron trigger
    }

    // Find failed/fallback cloud uploads that haven't exceeded retry limit
    let query = serviceClient
      .from("backup_runs")
      .select("id, schedule_id, tables_exported, row_counts, started_at, retry_count, cloud_upload_status, storage_destination")
      .in("cloud_upload_status", ["failed", "fallback_local"])
      .eq("status", "success") // Only retry runs where the backup itself succeeded
      .lt("retry_count", MAX_RETRY_ATTEMPTS)
      .order("started_at", { ascending: false })
      .limit(BATCH_LIMIT);

    if (targetRunId) {
      query = query.eq("id", targetRunId);
    }

    const { data: failedRuns, error: queryError } = await query;
    if (queryError) {
      return new Response(
        JSON.stringify({ error: queryError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!failedRuns || failedRuns.length === 0) {
      return new Response(
        JSON.stringify({ message: "No failed cloud uploads to retry", retried: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: Array<{ run_id: string; status: string; error?: string }> = [];

    for (const run of failedRuns) {
      try {
        // Increment retry count first
        const newRetryCount = (run.retry_count ?? 0) + 1;
        await serviceClient
          .from("backup_runs")
          .update({ retry_count: newRetryCount, cloud_upload_status: "retrying" })
          .eq("id", run.id);

        // Try to get backup data: first from local storage, then re-export
        let dataStr: string | null = null;

        dataStr = await downloadFromLocalStorage(serviceClient, run);

        if (!dataStr && run.tables_exported && run.tables_exported.length > 0) {
          console.log(`Run ${run.id}: Re-exporting data for ${run.tables_exported.length} tables`);
          dataStr = await reExportData(serviceClient, run.tables_exported);
        }

        if (!dataStr) {
          throw new Error("Could not retrieve backup data from local storage or re-export");
        }

        // Generate file name
        const timestamp = new Date(run.started_at).toISOString().replace(/[:.]/g, "-");
        const fileName = `retry_${timestamp}_${run.id.slice(0, 8)}.json`;

        // Upload to R2
        const cloudUrl = await uploadToR2(dataStr, fileName, endpointUrl, bucketName, accessKeyId, secretAccessKey);

        // Update run record
        await serviceClient
          .from("backup_runs")
          .update({
            cloud_upload_status: "uploaded",
            cloud_file_url: cloudUrl,
            retry_count: newRetryCount,
          })
          .eq("id", run.id);

        // Audit trail
        await serviceClient.from("audit_trail").insert({
          event_type: "SYSTEM_BACKUP",
          entity_type: "system",
          entity_id: null,
          user_id: "00000000-0000-0000-0000-000000000000",
          action: "cloud_upload_retry_success",
          details: {
            run_id: run.id,
            retry_count: newRetryCount,
            cloud_file_url: cloudUrl,
          },
        });

        results.push({ run_id: run.id, status: "uploaded" });
        console.log(`Run ${run.id}: Cloud upload retry #${newRetryCount} succeeded`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Run ${run.id}: Retry failed:`, errorMsg);

        const newRetryCount = (run.retry_count ?? 0) + 1;
        const finalStatus = newRetryCount >= MAX_RETRY_ATTEMPTS ? "permanently_failed" : "failed";

        await serviceClient
          .from("backup_runs")
          .update({
            cloud_upload_status: finalStatus,
            retry_count: newRetryCount,
          })
          .eq("id", run.id);

        results.push({ run_id: run.id, status: "failed", error: errorMsg });
      }
    }

    const succeeded = results.filter((r) => r.status === "uploaded").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return new Response(
      JSON.stringify({
        message: `Retried ${results.length} uploads: ${succeeded} succeeded, ${failed} failed`,
        retried: results.length,
        succeeded,
        failed,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("retry-failed-cloud-uploads error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
