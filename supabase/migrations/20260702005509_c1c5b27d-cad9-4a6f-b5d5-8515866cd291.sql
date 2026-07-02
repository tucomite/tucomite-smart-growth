
-- 1. Extend dishes
ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS chef_notes TEXT,
  ADD COLUMN IF NOT EXISTS labor_cost NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_margin NUMERIC NOT NULL DEFAULT 65,
  ADD COLUMN IF NOT EXISTS popularity INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS monthly_sales INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recommended_price NUMERIC;

-- 2. Extend ingredients
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS alternative_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS alternative_price NUMERIC;

-- 3. dish_ingredients join table
CREATE TABLE IF NOT EXISTS public.dish_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dish_id, ingredient_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dish_ingredients TO authenticated;
GRANT ALL ON public.dish_ingredients TO service_role;

ALTER TABLE public.dish_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dish_ingredients_by_restaurant" ON public.dish_ingredients;
CREATE POLICY "dish_ingredients_by_restaurant" ON public.dish_ingredients
  FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());

DROP TRIGGER IF EXISTS dish_ingredients_touch ON public.dish_ingredients;
CREATE TRIGGER dish_ingredients_touch BEFORE UPDATE ON public.dish_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.tucomite_touch_updated_at();

-- 4. Replace seed function to include richer data
CREATE OR REPLACE FUNCTION public.seed_demo_restaurant_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s1 uuid; s2 uuid; s3 uuid;
  d_merluza uuid; d_ensalada uuid; d_gambas uuid; d_croquetas uuid; d_tarta uuid; d_entrecot uuid;
  i_tomate uuid; i_aceite uuid; i_merluza uuid; i_gambas uuid; i_harina uuid; i_queso uuid; i_vino uuid; i_ajo uuid; i_entrecot uuid;
