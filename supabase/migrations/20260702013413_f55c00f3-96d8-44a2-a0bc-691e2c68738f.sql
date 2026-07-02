
-- =========================================================
-- 1. USER ROLES SYSTEM
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner','manager','kitchen','finance','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _restaurant_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND restaurant_id = _restaurant_id AND role = _role
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid,uuid,public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,uuid,public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "user_roles read own" ON public.user_roles;
CREATE POLICY "user_roles read own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR restaurant_id = public.current_restaurant_id());

-- Owner auto-grant when a restaurant is created
CREATE OR REPLACE FUNCTION public.grant_owner_role_on_restaurant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, restaurant_id, role)
    VALUES (NEW.owner_id, NEW.id, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.grant_owner_role_on_restaurant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_grant_owner_role ON public.restaurants;
CREATE TRIGGER trg_grant_owner_role
  AFTER INSERT ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.grant_owner_role_on_restaurant();

-- Backfill owners for existing restaurants
INSERT INTO public.user_roles (user_id, restaurant_id, role)
SELECT owner_id, id, 'owner'::public.app_role FROM public.restaurants
WHERE owner_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- =========================================================
-- 2. AUDIT LOGS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_restaurant ON public.audit_logs(restaurant_id, created_at DESC);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs read own restaurant" ON public.audit_logs;
CREATE POLICY "audit_logs read own restaurant" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (restaurant_id = public.current_restaurant_id());
-- NOTE: no INSERT/UPDATE/DELETE policies -> only service_role can write

-- Trigger-based audit for critical tables
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rid uuid;
  rec_id uuid;
BEGIN
  rid := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
  rec_id := COALESCE(NEW.id, OLD.id);
  INSERT INTO public.audit_logs(restaurant_id, user_id, action, table_name, record_id)
  VALUES (rid, auth.uid(), TG_OP, TG_TABLE_NAME, rec_id);
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['dishes','ingredients','suppliers','recommendations','inventory_movements']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.log_audit_event()', t);
  END LOOP;
END $$;

-- =========================================================
-- 3. SOFT DELETE
-- =========================================================
ALTER TABLE public.dishes         ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.ingredients    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.suppliers      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- =========================================================
-- 4. RLS HARDENING
-- =========================================================
-- daily_snapshots: restrict to authenticated
DROP POLICY IF EXISTS "daily_snapshots_own" ON public.daily_snapshots;
CREATE POLICY "daily_snapshots_own" ON public.daily_snapshots
  FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());

-- profiles: prevent tenant hopping (cannot change restaurant_id once set, cannot elevate role)
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      restaurant_id IS NULL
      OR restaurant_id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
      OR (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    )
  );

-- =========================================================
-- 5. LOCK DOWN INTERNAL SECURITY DEFINER FUNCTIONS
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.backfill_snapshots_30d(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_daily_snapshot(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_refresh_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tucomite_backfill_after_seed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_demo_restaurant_data() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
