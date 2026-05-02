import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMPORTABLE_TABLES = [
  "user_profiles",
  "user_roles",
  "health_records",
  "access_tokens",
  "access_logs",
  "prescriptions",
  "appointments",
  "doctor_profiles",
  "pathologist_profiles",
  "researcher_profiles",
  "hospitals",
  "hospital_staff",
  "audit_trail",
  "blockchain_transactions",
  "consent_records",
  "data_access_requests",
  "doctor_patient_access",
  "pathologist_reports",
  "patient_wallets",
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

/** Compute SHA-256 hex digest of a string. */
async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Dry-run: simulate import by checking which IDs exist. */
async function dryRunTable(
  client: ReturnType<typeof createClient>,
  table: string,
  rows: Record<string, unknown>[],
  mode: "upsert" | "skip" | "replace",
): Promise<ImportSummary> {
  const summary: ImportSummary = { table, inserted: 0, updated: 0, skipped: 0, errors: [] };
  if (!rows || rows.length === 0) return summary;

  const ids = rows.map((r) => r.id).filter(Boolean) as string[];

  // Check which IDs already exist
  let existingIds = new Set<string>();
  if (ids.length > 0) {
    for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
      const batch = ids.slice(offset, offset + BATCH_SIZE);
      const { data } = await client.from(table).select("id").in("id", batch);
      if (data) {
        for (const row of data) existingIds.add((row as { id: string }).id);
      }
    }
  }

  for (const row of rows) {
    const exists = row.id ? existingIds.has(row.id as string) : false;
    if (mode === "skip") {
      if (exists) summary.skipped++;
      else summary.inserted++;
    } else if (mode === "replace") {
      if (exists) summary.updated++;
      else summary.inserted++;
    } else {
      // upsert
      if (exists) summary.updated++;
      else summary.inserted++;
    }
  }

  return summary;
}

/** Capture pre-import snapshot of rows that will be affected. */
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

/** Upsert rows into a table in batches. */
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
        const { data, error } = await client
          .from(table)
          .insert(batch as Record<string, unknown>[])
          .select("id");

        if (error) {
          if (error.code === "23505") {
            summary.skipped += batch.length;
          } else {
            summary.errors.push(`Batch at offset ${offset}: ${error.message}`);
          }
        } else {
          summary.inserted += data?.length ?? batch.length;
        }
      } else if (mode === "replace") {
        const ids = batch.map((r) => r.id).filter(Boolean);
        if (ids.length > 0) {
          await client.from(table).delete().in("id", ids);
        }
        const { data, error } = await client
          .from(table)
          .insert(batch as Record<string, unknown>[])
          .select("id");

        if (error) {
          summary.errors.push(`Batch at offset ${offset}: ${error.message}`);
        } else {
          summary.updated += data?.length ?? batch.length;
        }
      } else {
        const { data, error } = await client
          .from(table)
          .upsert(batch as Record<string, unknown>[], {
            onConflict: "id",
            ignoreDuplicates: false,
          })
          .select("id");

        if (error) {
          summary.errors.push(`Batch at offset ${offset}: ${error.message}`);
        } else {
          summary.inserted += data?.length ?? batch.length;
        }
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, payload, conflict_mode, checksum, dry_run } = body as {
      action: "validate" | "import";
      payload?: {
        metadata?: Record<string, unknown>;
        tables?: Record<string, Record<string, unknown>[]>;
      };
      conflict_mode?: "upsert" | "skip" | "replace";
      checksum?: string;
      dry_run?: boolean;
    };

    // === VALIDATE action ===
    if (action === "validate") {
      if (!payload?.tables || typeof payload.tables !== "object") {
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid backup format: missing 'tables' object." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const tableNames = Object.keys(payload.tables);
      const validTables: string[] = [];
      const invalidTables: string[] = [];
      const tableSummary: Record<string, number> = {};

      for (const name of tableNames) {
        if (IMPORTABLE_TABLES.includes(name as ImportableTable)) {
          validTables.push(name);
          tableSummary[name] = Array.isArray(payload.tables[name])
            ? payload.tables[name].length
            : 0;
        } else {
          invalidTables.push(name);
        }
      }

      let checksumValid: boolean | null = null;
      if (checksum && payload.tables) {
        const computed = await sha256(JSON.stringify(payload.tables));
        checksumValid = computed === checksum;
      }

      return new Response(
        JSON.stringify({
          valid: validTables.length > 0,
          validTables,
          invalidTables,
          tableSummary,
          totalRows: Object.values(tableSummary).reduce((a, b) => a + b, 0),
          checksumValid,
          metadata: payload.metadata ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // === IMPORT action (real or dry-run) ===
    if (action === "import") {
      if (!payload?.tables || typeof payload.tables !== "object") {
        return new Response(
          JSON.stringify({ error: "Invalid backup format: missing 'tables' object." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const mode = conflict_mode ?? "upsert";
      const isDryRun = dry_run === true;
      const results: ImportSummary[] = [];
      const preImportSnapshot: Record<string, Record<string, unknown>[]> = {};

      for (const [tableName, rows] of Object.entries(payload.tables)) {
        if (!IMPORTABLE_TABLES.includes(tableName as ImportableTable)) {
          results.push({
            table: tableName,
            inserted: 0,
            updated: 0,
            skipped: 0,
            errors: [`Table '${tableName}' is not importable.`],
          });
          continue;
        }

        if (!Array.isArray(rows)) {
          results.push({
            table: tableName,
            inserted: 0,
            updated: 0,
            skipped: 0,
            errors: [`Data for '${tableName}' is not an array.`],
          });
          continue;
        }

        if (isDryRun) {
          const summary = await dryRunTable(serviceClient, tableName, rows, mode);
          results.push(summary);
        } else {
          // Capture pre-import snapshot for safety
          const snapshot = await captureSnapshot(serviceClient, tableName, rows);
          if (snapshot.length > 0) {
            // Truncate snapshot to max 100 rows per table to avoid oversized audit entries
            preImportSnapshot[tableName] = snapshot.slice(0, 100);
          }

          const summary = await upsertBatch(serviceClient, tableName, rows, mode);
          results.push(summary);
        }
      }

      const totalInserted = results.reduce((a, r) => a + r.inserted, 0);
      const totalUpdated = results.reduce((a, r) => a + r.updated, 0);
      const totalSkipped = results.reduce((a, r) => a + r.skipped, 0);
      const totalErrors = results.reduce((a, r) => a + r.errors.length, 0);

      // Record audit trail entry (skip for dry-run)
      if (!isDryRun) {
        await serviceClient.from("audit_trail").insert({
          event_type: "SYSTEM_RESTORE",
          entity_type: "system",
          entity_id: null,
          user_id: userId,
          action: "backup_imported",
          details: {
            tables_imported: results.map((r) => r.table),
            conflict_mode: mode,
            total_inserted: totalInserted,
            total_updated: totalUpdated,
            total_skipped: totalSkipped,
            total_errors: totalErrors,
            admin_email: userEmail,
            imported_at: new Date().toISOString(),
            per_table_results: results.map((r) => ({
              table: r.table,
              inserted: r.inserted,
              updated: r.updated,
              skipped: r.skipped,
              error_count: r.errors.length,
            })),
            pre_import_snapshot_tables: Object.keys(preImportSnapshot),
            pre_import_snapshot_row_counts: Object.fromEntries(
              Object.entries(preImportSnapshot).map(([k, v]) => [k, v.length]),
            ),
            // Store snapshot separately only if small enough (<50KB serialized)
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
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'validate' or 'import'." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Import error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
