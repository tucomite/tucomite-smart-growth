
-- 1. Drop demo seed trigger for real users (keep function for /demo mode)
DROP TRIGGER IF EXISTS seed_demo_restaurant ON public.restaurants;

-- 2. menu_imported_at marker on restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS menu_imported_at timestamptz;

-- 3. menu_imports table
CREATE TABLE IF NOT EXISTS public.menu_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('excel','pdf','photos','scratch')),
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded','processing','needs_review','confirmed','failed','cancelled')),
  storage_path text,
  original_filename text,
  extracted_json jsonb,
  error_code text,
  error_message text,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  dishes_created integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_imports_restaurant
  ON public.menu_imports(restaurant_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_imports TO authenticated;
GRANT ALL ON public.menu_imports TO service_role;

ALTER TABLE public.menu_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_imports scoped to own restaurant" ON public.menu_imports;
CREATE POLICY "menu_imports scoped to own restaurant"
  ON public.menu_imports
  FOR ALL
  TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());

DROP TRIGGER IF EXISTS menu_imports_touch ON public.menu_imports;
CREATE TRIGGER menu_imports_touch
  BEFORE UPDATE ON public.menu_imports
  FOR EACH ROW EXECUTE FUNCTION public.tucomite_touch_updated_at();

-- 4. Storage policies for private "menus" bucket
--    Path convention: {restaurant_id}/{...}
DROP POLICY IF EXISTS "menus_bucket_select" ON storage.objects;
CREATE POLICY "menus_bucket_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'menus'
    AND (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );

DROP POLICY IF EXISTS "menus_bucket_insert" ON storage.objects;
CREATE POLICY "menus_bucket_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'menus'
    AND (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );

-- No UPDATE or DELETE policies on purpose: menu files are append-only for now.

-- 5. confirm_menu_import RPC
-- Persists dishes from extracted_json (validated shape) as real rows,
-- marks the import as confirmed and stamps restaurants.menu_imported_at.
-- Idempotent: a second call on an already-confirmed import is a no-op.
CREATE OR REPLACE FUNCTION public.confirm_menu_import(_import_id uuid)
RETURNS public.menu_imports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imp public.menu_imports;
  v_uid uuid := auth.uid();
  v_rid uuid := public.current_restaurant_id();
  v_dish jsonb;
  v_name text;
  v_category text;
  v_price numeric;
  v_desc text;
  v_created integer := 0;
BEGIN
  SELECT * INTO v_imp FROM public.menu_imports WHERE id = _import_id FOR UPDATE;
  IF v_imp.id IS NULL THEN
    RAISE EXCEPTION 'import_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;
  IF v_imp.restaurant_id <> v_rid THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_imp.status = 'confirmed' THEN
    RETURN v_imp; -- idempotent
  END IF;
  IF v_imp.status NOT IN ('uploaded','needs_review','processing') THEN
    RAISE EXCEPTION 'invalid_status:%', v_imp.status USING ERRCODE = '22023';
  END IF;
  IF v_imp.extracted_json IS NULL
     OR jsonb_typeof(v_imp.extracted_json -> 'dishes') <> 'array'
     OR jsonb_array_length(v_imp.extracted_json -> 'dishes') = 0 THEN
    RAISE EXCEPTION 'no_dishes_to_confirm' USING ERRCODE = '22023';
  END IF;

  FOR v_dish IN SELECT * FROM jsonb_array_elements(v_imp.extracted_json -> 'dishes') LOOP
    v_name := NULLIF(btrim(COALESCE(v_dish ->> 'name','')), '');
    IF v_name IS NULL THEN CONTINUE; END IF;
    v_category := NULLIF(btrim(COALESCE(v_dish ->> 'category','')), '');
    v_desc := NULLIF(btrim(COALESCE(v_dish ->> 'description','')), '');
    BEGIN
      v_price := NULLIF(v_dish ->> 'sale_price','')::numeric;
    EXCEPTION WHEN others THEN
      v_price := NULL;
    END;

    INSERT INTO public.dishes
      (restaurant_id, name, category, sale_price, cost, margin, status, description)
    VALUES
      (v_imp.restaurant_id, v_name, v_category, v_price, NULL, NULL, 'active', v_desc);
    v_created := v_created + 1;
  END LOOP;

  UPDATE public.menu_imports
     SET status = 'confirmed',
         confirmed_at = now(),
         confirmed_by = v_uid,
         dishes_created = v_created,
         updated_at = now()
   WHERE id = v_imp.id
  RETURNING * INTO v_imp;

  UPDATE public.restaurants
     SET menu_imported_at = COALESCE(menu_imported_at, now()),
         updated_at = now()
   WHERE id = v_imp.restaurant_id;

  RETURN v_imp;
END $$;

REVOKE EXECUTE ON FUNCTION public.confirm_menu_import(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_menu_import(uuid) TO authenticated;
