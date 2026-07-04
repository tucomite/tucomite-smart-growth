// Postgres-backed rate limiter. Uses the SECURITY DEFINER
// `public.check_rate_limit(key, max, window_sec)` RPC and the
// service-role client (RPC is only executable by service_role).
//
// Throws a `Response(429)` on limit exceeded — TanStack server functions
// forward thrown Responses back to the caller unchanged.
//
// Key convention: `<endpoint>:<scope>:<id>`
//   e.g. `upload_invoice:user:9f1c...`, `apply_invoice:restaurant:8a3e...`.

export type RateLimitOpts = {
  key: string;
  max: number;
  windowSec: number;
};

export async function enforceRateLimit(opts: RateLimitOpts): Promise<void> {
  const { key, max, windowSec } = opts;
  if (!key || max <= 0 || windowSec <= 0) {
    throw new Error("rate_limit_bad_params");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
    _key: key,
    _max: max,
    _window_sec: windowSec,
  });

  if (error) {
    // Fail-closed on unexpected DB errors: log server-side, deny with a generic 503.
    console.error("[rate_limit] rpc_failed", { key, error: error.message });
    throw new Response("Service temporarily unavailable", { status: 503 });
  }

  if (data === false) {
    throw new Response(
      JSON.stringify({ error: "rate_limited", retry_after_sec: windowSec }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(windowSec),
        },
      },
    );
  }
}