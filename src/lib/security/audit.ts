// Server-only audit event writer.
// Writes go through the SECURITY DEFINER RPC `public.record_audit_event`,
// whose EXECUTE is revoked from PUBLIC and granted only to service_role.
//
// Design contract:
// - Best-effort: audit failures NEVER break the caller's request. We swallow
//   errors and log a single structured warning server-side.
// - No secrets, no tokens, no JWT, no full payloads. Callers must project
//   only safe fields into `metadata`.
// - `event_type`, `severity`, `result`, `actor` are constrained by CHECK
//   constraints in the DB; unknown values will reject at INSERT time (and be
//   swallowed here). Keep the taxonomy in sync with the migration.

export type AuditActor = "user" | "system" | "cron" | "anonymous" | "service";
export type AuditResult = "success" | "failure" | "denied";
export type AuditSeverity =
  | "debug"
  | "info"
  | "notice"
  | "warning"
  | "error"
  | "critical";

export type AuditEventType =
  | "auth_login"
  | "auth_logout"
  | "auth_oauth"
  | "auth_denied"
  | "invoice_uploaded"
  | "ocr_started"
  | "ocr_completed"
  | "ocr_failed"
  | "invoice_validated"
  | "invoice_applied"
  | "invoice_reversed"
  | "supplier_changed"
  | "price_changed"
  | "stock_changed"
  | "ingredient_changed"
  | "committee_nightly_started"
  | "committee_nightly_completed"
  | "committee_nightly_failed"
  | "hmac_denied"
  | "signature_replay"
  | "rate_limited"
  | "permission_denied"
  | "validation_failed"
  | "rpc_failed"
  | "storage_upload_failed"
  | "critical_error";

export type AuditEvent = {
  event_type: AuditEventType;
  severity?: AuditSeverity;
  source?: string;
  actor?: AuditActor;
  result?: AuditResult;
  restaurant_id?: string | null;
  user_id?: string | null;
  method?: string | null;
  endpoint?: string | null;
  status_code?: number | null;
  duration_ms?: number | null;
  ip?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
  correlation_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Best-effort audit write. Never throws. */
export async function recordAuditEvent(evt: AuditEvent): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const und = <T>(v: T | null | undefined): T | undefined =>
      v === null || v === undefined ? undefined : v;
    const { error } = await supabaseAdmin.rpc("record_audit_event", {
      _event_type: evt.event_type,
      _severity: evt.severity ?? "info",
      _source: und(evt.source),
      _actor: und(evt.actor),
      _result: und(evt.result),
      _restaurant_id: und(evt.restaurant_id),
      _user_id: und(evt.user_id),
      _method: und(evt.method),
      _endpoint: und(evt.endpoint),
      _status_code: und(evt.status_code),
      _duration_ms: und(evt.duration_ms),
      _ip: und(evt.ip),
      _user_agent: und(evt.user_agent),
      _request_id: und(evt.request_id),
      _correlation_id: und(evt.correlation_id),
      _metadata: (evt.metadata ?? undefined) as never,
    });
    if (error) {
      // Structured warning only — no payloads, no secrets.
      console.warn("[audit] write_failed", {
        event_type: evt.event_type,
        code: error.code,
      });
    }
  } catch (err) {
    console.warn("[audit] write_unexpected", {
      event_type: evt.event_type,
      message: err instanceof Error ? err.message : "unknown",
    });
  }
}

/**
 * Extract safe request context (IP, UA, request/correlation IDs) from a Fetch
 * `Request`. Never returns secrets or authorization headers.
 */
export function auditContextFromRequest(request: Request): {
  ip: string | null;
  user_agent: string | null;
  request_id: string | null;
  correlation_id: string | null;
  method: string;
  endpoint: string;
} {
  const h = request.headers;
  const xff = h.get("x-forwarded-for") ?? "";
  const ip = (xff.split(",")[0] || h.get("cf-connecting-ip") || "").trim() || null;
  const ua = (h.get("user-agent") ?? "").slice(0, 255) || null;
  const requestId = h.get("x-request-id");
  // W3C Trace Context — traceparent is safe to persist as correlation.
  const traceparent = h.get("traceparent");
  let corr: string | null = null;
  if (traceparent) {
    // Format: version-traceid-spanid-flags; take the trace-id (32 hex chars).
    const parts = traceparent.split("-");
    if (parts.length >= 3 && /^[0-9a-f]{32}$/i.test(parts[1])) corr = parts[1];
  }
  let endpoint = "";
  try {
    endpoint = new URL(request.url).pathname;
  } catch {
    endpoint = "";
  }
  return {
    ip,
    user_agent: ua,
    request_id: requestId,
    correlation_id: corr,
    method: request.method,
    endpoint,
  };
}