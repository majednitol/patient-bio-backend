import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UploadRequest {
  run_id: string;
  backup_data: Record<string, unknown[]>;
  destination: "local" | "cloudflare_r2" | "both";
  schedule_name?: string;
}

// ── AWS Signature V4 helpers for R2 (S3-compatible) ──

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

async function uploadToCloudflareR2(
  data: string,
  fileName: string,
  endpointUrl: string,
  bucketName: string,
  accessKeyId: string,
  secretAccessKey: string
): Promise<{ url: string }> {
  // Normalize endpoint: remove trailing slashes
  const cleanEndpoint = endpointUrl.replace(/\/+$/, "");
  const url = new URL(`${cleanEndpoint}/${bucketName}/${fileName}`);
  const host = url.hostname;
  const path = url.pathname;
  const region = "auto";
  const service = "s3";

  // Encode body to bytes for consistent content-length
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
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}\n`)
    .join("");

  const canonicalRequest = [
    "PUT",
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

  console.log(`R2 upload: PUT ${url.toString()} (${bodyBytes.byteLength} bytes, host=${host}, path=${path})`);

  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: { ...headers, Authorization: authorization },
    body: bodyBytes,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`R2 response: status=${res.status}, body=${errText}`);
    throw new Error(`R2 upload failed (${res.status}): ${errText}`);
  }

  // Consume body to avoid leak
  await res.text();

  return { url: url.toString() };
}

async function uploadToLocalStorage(
  serviceClient: ReturnType<typeof createClient>,
  data: string,
  fileName: string
): Promise<{ path: string }> {
  const { error } = await serviceClient.storage
    .from("backups")
    .upload(fileName, new Blob([data], { type: "application/json" }), {
      contentType: "application/json",
      upsert: false,
    });

  if (error) throw new Error(`Local storage upload failed: ${error.message}`);
  return { path: fileName };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { run_id, backup_data, destination, schedule_name } =
      (await req.json()) as UploadRequest;

    if (!run_id || !backup_data || !destination) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: run_id, backup_data, destination" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = (schedule_name ?? "backup").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${safeName}_${timestamp}.json`;
    const dataStr = JSON.stringify(backup_data);

    let cloudFileUrl: string | null = null;
    let cloudUploadStatus = "skipped";
    let localPath: string | null = null;

    // Upload to local storage
    if (destination === "local" || destination === "both") {
      try {
        const result = await uploadToLocalStorage(serviceClient, dataStr, fileName);
        localPath = result.path;
      } catch (err) {
        console.error("Local upload error:", err);
      }
    }

    // Upload to Cloudflare R2
    if (destination === "cloudflare_r2" || destination === "both") {
      try {
        const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
        const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
        const endpointUrl = Deno.env.get("R2_ENDPOINT_URL");
        const bucketName = Deno.env.get("R2_BUCKET_NAME");

        if (!accessKeyId || !secretAccessKey || !endpointUrl || !bucketName) {
          throw new Error("Cloudflare R2 credentials not configured (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT_URL, R2_BUCKET_NAME)");
        }

        const result = await uploadToCloudflareR2(dataStr, fileName, endpointUrl, bucketName, accessKeyId, secretAccessKey);
        cloudFileUrl = result.url;
        cloudUploadStatus = "uploaded";
      } catch (err) {
        console.warn("R2 upload failed, falling back to local storage:", err);
        cloudUploadStatus = "fallback_local";

        // Automatic local fallback if not already saved locally
        if (!localPath) {
          try {
            const fallback = await uploadToLocalStorage(serviceClient, dataStr, fileName);
            localPath = fallback.path;
            console.info("Fallback local upload succeeded:", localPath);
          } catch (localErr) {
            console.error("Fallback local upload also failed:", localErr);
            cloudUploadStatus = "failed";
          }
        }
      }
    }

    // Update the backup run record
    await serviceClient
      .from("backup_runs")
      .update({
        cloud_file_url: cloudFileUrl,
        cloud_upload_status: cloudUploadStatus,
        storage_destination: destination,
      })
      .eq("id", run_id);

    return new Response(
      JSON.stringify({
        success: true,
        cloud_upload_status: cloudUploadStatus,
        cloud_file_url: cloudFileUrl,
        local_path: localPath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("backup-cloud-upload error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