BEGIN
  INSERT INTO public.suppliers (restaurant_id, name, contact_name, phone, email, delivery_time, rating)
  VALUES (NEW.id, 'Distribuciones Mediterráneo', 'Juan Pérez', '+34 611 222 333', 'juan@mediterraneo.es', '24 h', 4.7)
  RETURNING id INTO s1;
  INSERT INTO public.suppliers (restaurant_id, name, contact_name, phone, email, delivery_time, rating)
  VALUES (NEW.id, 'Pescados del Puerto', 'María López', '+34 622 333 444', 'maria@pescadosdelpuerto.es', '12 h', 4.9)
  RETURNING id INTO s2;
  INSERT INTO public.suppliers (restaurant_id, name, contact_name, phone, email, delivery_time, rating)
  VALUES (NEW.id, 'Bodega Ribera', 'Carlos Ruiz', '+34 633 444 555', 'carlos@bodegaribera.es', '48 h', 4.5)
  RETURNING id INTO s3;

  INSERT INTO public.ingredients (restaurant_id, name, unit, current_price, stock_quantity, stock_minimum, expiration_date, supplier_id, alternative_supplier_id, alternative_price) VALUES
    (NEW.id, 'Tomate rama', 'kg', 2.40, 12, 5, (now() + interval '4 days')::date, s1, s2, 2.10) RETURNING id INTO i_tomate;
  INSERT INTO public.ingredients (restaurant_id, name, unit, current_price, stock_quantity, stock_minimum, expiration_date, supplier_id, alternative_supplier_id, alternative_price) VALUES
    (NEW.id, 'Aceite oliva virgen extra', 'L', 6.80, 8, 3, (now() + interval '180 days')::date, s1, s3, 5.85) RETURNING id INTO i_aceite;
  INSERT INTO public.ingredients (restaurant_id, name, unit, current_price, stock_quantity, stock_minimum, expiration_date, supplier_id) VALUES
    (NEW.id, 'Merluza fresca', 'kg', 14.50, 6, 2, (now() + interval '2 days')::date, s2) RETURNING id INTO i_merluza;
  INSERT INTO public.ingredients (restaurant_id, name, unit, current_price, stock_quantity, stock_minimum, expiration_date, supplier_id, alternative_supplier_id, alternative_price) VALUES
    (NEW.id, 'Gambas rojas', 'kg', 32.00, 3, 2, (now() + interval '1 day')::date, s2, s1, 27.50) RETURNING id INTO i_gambas;
  INSERT INTO public.ingredients (restaurant_id, name, unit, current_price, stock_quantity, stock_minimum, expiration_date, supplier_id) VALUES
    (NEW.id, 'Harina de trigo', 'kg', 0.95, 20, 10, (now() + interval '90 days')::date, s1) RETURNING id INTO i_harina;
  INSERT INTO public.ingredients (restaurant_id, name, unit, current_price, stock_quantity, stock_minimum, expiration_date, supplier_id) VALUES
    (NEW.id, 'Queso manchego curado', 'kg', 18.00, 4, 2, (now() + interval '30 days')::date, s1) RETURNING id INTO i_queso;
  INSERT INTO public.ingredients (restaurant_id, name, unit, current_price, stock_quantity, stock_minimum, expiration_date, supplier_id) VALUES
    (NEW.id, 'Vino tinto Ribera', 'botella', 8.50, 24, 12, (now() + interval '365 days')::date, s3) RETURNING id INTO i_vino;
  INSERT INTO public.ingredients (restaurant_id, name, unit, current_price, stock_quantity, stock_minimum, expiration_date, supplier_id) VALUES
    (NEW.id, 'Ajo fresco', 'kg', 3.20, 5, 2, (now() + interval '20 days')::date, s1) RETURNING id INTO i_ajo;
  INSERT INTO public.ingredients (restaurant_id, name, unit, current_price, stock_quantity, stock_minimum, expiration_date, supplier_id, alternative_supplier_id, alternative_price) VALUES
    (NEW.id, 'Entrecot de vaca', 'kg', 22.00, 7, 3, (now() + interval '5 days')::date, s2, s1, 19.50) RETURNING id INTO i_entrecot;

  INSERT INTO public.dishes (restaurant_id, name, category, description, sale_price, cost, margin, labor_cost, target_margin, popularity, monthly_sales, recommended_price, allergens, status, chef_notes) VALUES
    (NEW.id, 'Merluza a la vasca', 'Principales', 'Merluza fresca en salsa verde con ajo y perejil.', 22.00, 8.40, 61.8, 2.10, 65, 78, 210, 22.00, ARRAY['pescado','gluten'], 'active', 'Receta clásica con 6 ingredientes. Complejidad media.') RETURNING id INTO d_merluza;
  INSERT INTO public.dishes (restaurant_id, name, category, description, sale_price, cost, margin, labor_cost, target_margin, popularity, monthly_sales, recommended_price, allergens, status, chef_notes) VALUES
    (NEW.id, 'Ensalada de tomate y queso', 'Entrantes', 'Tomate rama, queso manchego y aceite virgen extra.', 9.50, 2.30, 75.8, 0.90, 70, 96, 245, 9.50, ARRAY['lactosa'], 'active', 'Receta simple. 3 ingredientes principales.') RETURNING id INTO d_ensalada;
  INSERT INTO public.dishes (restaurant_id, name, category, description, sale_price, cost, margin, labor_cost, target_margin, popularity, monthly_sales, recommended_price, allergens, status, chef_notes) VALUES
    (NEW.id, 'Gambas al ajillo', 'Entrantes', 'Gambas rojas salteadas con ajo, aceite y guindilla.', 14.00, 10.90, 22.1, 1.20, 65, 82, 265, 15.40, ARRAY['crustáceos'], 'active', 'El coste del ingrediente principal ha subido un 18% respecto al trimestre anterior.') RETURNING id INTO d_gambas;
  INSERT INTO public.dishes (restaurant_id, name, category, description, sale_price, cost, margin, labor_cost, target_margin, popularity, monthly_sales, recommended_price, allergens, status, chef_notes) VALUES
    (NEW.id, 'Croquetas caseras', 'Entrantes', 'Croquetas de queso manchego, elaboración artesanal.', 8.00, 2.10, 73.8, 1.40, 65, 55, 140, 8.00, ARRAY['gluten','lactosa'], 'active', 'Elaboración lenta. Considera lote semanal para reducir tiempos.') RETURNING id INTO d_croquetas;
  INSERT INTO public.dishes (restaurant_id, name, category, description, sale_price, cost, margin, labor_cost, target_margin, popularity, monthly_sales, recommended_price, allergens, status, chef_notes) VALUES
    (NEW.id, 'Tarta de queso al horno', 'Postres', 'Al estilo La Viña. Corazón cremoso.', 6.50, 1.80, 72.3, 0.60, 65, 40, 105, 6.50, ARRAY['lactosa','huevo','gluten'], 'active', 'Postre estrella. Alta rotación en cenas.') RETURNING id INTO d_tarta;
  INSERT INTO public.dishes (restaurant_id, name, category, description, sale_price, cost, margin, labor_cost, target_margin, popularity, monthly_sales, recommended_price, allergens, status, chef_notes) VALUES
    (NEW.id, 'Entrecot a la parrilla', 'Principales', 'Entrecot madurado a la brasa, guarnición de patata.', 24.90, 8.30, 66.7, 2.20, 65, 85, 120, 24.90, ARRAY[]::text[], 'active', 'Producto premium con excelente margen. Mantener en carta.') RETURNING id INTO d_entrecot;

  -- dish_ingredients
  INSERT INTO public.dish_ingredients (restaurant_id, dish_id, ingredient_id, quantity) VALUES
    (NEW.id, d_gambas, i_gambas, 0.18),
    (NEW.id, d_gambas, i_aceite, 0.05),
    (NEW.id, d_gambas, i_ajo, 0.02),
    (NEW.id, d_merluza, i_merluza, 0.22),
    (NEW.id, d_merluza, i_aceite, 0.03),
    (NEW.id, d_merluza, i_ajo, 0.01),
    (NEW.id, d_ensalada, i_tomate, 0.20),
    (NEW.id, d_ensalada, i_queso, 0.08),
    (NEW.id, d_ensalada, i_aceite, 0.02),
    (NEW.id, d_croquetas, i_harina, 0.08),
    (NEW.id, d_croquetas, i_queso, 0.05),
    (NEW.id, d_tarta, i_queso, 0.12),
    (NEW.id, d_tarta, i_harina, 0.05),
    (NEW.id, d_entrecot, i_entrecot, 0.30),
    (NEW.id, d_entrecot, i_aceite, 0.02);

  INSERT INTO public.recommendations (restaurant_id, title, problem, cause, solution, economic_impact, time_impact, priority, status) VALUES
    (NEW.id, 'Sube 1,40 € el precio de Gambas al ajillo',
     'Margen del 22% muy por debajo del objetivo del 65%.',
     'El proveedor de gambas rojas subió sus tarifas un 18% el mes pasado.',
     'Ajustar el PVP a 15,40 € y comunicarlo con una etiqueta de "producto premium".',
     380, NULL, 'high', 'pending'),
    (NEW.id, 'Sustituye tu proveedor de aceite',
     'Estás pagando un 14% por encima del precio medio de mercado.',
     'Contrato antiguo sin renegociar desde hace más de un año.',
     'Cambiar a Distribuciones Mediterráneo y consolidar pedido semanal.',
     210, NULL, 'medium', 'pending'),
    (NEW.id, 'Retira Croquetas del menú de mediodía',
     'Rotación muy baja en la franja 13:00–16:00.',
     'Compite con el menú del día y no aporta margen adicional.',
     'Ofrecerlas solo en cena como aperitivo señalizado.',
     140, NULL, 'low', 'pending'),
    (NEW.id, 'Rediseña la carta: elimina 4 platos',
     'Carta demasiado larga (42 platos) que genera desperdicio.',
     'Ingredientes exclusivos para platos con menos de 4 ventas semanales.',
     'Reducir a 28 platos rentables y simplificar operativa de cocina.',
     620, '3 h/semana', 'high', 'pending'),
    (NEW.id, 'Promo cruzada: Merluza + Vino Ribera',
     'Vino tinto Ribera con baja rotación y stock elevado.',
     'Falta de sugerencia de maridaje activa en sala.',
     'Menú maridaje "Merluza + copa Ribera" a 27,90 €.',
     480, NULL, 'medium', 'pending');

  INSERT INTO public.committee_activity (restaurant_id, title, description, type) VALUES
    (NEW.id, 'Chef IA revisó tu carta', 'Analizó 42 platos y detectó 4 candidatos a mejora.', 'chef'),
    (NEW.id, 'Finanzas recalculó tus márgenes', 'Reajustó costes con los últimos precios de proveedores.', 'finance'),
    (NEW.id, 'Compras comparó proveedores', 'Evaluó 3 alternativas para aceite y harina.', 'purchasing'),
    (NEW.id, 'Stock detectó ingredientes críticos', '2 ingredientes caducan en menos de 3 días.', 'stock'),
    (NEW.id, 'Marketing sugirió una promoción', 'Maridaje Merluza + Vino Ribera para aumentar el ticket medio.', 'marketing'),
    (NEW.id, 'Informe ejecutivo generado', 'Consolidación de 5 recomendaciones con impacto estimado de 1.830 €/mes.', 'report');

  RETURN NEW;
