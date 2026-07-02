
-- Extend recommendations with automation metadata (nullable, safe)
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS automation_state text,
  ADD COLUMN IF NOT EXISTS automation_mode text,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

-- Automation rules
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_type text NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  runs_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules tenant" ON public.automation_rules FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());
CREATE TRIGGER trg_rules_updated BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Automation tasks (one per triggered action; links to recommendation when applicable)
CREATE TABLE IF NOT EXISTS public.automation_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  recommendation_id uuid REFERENCES public.recommendations(id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'detected',
  mode text NOT NULL DEFAULT 'approval',
  title text NOT NULL,
  detail text,
  reason text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for timestamptz,
  applied_at timestamptz,
  reverted_at timestamptz,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, dedupe_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_tasks TO authenticated;
GRANT ALL ON public.automation_tasks TO service_role;
ALTER TABLE public.automation_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks tenant" ON public.automation_tasks FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.automation_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifs tenant" ON public.notifications FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());

-- Committee log (audit of what el Comité did)
CREATE TABLE IF NOT EXISTS public.committee_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  actor text NOT NULL DEFAULT 'comite',
  action text NOT NULL,
  target_type text,
  target_id uuid,
  reason text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committee_log TO authenticated;
GRANT ALL ON public.committee_log TO service_role;
ALTER TABLE public.committee_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log tenant" ON public.committee_log FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());

-- Daily / weekly briefs
CREATE TABLE IF NOT EXISTS public.committee_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  period text NOT NULL,
  brief_date date NOT NULL,
  headline text NOT NULL,
  body text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, period, brief_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committee_briefs TO authenticated;
GRANT ALL ON public.committee_briefs TO service_role;
ALTER TABLE public.committee_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefs tenant" ON public.committee_briefs FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());

-- Seed default rules for existing restaurants
INSERT INTO public.automation_rules (restaurant_id, name, description, trigger_type, trigger_config, action_type, action_config, enabled)
SELECT r.id, 'Proveedor sube más de 8%', 'Busca alternativas automáticamente si el precio de un ingrediente supera en 8% al proveedor alternativo.',
       'supplier_price_up', '{"threshold_pct": 8}'::jsonb, 'create_recommendation', '{}'::jsonb, true
FROM public.restaurants r
WHERE NOT EXISTS (SELECT 1 FROM public.automation_rules ar WHERE ar.restaurant_id = r.id AND ar.trigger_type = 'supplier_price_up');

INSERT INTO public.automation_rules (restaurant_id, name, description, trigger_type, trigger_config, action_type, action_config, enabled)
SELECT r.id, 'Ingrediente próximo a caducar', 'Genera promoción automática cuando un ingrediente caduca en 3 días o menos.',
       'ingredient_expiring', '{"days": 3}'::jsonb, 'create_recommendation', '{}'::jsonb, true
FROM public.restaurants r
WHERE NOT EXISTS (SELECT 1 FROM public.automation_rules ar WHERE ar.restaurant_id = r.id AND ar.trigger_type = 'ingredient_expiring');

INSERT INTO public.automation_rules (restaurant_id, name, description, trigger_type, trigger_config, action_type, action_config, enabled)
SELECT r.id, 'Plato bajo margen mínimo', 'Propone nuevo precio cuando un plato baja del margen mínimo definido.',
       'dish_low_margin', '{"min_margin": 30}'::jsonb, 'create_recommendation', '{}'::jsonb, true
FROM public.restaurants r
WHERE NOT EXISTS (SELECT 1 FROM public.automation_rules ar WHERE ar.restaurant_id = r.id AND ar.trigger_type = 'dish_low_margin');

INSERT INTO public.automation_rules (restaurant_id, name, description, trigger_type, trigger_config, action_type, action_config, enabled)
SELECT r.id, 'Proveedor con mejor valoración', 'Avisa cuando un proveedor alternativo tiene mejor valoración.',
       'supplier_better_rating', '{"delta": 0.5}'::jsonb, 'notify', '{}'::jsonb, true
FROM public.restaurants r
WHERE NOT EXISTS (SELECT 1 FROM public.automation_rules ar WHERE ar.restaurant_id = r.id AND ar.trigger_type = 'supplier_better_rating');

INSERT INTO public.automation_rules (restaurant_id, name, description, trigger_type, trigger_config, action_type, action_config, enabled)
SELECT r.id, 'Producto sin ventas', 'Crea recomendación cuando un plato lleva muchos días sin vender.',
       'product_stale', '{"min_monthly_sales": 5}'::jsonb, 'create_recommendation', '{}'::jsonb, true
FROM public.restaurants r
WHERE NOT EXISTS (SELECT 1 FROM public.automation_rules ar WHERE ar.restaurant_id = r.id AND ar.trigger_type = 'product_stale');
