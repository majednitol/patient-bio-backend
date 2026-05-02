import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── AWS Signature V4 helpers ──

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

async function downloadFromR2(
  fileKey: string,
  endpointUrl: string,
  bucketName: string,
  accessKeyId: string,
  secretAccessKey: string,
): Promise<string> {
  const cleanEndpoint = endpointUrl.replace(/\/+$/, "");
  const url = new URL(`${cleanEndpoint}/${bucketName}/${fileKey}`);
  const host = url.hostname;
  const path = url.pathname;
  const region = "auto";
  const service = "s3";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z/, "Z");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256Hex("");

  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  const signedHeaderKeys = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}\n`)
    .join("");

  const canonicalRequest = [
    "GET",
    path,
    "", // no query string
    canonicalHeaders,
    signedHeaderKeys,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  const signatureBytes = await hmacSha256(signingKey, stringToSign);
  const signature = [...signatureBytes].map((b) => b.toString(16).padStart(2, "0")).join("");

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaderKeys}, Signature=${signature}`;

  console.log(`R2 download: GET ${url.toString()}`);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { ...headers, Authorization: authorization },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`R2 download failed (${res.status}): ${errText}`);
  }

  return await res.text();
}

// ── Import logic (same as admin-data-import) ──

const IMPORTABLE_TABLES = [
  "user_profiles", "user_roles", "health_records", "access_tokens", "access_logs",
  "prescriptions", "appointments", "doctor_profiles", "pathologist_profiles",
  "researcher_profiles", "hospitals", "hospital_staff", "audit_trail",
  "blockchain_transactions", "consent_records", "data_access_requests",
  "doctor_patient_access", "pathologist_reports", "patient_wallets",
] as const;

type ImportableTable = (typeof IMPORTABLE_TABLES)[number];
const BATCH_SIZE = 500;

interface ImportSummary {
  table: string;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

async function captureSnapshot(
  client: ReturnType<typeof createClient>,
  table: string,
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const ids = rows.map((r) => r.id).filter(Boolean) as string[];
  if (ids.length === 0) return [];
  const allExisting: Record<string, unknown>[] = [];
  for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
    const batch = ids.slice(offset, offset + BATCH_SIZE);
    const { data } = await client.from(table).select("*").in("id", batch);
    if (data) allExisting.push(...(data as Record<string, unknown>[]));
  }
  return allExisting;
}

