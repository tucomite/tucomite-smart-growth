
-- P1.c — Extend audit_logs for enterprise auditability (OWASP: when/where/who/what)
-- Additive only; existing trigger log_audit_event and existing rows keep working.

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS event_type      text,
  ADD COLUMN IF NOT EXISTS severity        text,
  ADD COLUMN IF NOT EXISTS source          text,
  ADD COLUMN IF NOT EXISTS actor           text,
  ADD COLUMN IF NOT EXISTS result          text,
  ADD COLUMN IF NOT EXISTS method          text,
  ADD COLUMN IF NOT EXISTS endpoint        text,
  ADD COLUMN IF NOT EXISTS status_code     integer,
  ADD COLUMN IF NOT EXISTS duration_ms     integer,
  ADD COLUMN IF NOT EXISTS ip              inet,
  ADD COLUMN IF NOT EXISTS user_agent      text,
  ADD COLUMN IF NOT EXISTS request_id      text,
  ADD COLUMN IF NOT EXISTS correlation_id  text;

-- Controlled enums via CHECK (nullable so existing rows are unaffected).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_severity_check') THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_severity_check
      CHECK (severity IS NULL OR severity IN ('debug','info','notice','warning','error','critical'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_result_check') THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_result_check
      CHECK (result IS NULL OR result IN ('success','failure','denied'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_actor_check') THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_actor_check
      CHECK (actor IS NULL OR actor IN ('user','system','cron','anonymous','service'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_event_type_check') THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_event_type_check
      CHECK (event_type IS NULL OR event_type IN (
        -- auth
        'auth_login','auth_logout','auth_oauth','auth_denied',
        -- invoices / OCR
        'invoice_uploaded','ocr_started','ocr_completed','ocr_failed',
        'invoice_validated','invoice_applied','invoice_reversed',
        -- domain mutations
        'supplier_changed','price_changed','stock_changed','ingredient_changed',
        -- committee / cron
        'committee_nightly_started','committee_nightly_completed','committee_nightly_failed',
        -- security
        'hmac_denied','signature_replay','rate_limited','permission_denied',
        -- errors
        'validation_failed','rpc_failed','storage_upload_failed','critical_error'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_restaurant_created
  ON public.audit_logs (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_created
  ON public.audit_logs (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation
  ON public.audit_logs (correlation_id)
  WHERE correlation_id IS NOT NULL;

-- SECURITY DEFINER RPC — server-only writer.
-- Fixed search_path (PG hardening) + EXECUTE revoked from PUBLIC, granted only to service_role.
CREATE OR REPLACE FUNCTION public.record_audit_event(
  _event_type      text,
  _severity        text DEFAULT 'info',
  _source          text DEFAULT NULL,
  _actor           text DEFAULT NULL,
  _result          text DEFAULT NULL,
  _restaurant_id   uuid DEFAULT NULL,
  _user_id         uuid DEFAULT NULL,
  _method          text DEFAULT NULL,
  _endpoint        text DEFAULT NULL,
  _status_code     integer DEFAULT NULL,
  _duration_ms     integer DEFAULT NULL,
  _ip              text DEFAULT NULL,
  _user_agent      text DEFAULT NULL,
  _request_id      text DEFAULT NULL,
  _correlation_id  text DEFAULT NULL,
  _metadata        jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_ip inet := NULL;
BEGIN
  -- Defensive cast for IP (drop silently on bad format; never fail the caller).
  IF _ip IS NOT NULL AND length(_ip) > 0 THEN
    BEGIN
      v_ip := _ip::inet;
    EXCEPTION WHEN others THEN
      v_ip := NULL;
    END;
  END IF;

  INSERT INTO public.audit_logs(
    restaurant_id, user_id, action, table_name, record_id, metadata,
    event_type, severity, source, actor, result,
    method, endpoint, status_code, duration_ms,
    ip, user_agent, request_id, correlation_id
  )
  VALUES (
    _restaurant_id, _user_id, COALESCE(_event_type, 'unknown'), NULL, NULL, _metadata,
    _event_type, COALESCE(_severity,'info'), _source, _actor, _result,
    _method, _endpoint, _status_code, _duration_ms,
    v_ip, _user_agent, _request_id, _correlation_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_audit_event(
  text,text,text,text,text,uuid,uuid,text,text,integer,integer,text,text,text,text,jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_audit_event(
  text,text,text,text,text,uuid,uuid,text,text,integer,integer,text,text,text,text,jsonb
) TO service_role;
