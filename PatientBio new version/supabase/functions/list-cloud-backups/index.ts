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

interface R2Object {
  key: string;
  size: number;
  lastModified: string;
}

async function listR2Objects(
  endpointUrl: string,
  bucketName: string,
  accessKeyId: string,
  secretAccessKey: string,
  prefix?: string,
  maxKeys?: number,
): Promise<R2Object[]> {
  const cleanEndpoint = endpointUrl.replace(/\/+$/, "");
  const queryParams = new URLSearchParams({ "list-type": "2" });
  if (prefix) queryParams.set("prefix", prefix);
  if (maxKeys) queryParams.set("max-keys", maxKeys.toString());

  const url = new URL(`${cleanEndpoint}/${bucketName}?${queryParams.toString()}`);
  const host = url.hostname;
  const path = url.pathname;
  const queryString = url.search.slice(1); // remove leading ?
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
    queryString,
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

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { ...headers, Authorization: authorization },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`R2 ListObjects failed (${res.status}): ${errText}`);
  }

  const xmlText = await res.text();

  // Parse XML response for <Contents> elements
  const objects: R2Object[] = [];
  const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match;
  while ((match = contentsRegex.exec(xmlText)) !== null) {
    const block = match[1];
    const key = block.match(/<Key>(.*?)<\/Key>/)?.[1] ?? "";
    const size = parseInt(block.match(/<Size>(.*?)<\/Size>/)?.[1] ?? "0", 10);
    const lastModified = block.match(/<LastModified>(.*?)<\/LastModified>/)?.[1] ?? "";
    if (key) {
      objects.push({ key, size, lastModified });
    }
  }

  return objects;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get R2 credentials
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const endpointUrl = Deno.env.get("R2_ENDPOINT_URL");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");

    if (!accessKeyId || !secretAccessKey || !endpointUrl || !bucketName) {
      return new Response(
        JSON.stringify({ error: "Cloudflare R2 credentials not configured", backups: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse optional query params from body
    let prefix: string | undefined;
    let maxKeys: number | undefined;
    try {
      const body = await req.json();
      prefix = body.prefix;
      maxKeys = body.max_keys;
    } catch {
      // No body is fine
    }

    const objects = await listR2Objects(endpointUrl, bucketName, accessKeyId, secretAccessKey, prefix, maxKeys ?? 100);

    // Sort by lastModified descending (newest first)
    objects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    return new Response(
      JSON.stringify({ backups: objects, count: objects.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("list-cloud-backups error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
