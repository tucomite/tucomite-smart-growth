
-- ============================================================
-- P0 Security Hardening: anti-replay + RLS/FK indexes
-- ============================================================

-- 1) ANTI-REPLAY: tabla de firmas HMAC ya consumidas
CREATE TABLE IF NOT EXISTS public.hmac_nonces (
  signature   text PRIMARY KEY,
  bucket      text NOT NULL,             -- ruta/endpoint que emitió la firma
  signed_ts   bigint NOT NULL,           -- timestamp firmado (unix)
  expires_at  timestamptz NOT NULL,      -- signed_ts + ventana
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hmac_nonces_expires ON public.hmac_nonces (expires_at);

-- Solo el service_role (webhooks internos) escribe/lee. Nadie más.
REVOKE ALL ON public.hmac_nonces FROM anon, authenticated;
GRANT ALL ON public.hmac_nonces TO service_role;
ALTER TABLE public.hmac_nonces ENABLE ROW LEVEL SECURITY;
-- Sin policies → deny-all a anon/authenticated (defense in depth).

-- Función SECURITY DEFINER: reserva la firma o devuelve conflicto.
-- Devuelve true si es la primera vez (aceptar); false si ya fue usada (replay).
CREATE OR REPLACE FUNCTION public.claim_hmac_nonce(
  _signature text,
  _bucket    text,
  _signed_ts bigint,
  _window_sec integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF _signature IS NULL OR length(_signature) < 16 THEN
    RAISE EXCEPTION 'invalid_signature';
  END IF;
  IF _window_sec <= 0 OR _window_sec > 3600 THEN
    RAISE EXCEPTION 'invalid_window';
  END IF;

  BEGIN
    INSERT INTO public.hmac_nonces(signature, bucket, signed_ts, expires_at)
    VALUES (_signature, _bucket, _signed_ts, to_timestamp(_signed_ts) + make_interval(secs => _window_sec));
  EXCEPTION WHEN unique_violation THEN
    RETURN FALSE; -- replay
  END;

  -- housekeeping oportunista
  IF random() < 0.01 THEN
    DELETE FROM public.hmac_nonces WHERE expires_at < now() - interval '1 hour';
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_hmac_nonce(text, text, bigint, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_hmac_nonce(text, text, bigint, integer) TO service_role;

-- 2) ÍNDICES RLS: columnas restaurant_id sin índice líder
CREATE INDEX IF NOT EXISTS idx_automation_rules_restaurant   ON public.automation_rules(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_committee_activity_restaurant ON public.committee_activity(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_committee_log_restaurant      ON public.committee_log(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dish_ingredients_restaurant   ON public.dish_ingredients(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_dishes_restaurant             ON public.dishes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_restaurant        ON public.ingredients(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant      ON public.notifications(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_restaurant    ON public.recommendations(restaurant_id, priority);
CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant          ON public.suppliers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_restaurant         ON public.user_roles(restaurant_id);

-- 3) ÍNDICES FK: para joins y borrados en cascada eficientes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice            ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_matched_ingredient ON public.invoice_items(matched_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ingredient   ON public.inventory_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_invoice_app_runs_invoice         ON public.invoice_application_runs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier                ON public.invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_supplier             ON public.ingredients(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_alt_supplier         ON public.ingredients(alternative_supplier_id);
CREATE INDEX IF NOT EXISTS idx_dish_ingredients_ingredient      ON public.dish_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_rule            ON public.automation_tasks(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_recommendation  ON public.automation_tasks(recommendation_id);
