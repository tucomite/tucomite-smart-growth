
-- 1) daily_snapshots table
CREATE TABLE IF NOT EXISTS public.daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  date date NOT NULL,
  saved_detected numeric NOT NULL DEFAULT 0,
  saved_applied numeric NOT NULL DEFAULT 0,
  recs_applied integer NOT NULL DEFAULT 0,
  recs_pending integer NOT NULL DEFAULT 0,
  avg_margin numeric NOT NULL DEFAULT 0,
  stock_value numeric NOT NULL DEFAULT 0,
  waste_estimate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_snapshots TO authenticated;
GRANT ALL ON public.daily_snapshots TO service_role;

ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_snapshots_own" ON public.daily_snapshots;
CREATE POLICY "daily_snapshots_own" ON public.daily_snapshots
  FOR ALL USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());

-- 2) Function to (re)compute today's snapshot from live data
CREATE OR REPLACE FUNCTION public.refresh_daily_snapshot(rid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saved_detected numeric := 0;
  v_saved_applied  numeric := 0;
  v_recs_applied   integer := 0;
  v_recs_pending   integer := 0;
  v_avg_margin     numeric := 0;
  v_stock_value    numeric := 0;
  v_waste_estimate numeric := 0;
BEGIN
  IF rid IS NULL THEN RETURN; END IF;

  SELECT
    COALESCE(SUM(CASE WHEN status <> 'applied' THEN economic_impact ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status  = 'applied' THEN economic_impact ELSE 0 END), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'applied'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status <> 'applied'), 0)
  INTO v_saved_detected, v_saved_applied, v_recs_applied, v_recs_pending
  FROM public.recommendations WHERE restaurant_id = rid;

  SELECT COALESCE(AVG(margin), 0) INTO v_avg_margin
  FROM public.dishes WHERE restaurant_id = rid AND margin IS NOT NULL;

  SELECT COALESCE(SUM(COALESCE(current_price,0) * COALESCE(stock_quantity,0)), 0)
  INTO v_stock_value
  FROM public.ingredients WHERE restaurant_id = rid;

  SELECT COALESCE(SUM(
    COALESCE(current_price,0) * COALESCE(stock_quantity,0) *
    CASE
      WHEN expiration_date IS NULL THEN 0
      WHEN expiration_date <= CURRENT_DATE + INTERVAL '1 day' THEN 0.35
      WHEN expiration_date <= CURRENT_DATE + INTERVAL '3 days' THEN 0.15
      WHEN expiration_date <= CURRENT_DATE + INTERVAL '7 days' THEN 0.05
      ELSE 0
    END
  ), 0)
  INTO v_waste_estimate
  FROM public.ingredients WHERE restaurant_id = rid;

  INSERT INTO public.daily_snapshots
    (restaurant_id, date, saved_detected, saved_applied, recs_applied, recs_pending, avg_margin, stock_value, waste_estimate)
  VALUES
    (rid, CURRENT_DATE, v_saved_detected, v_saved_applied, v_recs_applied, v_recs_pending, v_avg_margin, v_stock_value, v_waste_estimate)
  ON CONFLICT (restaurant_id, date) DO UPDATE SET
    saved_detected = EXCLUDED.saved_detected,
    saved_applied  = EXCLUDED.saved_applied,
    recs_applied   = EXCLUDED.recs_applied,
    recs_pending   = EXCLUDED.recs_pending,
    avg_margin     = EXCLUDED.avg_margin,
    stock_value    = EXCLUDED.stock_value,
    waste_estimate = EXCLUDED.waste_estimate,
    updated_at     = now();
END; $$;

GRANT EXECUTE ON FUNCTION public.refresh_daily_snapshot(uuid) TO authenticated, service_role;

-- 3) Trigger fn: refresh snapshot after any mutation on relevant tables
CREATE OR REPLACE FUNCTION public.trg_refresh_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE rid uuid;
BEGIN
  rid := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
  PERFORM public.refresh_daily_snapshot(rid);
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS snap_recs ON public.recommendations;
CREATE TRIGGER snap_recs AFTER INSERT OR UPDATE OR DELETE ON public.recommendations
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_snapshot();

DROP TRIGGER IF EXISTS snap_dishes ON public.dishes;
CREATE TRIGGER snap_dishes AFTER INSERT OR UPDATE OR DELETE ON public.dishes
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_snapshot();

DROP TRIGGER IF EXISTS snap_ings ON public.ingredients;
CREATE TRIGGER snap_ings AFTER INSERT OR UPDATE OR DELETE ON public.ingredients
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_snapshot();

-- 4) Backfill last 30 days deterministically from current values (curva realista)
CREATE OR REPLACE FUNCTION public.backfill_snapshots_30d(rid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_avg_margin numeric;
  base_stock numeric;
  base_saved numeric;
  base_pending integer;
  d date;
  i integer;
  ratio numeric;
BEGIN
  IF rid IS NULL THEN RETURN; END IF;

  SELECT COALESCE(AVG(margin), 55) INTO base_avg_margin FROM public.dishes WHERE restaurant_id = rid AND margin IS NOT NULL;
  SELECT COALESCE(SUM(COALESCE(current_price,0)*COALESCE(stock_quantity,0)), 0) INTO base_stock FROM public.ingredients WHERE restaurant_id = rid;
  SELECT COALESCE(SUM(economic_impact), 0), COALESCE(COUNT(*), 0)
    INTO base_saved, base_pending FROM public.recommendations WHERE restaurant_id = rid AND status <> 'applied';

  FOR i IN 1..30 LOOP
    d := CURRENT_DATE - (30 - i);
    -- growth curve 0.72 → 1.00
    ratio := 0.72 + (i::numeric / 30.0) * 0.28;
    INSERT INTO public.daily_snapshots
      (restaurant_id, date, saved_detected, saved_applied, recs_applied, recs_pending, avg_margin, stock_value, waste_estimate)
    VALUES (
      rid, d,
      round((base_saved * ratio)::numeric, 2),
      round((base_saved * ratio * (i::numeric / 40.0))::numeric, 2),
      GREATEST(0, floor((i::numeric / 6.0))::int),
      GREATEST(0, base_pending - floor((i::numeric / 6.0))::int),
      round((base_avg_margin * (0.9 + (i::numeric/30.0)*0.15))::numeric, 2),
      round((base_stock * (0.85 + sin(i::numeric/4.0)*0.08))::numeric, 2),
      round((base_stock * 0.05 * (1.2 - (i::numeric/30.0)*0.4))::numeric, 2)
    )
    ON CONFLICT (restaurant_id, date) DO NOTHING;
  END LOOP;

  PERFORM public.refresh_daily_snapshot(rid);
END; $$;

GRANT EXECUTE ON FUNCTION public.backfill_snapshots_30d(uuid) TO authenticated, service_role;

-- 5) Auto-backfill on new restaurant creation, right after demo seed
CREATE OR REPLACE FUNCTION public.tucomite_backfill_after_seed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.backfill_snapshots_30d(NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS backfill_snapshots_on_restaurant ON public.restaurants;
CREATE TRIGGER backfill_snapshots_on_restaurant
AFTER INSERT ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.tucomite_backfill_after_seed();

-- 6) Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.recommendations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.dishes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ingredients;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.committee_activity;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_snapshots;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
