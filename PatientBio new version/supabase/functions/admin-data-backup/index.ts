import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXPORTABLE_TABLES = [
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

type ExportableTable = (typeof EXPORTABLE_TABLES)[number];

/** Tables known to have a `created_at` column for date-range filtering. */
const TABLES_WITH_CREATED_AT: ReadonlySet<string> = new Set(EXPORTABLE_TABLES);

const BATCH_SIZE = 1000;

/** Fetch all rows from a table using range-based pagination, with optional date filtering. */
async function fetchAllRows(
  client: ReturnType<typeof createClient>,
  table: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<{ rows: unknown[]; error: string | null }> {
  const allRows: unknown[] = [];
  let offset = 0;

  while (true) {
    let query = client.from(table).select("*");

    // Apply date-range filters if provided and table supports it
    if (dateFrom && TABLES_WITH_CREATED_AT.has(table)) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo && TABLES_WITH_CREATED_AT.has(table)) {
      query = query.lte("created_at", dateTo);
    }

    query = query.range(offset, offset + BATCH_SIZE - 1);

    const { data, error } = await query;

    if (error) {
      return { rows: [], error: error.message };
    }

    if (data && data.length > 0) {
      allRows.push(...data);
    }

    if (!data || data.length < BATCH_SIZE) {
      break;
    }

    offset += BATCH_SIZE;
  }

  return { rows: allRows, error: null };
}

/** Compute SHA-256 hex digest of a string. */
async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
    const { action, tables, format, date_from, date_to } = body as {
      action: "export" | "counts";
      tables?: string[];
      format?: "json" | "csv";
      date_from?: string;
      date_to?: string;
    };

    if (action === "counts") {
      const counts: Record<string, number> = {};
      for (const table of EXPORTABLE_TABLES) {
        const { count } = await serviceClient
          .from(table)
          .select("*", { count: "exact", head: true });
        counts[table] = count ?? 0;
      }
      return new Response(JSON.stringify({ counts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "export") {
      if (!tables || !Array.isArray(tables) || tables.length === 0) {
        return new Response(JSON.stringify({ error: "No tables selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validTables = tables.filter((t): t is ExportableTable =>
        EXPORTABLE_TABLES.includes(t as ExportableTable)
      );

      if (validTables.length === 0) {
        return new Response(JSON.stringify({ error: "No valid tables selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const exportData: Record<string, unknown[]> = {};
      const rowCounts: Record<string, number> = {};

      for (const table of validTables) {
        const { rows, error } = await fetchAllRows(serviceClient, table, date_from, date_to);
        if (error) {
          console.error(`Error exporting ${table}:`, error);
          exportData[table] = [];
          rowCounts[table] = 0;
        } else {
          exportData[table] = rows;
          rowCounts[table] = rows.length;
        }
      }

      const exportPayload = {
        metadata: {
          exported_at: new Date().toISOString(),
          admin_email: userEmail,
          format: format ?? "json",
          tables_exported: validTables,
          row_counts: rowCounts,
          total_rows: Object.values(rowCounts).reduce((a, b) => a + b, 0),
          date_from: date_from ?? null,
          date_to: date_to ?? null,
          checksum_sha256: "", // placeholder, computed below
        },
        tables: exportData,
      };

      // Compute SHA-256 checksum over the tables payload
      const tablesStr = JSON.stringify(exportData);
      exportPayload.metadata.checksum_sha256 = await sha256(tablesStr);

      // Record audit trail entry — let the DB trigger compute event_hash & previous_hash
      await serviceClient.from("audit_trail").insert({
        event_type: "SYSTEM_BACKUP",
        entity_type: "system",
        entity_id: null,
        user_id: userId,
        action: "backup_exported",
        details: {
          tables: validTables,
          row_counts: rowCounts,
          format: format ?? "json",
          admin_email: userEmail,
          exported_at: exportPayload.metadata.exported_at,
          checksum_sha256: exportPayload.metadata.checksum_sha256,
          date_from: date_from ?? null,
          date_to: date_to ?? null,
        },
      });

      return new Response(JSON.stringify(exportPayload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Backup error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
