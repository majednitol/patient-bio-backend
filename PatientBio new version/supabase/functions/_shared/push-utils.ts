/**
 * Shared VAPID Web Push Notification Utility
 * 
 * Extracted from individual edge functions to eliminate code duplication
 * and reduce cold-start overhead from repeated module initialization.
 */

export interface PushSubscriptionRecord {
  id?: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
}

// Cache the imported crypto key to avoid re-importing on every call within the same invocation
let cachedCryptoKey: CryptoKey | null = null;
let cachedKeySource: string | null = null;

async function getSigningKey(vapidPrivateKey: string): Promise<CryptoKey> {
  if (cachedCryptoKey && cachedKeySource === vapidPrivateKey) {
    return cachedCryptoKey;
  }

  const privateKeyBytes = Uint8Array.from(
    atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  cachedCryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  cachedKeySource = vapidPrivateKey;
  return cachedCryptoKey;
}

function base64urlEncode(data: string): string {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Send a web push notification to a single subscription endpoint.
 * Caches the VAPID signing key for the lifetime of the function invocation.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionRecord,
  payload: PushPayload,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    const header = { typ: "JWT", alg: "ES256" };
    const jwtPayload = {
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: "mailto:notifications@patientbio.app",
    };

    const headerEncoded = base64urlEncode(JSON.stringify(header));
    const payloadEncoded = base64urlEncode(JSON.stringify(jwtPayload));
    const unsignedToken = `${headerEncoded}.${payloadEncoded}`;

    const cryptoKey = await getSigningKey(vapidPrivateKey);

    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      encoder.encode(unsignedToken)
    );

    const signatureArray = new Uint8Array(signature);
    let signatureB64 = "";
    signatureArray.forEach((byte) => {
      signatureB64 += String.fromCharCode(byte);
    });
    const signatureEncoded = base64urlEncode(signatureB64);
    const jwt = `${unsignedToken}.${signatureEncoded}`;

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Push failed (${response.status}):`, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Push notification error:", error);
    return false;
  }
}

/**
 * Send push notifications to all subscriptions for a given user.
 * Returns true if at least one push was delivered.
 */
export async function sendPushToUser(
  supabase: any,
  userId: string,
  payload: PushPayload,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<boolean> {
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) return false;

  let anySent = false;
  for (const sub of subscriptions as PushSubscriptionRecord[]) {
    const sent = await sendPushNotification(sub, payload, vapidPrivateKey, vapidPublicKey);
    if (sent) anySent = true;
  }
  return anySent;
}
