
-- 1. Drop demo triggers (function seed_demo_restaurant_data() kept for /demo use)
DROP TRIGGER IF EXISTS seed_demo_on_restaurant_insert ON public.restaurants;
DROP TRIGGER IF EXISTS backfill_snapshots_on_restaurant ON public.restaurants;

-- 2. Detect affected restaurants by demo markers, then clean
DO $$
DECLARE
  demo_rids uuid[];
BEGIN
  SELECT array_agg(DISTINCT rid) INTO demo_rids FROM (
    SELECT restaurant_id AS rid FROM public.committee_activity
      WHERE title IN ('Chef IA revisó tu carta','Informe ejecutivo generado','Finanzas recalculó tus márgenes','Compras comparó proveedores','Stock detectó ingredientes críticos','Marketing sugirió una promoción')
    UNION
    SELECT restaurant_id FROM public.recommendations
      WHERE title IN ('Sube 1,40 € el precio de Gambas al ajillo','Sustituye tu proveedor de aceite','Retira Croquetas del menú de mediodía','Rediseña la carta: elimina 4 platos','Promo cruzada: Merluza + Vino Ribera')
  ) t WHERE rid IS NOT NULL;

  IF demo_rids IS NULL OR array_length(demo_rids,1) = 0 THEN
    RAISE NOTICE 'No demo-seeded restaurants found';
    RETURN;
  END IF;

  RAISE NOTICE 'Cleaning demo data for restaurants: %', demo_rids;

  DELETE FROM public.recommendations       WHERE restaurant_id = ANY(demo_rids);
  DELETE FROM public.committee_activity    WHERE restaurant_id = ANY(demo_rids);
  DELETE FROM public.daily_snapshots       WHERE restaurant_id = ANY(demo_rids);
  DELETE FROM public.dish_ingredients      WHERE restaurant_id = ANY(demo_rids);
  DELETE FROM public.dishes                WHERE restaurant_id = ANY(demo_rids);
  DELETE FROM public.ingredients           WHERE restaurant_id = ANY(demo_rids);
  DELETE FROM public.suppliers             WHERE restaurant_id = ANY(demo_rids);

  UPDATE public.restaurants
     SET menu_imported_at = NULL, updated_at = now()
   WHERE id = ANY(demo_rids);
END $$;
