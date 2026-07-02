
-- Extend restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS employees_count integer,
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'beta_founder';

-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner';

-- Helper: returns the restaurant_id of the current authenticated user
CREATE OR REPLACE FUNCTION public.current_restaurant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.tucomite_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =============== SUPPLIERS ===============
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  delivery_time text,
  rating numeric(2,1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers scoped to own restaurant" ON public.suppliers FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());
CREATE TRIGGER suppliers_touch BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.tucomite_touch_updated_at();

-- =============== INGREDIENTS ===============
CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text,
  current_price numeric(10,2),
  stock_quantity numeric(10,2),
  stock_minimum numeric(10,2),
  expiration_date date,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredients TO authenticated;
GRANT ALL ON public.ingredients TO service_role;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingredients scoped to own restaurant" ON public.ingredients FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());
CREATE TRIGGER ingredients_touch BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.tucomite_touch_updated_at();

-- =============== DISHES ===============
CREATE TABLE public.dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  sale_price numeric(10,2),
  cost numeric(10,2),
  margin numeric(5,2),
  allergens text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dishes TO authenticated;
GRANT ALL ON public.dishes TO service_role;
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dishes scoped to own restaurant" ON public.dishes FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());
CREATE TRIGGER dishes_touch BEFORE UPDATE ON public.dishes
  FOR EACH ROW EXECUTE FUNCTION public.tucomite_touch_updated_at();

-- =============== INVENTORY MOVEMENTS ===============
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE CASCADE,
  type text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movements scoped to own restaurant" ON public.inventory_movements FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());

-- =============== RECOMMENDATIONS ===============
CREATE TABLE public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title text NOT NULL,
  problem text,
  cause text,
  solution text,
  economic_impact numeric(10,2),
  time_impact text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendations TO authenticated;
GRANT ALL ON public.recommendations TO service_role;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendations scoped to own restaurant" ON public.recommendations FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());
CREATE TRIGGER recommendations_touch BEFORE UPDATE ON public.recommendations
  FOR EACH ROW EXECUTE FUNCTION public.tucomite_touch_updated_at();

-- =============== COMMITTEE ACTIVITY ===============
CREATE TABLE public.committee_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committee_activity TO authenticated;
GRANT ALL ON public.committee_activity TO service_role;
ALTER TABLE public.committee_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity scoped to own restaurant" ON public.committee_activity FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());

-- =============== DEMO SEED TRIGGER ===============
CREATE OR REPLACE FUNCTION public.seed_demo_restaurant_data()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s1 uuid; s2 uuid; s3 uuid;
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

  INSERT INTO public.ingredients (restaurant_id, name, unit, current_price, stock_quantity, stock_minimum, expiration_date, supplier_id) VALUES
    (NEW.id, 'Tomate rama',                'kg',      2.40, 12, 5, (now() + interval '4 days')::date,   s1),
    (NEW.id, 'Aceite oliva virgen extra',  'L',       6.80,  8, 3, (now() + interval '180 days')::date, s1),
    (NEW.id, 'Merluza fresca',             'kg',     14.50,  6, 2, (now() + interval '2 days')::date,   s2),
    (NEW.id, 'Gambas rojas',               'kg',     32.00,  3, 2, (now() + interval '1 day')::date,    s2),
    (NEW.id, 'Harina de trigo',            'kg',      0.95, 20, 10,(now() + interval '90 days')::date,  s1),
    (NEW.id, 'Queso manchego curado',      'kg',     18.00,  4, 2, (now() + interval '30 days')::date,  s1),
    (NEW.id, 'Vino tinto Ribera',          'botella', 8.50, 24, 12,(now() + interval '365 days')::date, s3),
    (NEW.id, 'Ajo fresco',                 'kg',      3.20,  5, 2, (now() + interval '20 days')::date,  s1);

  INSERT INTO public.dishes (restaurant_id, name, category, sale_price, cost, margin, allergens, status) VALUES
    (NEW.id, 'Merluza a la vasca',           'Principales', 22.00,  8.40, 61.8, ARRAY['pescado','gluten'],            'active'),
    (NEW.id, 'Ensalada de tomate y queso',   'Entrantes',    9.50,  2.30, 75.8, ARRAY['lactosa'],                     'active'),
    (NEW.id, 'Gambas al ajillo',             'Entrantes',   14.00, 10.90, 22.1, ARRAY['crustáceos'],                  'active'),
    (NEW.id, 'Croquetas caseras',            'Entrantes',    8.00,  2.10, 73.8, ARRAY['gluten','lactosa'],            'active'),
    (NEW.id, 'Tarta de queso al horno',      'Postres',      6.50,  1.80, 72.3, ARRAY['lactosa','huevo','gluten'],    'active');

  INSERT INTO public.recommendations (restaurant_id, title, problem, cause, solution, economic_impact, time_impact, priority, status) VALUES
    (NEW.id,
     'Sube 1,40 € el precio de Gambas al ajillo',
     'Margen del 22% muy por debajo del objetivo del 65%.',
     'El proveedor de gambas rojas subió sus tarifas un 18% el mes pasado.',
     'Ajustar el PVP a 15,40 € y comunicarlo con una etiqueta de "producto premium".',
     380, NULL, 'high', 'pending'),
    (NEW.id,
     'Sustituye tu proveedor de aceite',
     'Estás pagando un 14% por encima del precio medio de mercado.',
     'Contrato antiguo sin renegociar desde hace más de un año.',
     'Cambiar a Distribuciones Mediterráneo y consolidar pedido semanal.',
     210, NULL, 'medium', 'pending'),
    (NEW.id,
     'Retira Croquetas del menú de mediodía',
     'Rotación muy baja en la franja 13:00–16:00.',
     'Compite con el menú del día y no aporta margen adicional.',
     'Ofrecerlas solo en cena como aperitivo señalizado.',
     140, NULL, 'low', 'pending'),
    (NEW.id,
     'Rediseña la carta: elimina 4 platos',
     'Carta demasiado larga (42 platos) que genera desperdicio.',
     'Ingredientes exclusivos para platos con menos de 4 ventas semanales.',
     'Reducir a 28 platos rentables y simplificar operativa de cocina.',
     620, '3 h/semana', 'high', 'pending'),
    (NEW.id,
     'Promo cruzada: Merluza + Vino Ribera',
     'Vino tinto Ribera con baja rotación y stock elevado.',
     'Falta de sugerencia de maridaje activa en sala.',
     'Menú maridaje "Merluza + copa Ribera" a 27,90 €.',
     480, NULL, 'medium', 'pending');

  INSERT INTO public.committee_activity (restaurant_id, title, description, type) VALUES
    (NEW.id, 'Chef IA revisó tu carta',            'Analizó 42 platos y detectó 4 candidatos a mejora.',                       'chef'),
    (NEW.id, 'Finanzas recalculó tus márgenes',    'Reajustó costes con los últimos precios de proveedores.',                  'finance'),
    (NEW.id, 'Compras comparó proveedores',        'Evaluó 3 alternativas para aceite y harina.',                              'purchasing'),
    (NEW.id, 'Stock detectó ingredientes críticos','2 ingredientes caducan en menos de 3 días.',                               'stock'),
    (NEW.id, 'Marketing sugirió una promoción',    'Maridaje Merluza + Vino Ribera para aumentar el ticket medio.',            'marketing'),
    (NEW.id, 'Informe ejecutivo generado',         'Consolidación de 5 recomendaciones con impacto estimado de 1.830 €/mes.', 'report');

  RETURN NEW;
END; $$;

CREATE TRIGGER seed_demo_on_restaurant_insert
  AFTER INSERT ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.seed_demo_restaurant_data();