END; $function$;

-- 5. Backfill existing restaurants: enrich dishes, add Entrecot ingredient/dish, and populate dish_ingredients.
DO $$
DECLARE r RECORD; s_pescados uuid; s_medit uuid; ent_ing uuid; ent_dish uuid;
BEGIN
  FOR r IN SELECT id AS rid FROM public.restaurants LOOP
    -- Enrich existing dishes fields (only where defaults)
    UPDATE public.dishes SET
      description = COALESCE(description, CASE name
        WHEN 'Gambas al ajillo' THEN 'Gambas rojas salteadas con ajo, aceite y guindilla.'
        WHEN 'Merluza a la vasca' THEN 'Merluza fresca en salsa verde con ajo y perejil.'
        WHEN 'Ensalada de tomate y queso' THEN 'Tomate rama, queso manchego y aceite virgen extra.'
        WHEN 'Croquetas caseras' THEN 'Croquetas de queso manchego, elaboración artesanal.'
        WHEN 'Tarta de queso al horno' THEN 'Al estilo La Viña. Corazón cremoso.'
        ELSE description END),
      labor_cost = CASE name
        WHEN 'Gambas al ajillo' THEN 1.20
        WHEN 'Merluza a la vasca' THEN 2.10
        WHEN 'Ensalada de tomate y queso' THEN 0.90
        WHEN 'Croquetas caseras' THEN 1.40
        WHEN 'Tarta de queso al horno' THEN 0.60
        ELSE labor_cost END,
      popularity = CASE name
        WHEN 'Gambas al ajillo' THEN 82
        WHEN 'Merluza a la vasca' THEN 78
        WHEN 'Ensalada de tomate y queso' THEN 96
        WHEN 'Croquetas caseras' THEN 55
        WHEN 'Tarta de queso al horno' THEN 40
        ELSE popularity END,
      monthly_sales = CASE name
        WHEN 'Gambas al ajillo' THEN 265
        WHEN 'Merluza a la vasca' THEN 210
        WHEN 'Ensalada de tomate y queso' THEN 245
        WHEN 'Croquetas caseras' THEN 140
        WHEN 'Tarta de queso al horno' THEN 105
        ELSE monthly_sales END,
      recommended_price = CASE name
        WHEN 'Gambas al ajillo' THEN 15.40
        ELSE COALESCE(recommended_price, sale_price) END,
      chef_notes = COALESCE(chef_notes, CASE name
        WHEN 'Gambas al ajillo' THEN 'El coste del ingrediente principal ha subido un 18% respecto al trimestre anterior.'
        WHEN 'Merluza a la vasca' THEN 'Receta clásica con 6 ingredientes. Complejidad media.'
        WHEN 'Ensalada de tomate y queso' THEN 'Receta simple. 3 ingredientes principales.'
        WHEN 'Croquetas caseras' THEN 'Elaboración lenta. Considera lote semanal para reducir tiempos.'
        WHEN 'Tarta de queso al horno' THEN 'Postre estrella. Alta rotación en cenas.'
        ELSE chef_notes END)
    WHERE restaurant_id = r.rid;

    -- Fill alternative supplier for a couple of ingredients
    SELECT id INTO s_pescados FROM public.suppliers WHERE restaurant_id = r.rid AND name = 'Pescados del Puerto' LIMIT 1;
    SELECT id INTO s_medit FROM public.suppliers WHERE restaurant_id = r.rid AND name = 'Distribuciones Mediterráneo' LIMIT 1;
    UPDATE public.ingredients SET alternative_supplier_id = s_medit, alternative_price = 27.50
      WHERE restaurant_id = r.rid AND name = 'Gambas rojas' AND alternative_supplier_id IS NULL;
    UPDATE public.ingredients SET alternative_supplier_id = s_pescados, alternative_price = 2.10
      WHERE restaurant_id = r.rid AND name = 'Tomate rama' AND alternative_supplier_id IS NULL;
    UPDATE public.ingredients SET alternative_price = 5.85
      WHERE restaurant_id = r.rid AND name = 'Aceite oliva virgen extra' AND alternative_price IS NULL;

    -- Add Entrecot ingredient if missing
    IF NOT EXISTS (SELECT 1 FROM public.ingredients WHERE restaurant_id = r.rid AND name = 'Entrecot de vaca') THEN
      INSERT INTO public.ingredients (restaurant_id, name, unit, current_price, stock_quantity, stock_minimum, expiration_date, supplier_id, alternative_supplier_id, alternative_price)
      VALUES (r.rid, 'Entrecot de vaca', 'kg', 22.00, 7, 3, (now() + interval '5 days')::date, s_pescados, s_medit, 19.50)
      RETURNING id INTO ent_ing;
    ELSE
      SELECT id INTO ent_ing FROM public.ingredients WHERE restaurant_id = r.rid AND name = 'Entrecot de vaca' LIMIT 1;
    END IF;

    -- Add Entrecot dish if missing
    IF NOT EXISTS (SELECT 1 FROM public.dishes WHERE restaurant_id = r.rid AND name = 'Entrecot a la parrilla') THEN
      INSERT INTO public.dishes (restaurant_id, name, category, description, sale_price, cost, margin, labor_cost, target_margin, popularity, monthly_sales, recommended_price, allergens, status, chef_notes)
      VALUES (r.rid, 'Entrecot a la parrilla', 'Principales', 'Entrecot madurado a la brasa, guarnición de patata.', 24.90, 8.30, 66.7, 2.20, 65, 85, 120, 24.90, ARRAY[]::text[], 'active', 'Producto premium con excelente margen. Mantener en carta.')
      RETURNING id INTO ent_dish;
      INSERT INTO public.dish_ingredients (restaurant_id, dish_id, ingredient_id, quantity)
      VALUES (r.rid, ent_dish, ent_ing, 0.30);
    END IF;

    -- Backfill dish_ingredients from name mapping if empty
    IF NOT EXISTS (SELECT 1 FROM public.dish_ingredients WHERE restaurant_id = r.rid) THEN
      INSERT INTO public.dish_ingredients (restaurant_id, dish_id, ingredient_id, quantity)
      SELECT r.rid, d.id, i.id, x.qty
      FROM (VALUES
        ('Gambas al ajillo','Gambas rojas',0.18),
        ('Gambas al ajillo','Aceite oliva virgen extra',0.05),
        ('Gambas al ajillo','Ajo fresco',0.02),
        ('Merluza a la vasca','Merluza fresca',0.22),
        ('Merluza a la vasca','Aceite oliva virgen extra',0.03),
        ('Merluza a la vasca','Ajo fresco',0.01),
        ('Ensalada de tomate y queso','Tomate rama',0.20),
        ('Ensalada de tomate y queso','Queso manchego curado',0.08),
        ('Ensalada de tomate y queso','Aceite oliva virgen extra',0.02),
        ('Croquetas caseras','Harina de trigo',0.08),
        ('Croquetas caseras','Queso manchego curado',0.05),
        ('Tarta de queso al horno','Queso manchego curado',0.12),
        ('Tarta de queso al horno','Harina de trigo',0.05)
      ) AS x(dish_name, ing_name, qty)
      JOIN public.dishes d ON d.restaurant_id = r.rid AND d.name = x.dish_name
      JOIN public.ingredients i ON i.restaurant_id = r.rid AND i.name = x.ing_name
      ON CONFLICT (dish_id, ingredient_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;
