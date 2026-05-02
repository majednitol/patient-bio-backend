import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmartConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  introspection_endpoint?: string;
  revocation_endpoint?: string;
  capabilities: string[];
}

function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// AES-256-GCM encryption for OAuth tokens
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyStr = Deno.env.get("SMART_ENCRYPTION_KEY");
  let keyBytes: Uint8Array;
  if (keyStr && keyStr.length >= 32) {
    keyBytes = new TextEncoder().encode(keyStr.slice(0, 32));
  } else {
    // Derive a key from the service role key as fallback
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serviceKey));
    keyBytes = new Uint8Array(hash);
  }
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptToken(token: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token)
  );
  // Store as base64: iv (12 bytes) + ciphertext
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/smart-launch", "");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // /.well-known/smart-configuration endpoint
    if (path === "/.well-known/smart-configuration" || url.searchParams.get("action") === "configuration") {
      const config: SmartConfiguration = {
        authorization_endpoint: `${supabaseUrl}/functions/v1/smart-launch?action=authorize`,
        token_endpoint: `${supabaseUrl}/functions/v1/smart-launch?action=token`,
        capabilities: [
          "launch-standalone",
          "launch-ehr",
          "client-public",
          "client-confidential-symmetric",
          "sso-openid-connect",
          "context-passthrough-banner",
          "context-passthrough-style",
          "context-ehr-patient",
          "context-ehr-encounter",
          "permission-offline",
          "permission-patient",
          "permission-user",
        ],
      };

      return new Response(JSON.stringify(config), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initiate SMART launch
    if (req.method === "POST" && url.searchParams.get("action") === "initiate") {
      const body = await req.json();
      const { iss, launch, clientId, scope, redirectUri } = body;

      if (!iss || !clientId) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters: iss, clientId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const state = generateState();
      const launchToken = launch || generateState();

      const { data: session, error: sessionError } = await supabase
        .from("smart_launch_sessions")
        .insert({
          launch_token: launchToken,
          state,
          ehr_url: iss,
          client_id: clientId,
          scope: scope?.split(" ") || ["openid", "fhirUser", "patient/*.read"],
          status: "pending",
        })
        .select()
        .single();

      if (sessionError) {
        console.error("Failed to create launch session:", sessionError);
        return new Response(
          JSON.stringify({ error: "Failed to create launch session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const authParams = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri || `${supabaseUrl}/functions/v1/smart-launch?action=callback`,
        scope: scope || "openid fhirUser patient/*.read",
        state,
        aud: iss,
      });

      if (launch) {
        authParams.set("launch", launch);
      }

      let authorizationUrl = `${iss}/authorize`;
      try {
        const smartConfigResponse = await fetch(`${iss}/.well-known/smart-configuration`);
        if (smartConfigResponse.ok) {
          const smartConfig = await smartConfigResponse.json();
          if (smartConfig.authorization_endpoint) {
            authorizationUrl = smartConfig.authorization_endpoint;
          }
        }
      } catch (_e) {
        console.log("Could not fetch SMART configuration, using default endpoint");
      }

      return new Response(
        JSON.stringify({
          authorizationUrl: `${authorizationUrl}?${authParams.toString()}`,
          state,
          sessionId: session.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OAuth callback handler
    if (url.searchParams.get("action") === "callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        return new Response(
          JSON.stringify({ error, error_description: url.searchParams.get("error_description") }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!code || !state) {
        return new Response(
          JSON.stringify({ error: "Missing code or state parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: session, error: sessionError } = await supabase
        .from("smart_launch_sessions")
        .select("id, launch_token, state, ehr_url, client_id, scope, status, patient_context, encounter_context, fhir_user, user_id, error_message, created_at, expires_at")
        .eq("state", state)
        .eq("status", "pending")
        .single();

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired state parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        let tokenEndpoint = `${session.ehr_url}/token`;
        try {
          const smartConfigResponse = await fetch(`${session.ehr_url}/.well-known/smart-configuration`);
          if (smartConfigResponse.ok) {
            const smartConfig = await smartConfigResponse.json();
            if (smartConfig.token_endpoint) {
              tokenEndpoint = smartConfig.token_endpoint;
            }
          }
        } catch (_e) {
          console.log("Could not fetch SMART configuration for token endpoint");
        }

        const tokenResponse = await fetch(tokenEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: session.client_id,
            redirect_uri: `${supabaseUrl}/functions/v1/smart-launch?action=callback`,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error(`Token exchange failed: ${await tokenResponse.text()}`);
        }

        const tokens = await tokenResponse.json();

        // Encrypt tokens using AES-256-GCM before storing
        const encryptedAccessToken = await encryptToken(tokens.access_token);
        const encryptedRefreshToken = tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null;

        await supabase
          .from("smart_launch_sessions")
          .update({
            status: "authorized",
            patient_context: tokens.patient,
            encounter_context: tokens.encounter,
            fhir_user: tokens.fhirUser || tokens.id_token?.fhirUser,
            access_token_encrypted: encryptedAccessToken,
            refresh_token_encrypted: encryptedRefreshToken,
            token_expires_at: tokens.expires_in
              ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
              : null,
          })
          .eq("id", session.id);

        const redirectParams = new URLSearchParams({
          session_id: session.id,
          patient: tokens.patient || "",
          encounter: tokens.encounter || "",
        });

        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            Location: `/smart-launch-complete?${redirectParams.toString()}`,
          },
        });
      } catch (tokenError: unknown) {
        const errorMessage = tokenError instanceof Error ? tokenError.message : "Unknown error";
        console.error("Token exchange error:", tokenError);
        
        await supabase
          .from("smart_launch_sessions")
          .update({
            status: "error",
            error_message: errorMessage,
          })
          .eq("id", session.id);

        return new Response(
          JSON.stringify({ error: "Token exchange failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get launch session status
    if (req.method === "GET" && url.searchParams.get("action") === "session") {
      const sessionId = url.searchParams.get("session_id");
      
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "Missing session_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: session, error } = await supabase
        .from("smart_launch_sessions")
        .select("id, status, patient_context, encounter_context, fhir_user, ehr_url, scope, created_at, expires_at")
        .eq("id", sessionId)
        .single();

      if (error || !session) {
        return new Response(
          JSON.stringify({ error: "Session not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify(session), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Complete the launch and associate with user
    if (req.method === "POST" && url.searchParams.get("action") === "complete") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid authorization" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { sessionId } = await req.json();

      const { data: session, error: updateError } = await supabase
        .from("smart_launch_sessions")
        .update({
          user_id: user.id,
          status: "completed",
        })
        .eq("id", sessionId)
        .eq("status", "authorized")
        .select()
        .single();

      if (updateError || !session) {
        return new Response(
          JSON.stringify({ error: "Failed to complete launch session" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          patientContext: session.patient_context,
          encounterContext: session.encounter_context,
          fhirUser: session.fhir_user,
          ehrUrl: session.ehr_url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("SMART launch error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