async function upsertBatch(
  client: ReturnType<typeof createClient>,
  table: string,
  rows: Record<string, unknown>[],
  mode: "upsert" | "skip" | "replace",
): Promise<ImportSummary> {
  const summary: ImportSummary = { table, inserted: 0, updated: 0, skipped: 0, errors: [] };
  if (!rows || rows.length === 0) return summary;

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    try {
      if (mode === "skip") {
        const { data, error } = await client.from(table).insert(batch).select("id");
        if (error) {
          if (error.code === "23505") summary.skipped += batch.length;
          else summary.errors.push(`Batch at offset ${offset}: ${error.message}`);
        } else {
          summary.inserted += data?.length ?? batch.length;
        }
      } else if (mode === "replace") {
        const ids = batch.map((r) => r.id).filter(Boolean);
        if (ids.length > 0) await client.from(table).delete().in("id", ids);
        const { data, error } = await client.from(table).insert(batch).select("id");
        if (error) summary.errors.push(`Batch at offset ${offset}: ${error.message}`);
        else summary.updated += data?.length ?? batch.length;
      } else {
        const { data, error } = await client.from(table).upsert(batch, { onConflict: "id", ignoreDuplicates: false }).select("id");
        if (error) summary.errors.push(`Batch at offset ${offset}: ${error.message}`);
        else summary.inserted += data?.length ?? batch.length;
      }
    } catch (err) {
      summary.errors.push(`Batch at offset ${offset}: ${(err as Error).message}`);
    }
  }
  return summary;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const { data: roleData } = await serviceClient
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { file_key, conflict_mode, dry_run } = body as {
      file_key: string;
      conflict_mode?: "upsert" | "skip" | "replace";
      dry_run?: boolean;
    };

    if (!file_key) {
      return new Response(JSON.stringify({ error: "Missing file_key" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get R2 credentials
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const endpointUrl = Deno.env.get("R2_ENDPOINT_URL")!;
    const bucketName = Deno.env.get("R2_BUCKET_NAME")!;

    if (!accessKeyId || !secretAccessKey || !endpointUrl || !bucketName) {
      return new Response(JSON.stringify({ error: "R2 credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Download backup from R2
    console.log(`Downloading backup from R2: ${file_key}`);
    const backupJson = await downloadFromR2(file_key, endpointUrl, bucketName, accessKeyId, secretAccessKey);

    // Step 2: Parse backup data
    let backupData: Record<string, Record<string, unknown>[]>;
    try {
      const parsed = JSON.parse(backupJson);
      // Support both { tables: {...} } and flat { tableName: [...] } formats
      backupData = parsed.tables ?? parsed;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON in backup file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Import data
    const mode = conflict_mode ?? "upsert";
    const isDryRun = dry_run === true;
    const results: ImportSummary[] = [];
    const preImportSnapshot: Record<string, Record<string, unknown>[]> = {};

    for (const [tableName, rows] of Object.entries(backupData)) {
      if (!IMPORTABLE_TABLES.includes(tableName as ImportableTable)) {
        results.push({ table: tableName, inserted: 0, updated: 0, skipped: 0, errors: [`Table '${tableName}' is not importable.`] });
        continue;
      }
      if (!Array.isArray(rows)) {
        results.push({ table: tableName, inserted: 0, updated: 0, skipped: 0, errors: [`Data for '${tableName}' is not an array.`] });
        continue;
      }

      if (isDryRun) {
        // Simple dry-run: count existing vs new
        const ids = rows.map((r) => r.id).filter(Boolean) as string[];
        const existingIds = new Set<string>();
        for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
          const batch = ids.slice(offset, offset + BATCH_SIZE);
          const { data } = await serviceClient.from(tableName).select("id").in("id", batch);
          if (data) for (const row of data) existingIds.add((row as { id: string }).id);
        }
        const summary: ImportSummary = { table: tableName, inserted: 0, updated: 0, skipped: 0, errors: [] };
        for (const row of rows) {
          const exists = row.id ? existingIds.has(row.id as string) : false;
          if (mode === "skip") { if (exists) summary.skipped++; else summary.inserted++; }
          else { if (exists) summary.updated++; else summary.inserted++; }
        }
        results.push(summary);
      } else {
        const snapshot = await captureSnapshot(serviceClient, tableName, rows);
        if (snapshot.length > 0) preImportSnapshot[tableName] = snapshot.slice(0, 100);
        const summary = await upsertBatch(serviceClient, tableName, rows, mode);
        results.push(summary);
      }
    }

    const totalInserted = results.reduce((a, r) => a + r.inserted, 0);
    const totalUpdated = results.reduce((a, r) => a + r.updated, 0);
    const totalSkipped = results.reduce((a, r) => a + r.skipped, 0);
    const totalErrors = results.reduce((a, r) => a + r.errors.length, 0);

    // Audit trail (skip for dry-run)
    if (!isDryRun) {
      await serviceClient.from("audit_trail").insert({
        event_type: "SYSTEM_RESTORE",
        entity_type: "system",
        entity_id: null,
        user_id: userId,
        action: "cloud_backup_restored",
        details: {
          source: "cloudflare_r2",
          file_key,
          conflict_mode: mode,
          tables_imported: results.map((r) => r.table),
          total_inserted: totalInserted,
          total_updated: totalUpdated,
          total_skipped: totalSkipped,
          total_errors: totalErrors,
          admin_email: userEmail,
          restored_at: new Date().toISOString(),
          per_table_results: results.map((r) => ({
            table: r.table, inserted: r.inserted, updated: r.updated,
            skipped: r.skipped, error_count: r.errors.length,
          })),
          pre_import_snapshot_tables: Object.keys(preImportSnapshot),
          ...(JSON.stringify(preImportSnapshot).length < 50000
            ? { pre_import_snapshot: preImportSnapshot }
            : { pre_import_snapshot: "TRUNCATED_TOO_LARGE" }),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: totalErrors === 0,
        dry_run: isDryRun,
        file_key,
        results,
        summary: {
          tables_processed: results.length,
          total_inserted: totalInserted,
          total_updated: totalUpdated,
          total_skipped: totalSkipped,
          total_errors: totalErrors,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("restore-cloud-backup error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
