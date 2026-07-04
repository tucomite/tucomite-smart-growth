// HMAC verification for public hooks (committee-nightly, future webhooks).
// Header format:  x-signature: t=<unix_seconds>,v1=<hex_sha256>
// Canonical string signed:  `${timestamp}.${rawBody}`
// Timing-safe compare + 5-minute skew window + one-shot nonce store
// (public.claim_hmac_nonce) to block replay attacks within the window.

const DEFAULT_MAX_SKEW_SEC = 300;

function parseSignatureHeader(header: string): { t: string; v1: string } | null {
  const parts = header.split(",").map((s) => s.trim());
  let t: string | null = null;
  let v1: string | null = null;
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k === "t") t = v;
    if (k === "v1") v1 = v;
  }
  if (!t || !v1) return null;
  return { t, v1 };
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const b = parseInt(hex.substr(i * 2, 2), 16);
    if (Number.isNaN(b)) return null;
    out[i] = b;
  }
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type HmacVerifyResult =
  | { ok: true }
  | { ok: false; status: 401 | 403; code: string };

/**
 * Verify a public-hook request signed with HMAC-SHA256.
 * Reads the raw body ONCE — callers must use the returned body, not re-read `request`.
 */
export async function verifyHmacRequest(
  request: Request,
  secret: string | undefined,
  opts: { maxSkewSec?: number; bucket?: string } = {},
): Promise<{ result: HmacVerifyResult; rawBody: string }> {
  const rawBody = await request.text();
  if (!secret) {
    return { result: { ok: false, status: 403, code: "hmac_secret_not_configured" }, rawBody };
  }
  const header = request.headers.get("x-signature");
  if (!header) {
    return { result: { ok: false, status: 401, code: "missing_signature" }, rawBody };
  }
  const parsed = parseSignatureHeader(header);
  if (!parsed) {
    return { result: { ok: false, status: 401, code: "malformed_signature" }, rawBody };
  }
  const tsNum = Number(parsed.t);
  if (!Number.isFinite(tsNum)) {
    return { result: { ok: false, status: 401, code: "bad_timestamp" }, rawBody };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const maxSkew = opts.maxSkewSec ?? DEFAULT_MAX_SKEW_SEC;
  if (Math.abs(nowSec - tsNum) > maxSkew) {
    return { result: { ok: false, status: 401, code: "expired_signature" }, rawBody };
  }
  const expectedHex = await hmacSha256Hex(secret, `${parsed.t}.${rawBody}`);
  const gotBytes = hexToBytes(parsed.v1);
  const expBytes = hexToBytes(expectedHex);
  if (!gotBytes || !expBytes || !timingSafeEqual(gotBytes, expBytes)) {
    return { result: { ok: false, status: 401, code: "signature_mismatch" }, rawBody };
  }

  // Anti-replay within window: reserve this exact signature as a one-shot nonce.
  // Uses SECURITY DEFINER RPC restricted to service_role.
  const bucket = opts.bucket ?? new URL(request.url).pathname;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fresh, error } = await supabaseAdmin.rpc("claim_hmac_nonce", {
      _signature: parsed.v1,
      _bucket: bucket,
      _signed_ts: tsNum,
      _window_sec: maxSkew,
    });
    if (error) {
      // Fail-closed: if we cannot register the nonce, reject rather than allow replay.
      console.error("[hmac] nonce_rpc_failed", { bucket, error: error.message });
      return { result: { ok: false, status: 401, code: "replay_check_failed" }, rawBody };
    }
    if (fresh === false) {
      return { result: { ok: false, status: 401, code: "signature_replay" }, rawBody };
    }
  } catch (err) {
    console.error("[hmac] nonce_unexpected", err);
    return { result: { ok: false, status: 401, code: "replay_check_failed" }, rawBody };
  }

  return { result: { ok: true }, rawBody };
}