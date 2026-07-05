
-- =========================================================================
-- FASE 6 P0 — INVOICE SECURITY HARDENING
-- =========================================================================

-- 1. STORAGE: remove UPDATE policy on invoices bucket (immutable from client)
DROP POLICY IF EXISTS invoices_bucket_update ON storage.objects;

-- 2. LOCK TRIGGER: block manual edits/deletes on applied/reversed invoices
CREATE OR REPLACE FUNCTION public.enforce_invoice_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_status invoice_status;
  cur_status    invoice_status;
BEGIN
  -- Allow internal writes from apply_invoice / reverse_invoice
  IF current_setting('app.internal_write', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'invoices' THEN
    cur_status := COALESCE(OLD.status, NEW.status);
    IF cur_status IN ('applied','reversed') THEN
      RAISE EXCEPTION 'invoice_locked: cannot modify invoice in status %', cur_status
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_TABLE_NAME = 'invoice_items' THEN
    SELECT status INTO parent_status
      FROM public.invoices
     WHERE id = COALESCE(OLD.invoice_id, NEW.invoice_id);
    IF parent_status IN ('applied','reversed') THEN
      RAISE EXCEPTION 'invoice_locked: parent invoice in status %', parent_status
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_invoices_lock ON public.invoices;
CREATE TRIGGER trg_invoices_lock
  BEFORE UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_lock();

DROP TRIGGER IF EXISTS trg_invoice_items_lock ON public.invoice_items;
CREATE TRIGGER trg_invoice_items_lock
  BEFORE UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_lock();

REVOKE EXECUTE ON FUNCTION public.enforce_invoice_lock() FROM PUBLIC, anon, authenticated;

-- 3. APPLY INVOICE — replace with hardened, transactional, side-effectful version
CREATE OR REPLACE FUNCTION public.apply_invoice(_invoice_id uuid)
RETURNS invoice_application_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv       public.invoices;
  v_uid       uuid := auth.uid();
  v_rid       uuid := public.current_restaurant_id();
  v_run       public.invoice_application_runs;
  v_created   int  := 0;
  v_confirmed int  := 0;
  v_bad_ing   int  := 0;
  v_bad_qty   int  := 0;
  v_dup       int  := 0;
  v_sum_check numeric;
  v_supplier  text;
  v_total     numeric;
  v_ing_updates int := 0;
BEGIN
  SELECT * INTO v_inv FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- ================= VALIDATION BLOCK =================
  -- Errors here must NOT push invoice to 'failed'; only record error_code/message
  BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
    IF v_inv.restaurant_id <> v_rid THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    IF v_inv.status <> 'ready_to_apply' THEN
      RAISE EXCEPTION 'invalid_status:%', v_inv.status USING ERRCODE = '22023';
    END IF;

    SELECT count(*) INTO v_confirmed
      FROM public.invoice_items
     WHERE invoice_id = v_inv.id AND review_status = 'confirmed';
    IF v_confirmed = 0 THEN
      RAISE EXCEPTION 'no_confirmed_lines' USING ERRCODE = '22023';
    END IF;

    SELECT count(*) INTO v_bad_ing
      FROM public.invoice_items
     WHERE invoice_id = v_inv.id AND review_status = 'confirmed'
       AND matched_ingredient_id IS NULL;
    IF v_bad_ing > 0 THEN
      RAISE EXCEPTION 'confirmed_lines_without_ingredient:%', v_bad_ing USING ERRCODE = '22023';
    END IF;

    SELECT count(*) INTO v_bad_qty
      FROM public.invoice_items
     WHERE invoice_id = v_inv.id AND review_status = 'confirmed'
       AND (base_quantity IS NULL OR base_quantity <= 0);
    IF v_bad_qty > 0 THEN
      RAISE EXCEPTION 'confirmed_lines_invalid_quantity:%', v_bad_qty USING ERRCODE = '22023';
    END IF;

    IF v_inv.subtotal IS NOT NULL AND v_inv.tax_total IS NOT NULL AND v_inv.total IS NOT NULL THEN
      v_sum_check := abs((v_inv.subtotal + v_inv.tax_total) - v_inv.total);
      IF v_sum_check > 0.02 THEN
        RAISE EXCEPTION 'totals_mismatch:%', v_sum_check USING ERRCODE = '22023';
      END IF;
    END IF;

    SELECT count(*) INTO v_dup
      FROM public.inventory_movements
     WHERE source_type = 'invoice_apply' AND source_id = v_inv.id;
    IF v_dup > 0 THEN
      RAISE EXCEPTION 'already_applied' USING ERRCODE = '23505';
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Validation / business error: do NOT change status to 'failed'
    INSERT INTO public.invoice_application_runs
      (restaurant_id, invoice_id, run_type, status, performed_by, error_message)
    VALUES
      (v_inv.restaurant_id, v_inv.id, 'apply', 'failed', v_uid, sqlerrm)
    RETURNING * INTO v_run;

    PERFORM set_config('app.internal_write', 'on', true);
    UPDATE public.invoices
       SET error_code = sqlstate, error_message = sqlerrm, updated_at = now()
     WHERE id = v_inv.id;
    PERFORM set_config('app.internal_write', 'off', true);

    RETURN v_run;
  END;

  -- ================= APPLY BLOCK =================
  PERFORM set_config('app.internal_write', 'on', true);

  BEGIN
    -- Inventory movements per confirmed line
    INSERT INTO public.inventory_movements
      (restaurant_id, ingredient_id, type, quantity, reason,
       source_type, source_id, invoice_item_id)
    SELECT
      ii.restaurant_id, ii.matched_ingredient_id, 'in', ii.base_quantity,
      'Factura ' || COALESCE(v_inv.invoice_number, v_inv.id::text),
      'invoice_apply', v_inv.id, ii.id
    FROM public.invoice_items ii
    WHERE ii.invoice_id = v_inv.id
      AND ii.review_status = 'confirmed';
    GET DIAGNOSTICS v_created = ROW_COUNT;

    -- Aggregated stock update per ingredient, scoped to invoice.restaurant_id
    WITH sums AS (
      SELECT matched_ingredient_id AS ing_id, SUM(base_quantity) AS qty
        FROM public.invoice_items
       WHERE invoice_id = v_inv.id
         AND review_status = 'confirmed'
         AND matched_ingredient_id IS NOT NULL
       GROUP BY matched_ingredient_id
    )
    UPDATE public.ingredients ing
       SET stock_quantity = COALESCE(ing.stock_quantity, 0) + s.qty,
           updated_at = now()
      FROM sums s
     WHERE ing.id = s.ing_id
       AND ing.restaurant_id = v_inv.restaurant_id;
    GET DIAGNOSTICS v_ing_updates = ROW_COUNT;

    -- Flip status
    UPDATE public.invoices
       SET status = 'applied', applied_at = now(), applied_by = v_uid,
           error_code = NULL, error_message = NULL, updated_at = now()
     WHERE id = v_inv.id;

    -- Enrich context
    SELECT s.name INTO v_supplier FROM public.suppliers s WHERE s.id = v_inv.supplier_id;
    v_total := COALESCE(v_inv.total, 0);

    -- Committee log
    INSERT INTO public.committee_log
      (restaurant_id, actor, action, target_type, target_id, reason, result)
    VALUES
      (v_inv.restaurant_id, 'sistema', 'invoice_applied', 'invoice', v_inv.id,
       'Factura aplicada al inventario',
       jsonb_build_object(
         'invoice_number', v_inv.invoice_number,
         'supplier', v_supplier,
         'total', v_total,
         'currency', v_inv.currency,
         'movements_created', v_created,
         'ingredients_updated', v_ing_updates,
         'lines_confirmed', v_confirmed
       ));

    -- Notification
    INSERT INTO public.notifications
      (restaurant_id, kind, severity, title, body, link)
    VALUES
      (v_inv.restaurant_id, 'invoice_applied', 'info',
       'Factura aplicada',
       'Factura ' || COALESCE(v_inv.invoice_number, v_inv.id::text)
         || COALESCE(' — ' || v_supplier, '')
         || ' por ' || v_total::text || ' ' || v_inv.currency,
       '/facturas/' || v_inv.id::text);

    -- Automation task (mode='approval' + state='detected', dedupe on invoice)
    INSERT INTO public.automation_tasks
      (restaurant_id, state, mode, title, detail, reason, payload, dedupe_key)
    VALUES
      (v_inv.restaurant_id, 'detected', 'approval',
       'Factura aplicada',
       'Se ha aplicado la factura ' || COALESCE(v_inv.invoice_number, v_inv.id::text),
       'Aplicación de factura',
       jsonb_build_object(
         'invoice_id', v_inv.id,
         'invoice_number', v_inv.invoice_number,
         'supplier', v_supplier,
         'total', v_total,
         'movements_created', v_created
       ),
       'invoice_apply:' || v_inv.id::text)
    ON CONFLICT (restaurant_id, dedupe_key) DO NOTHING;

    INSERT INTO public.invoice_application_runs
      (restaurant_id, invoice_id, run_type, status, performed_by, summary)
    VALUES
      (v_inv.restaurant_id, v_inv.id, 'apply', 'success', v_uid,
       jsonb_build_object(
         'movements_created', v_created,
         'ingredients_updated', v_ing_updates,
         'lines_confirmed', v_confirmed
       ))
    RETURNING * INTO v_run;

    PERFORM set_config('app.internal_write', 'off', true);
    RETURN v_run;

  EXCEPTION WHEN OTHERS THEN
    -- Infra failure during apply — mark invoice as failed
    PERFORM set_config('app.internal_write', 'on', true);
    UPDATE public.invoices
       SET status = 'failed', error_code = sqlstate, error_message = sqlerrm, updated_at = now()
     WHERE id = v_inv.id AND status = 'ready_to_apply';
    PERFORM set_config('app.internal_write', 'off', true);

    INSERT INTO public.invoice_application_runs
      (restaurant_id, invoice_id, run_type, status, performed_by, error_message)
    VALUES
      (v_inv.restaurant_id, v_inv.id, 'apply', 'failed', v_uid, sqlerrm)
    RETURNING * INTO v_run;

    RETURN v_run;
  END;
END $$;

-- 4. REVERSE INVOICE — replace with stock rollback + side-effects
CREATE OR REPLACE FUNCTION public.reverse_invoice(_invoice_id uuid)
RETURNS invoice_application_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv     public.invoices;
  v_uid     uuid := auth.uid();
  v_rid     uuid := public.current_restaurant_id();
  v_run     public.invoice_application_runs;
  v_created int  := 0;
  v_dup     int  := 0;
  v_supplier text;
  v_ing_updates int := 0;
BEGIN
  SELECT * INTO v_inv FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'P0002';
  END IF;

  BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
    IF v_inv.restaurant_id <> v_rid THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    IF v_inv.status <> 'applied' THEN
      RAISE EXCEPTION 'invalid_status:%', v_inv.status USING ERRCODE = '22023';
    END IF;

    SELECT count(*) INTO v_dup
      FROM public.inventory_movements
     WHERE source_type = 'invoice_reverse' AND source_id = v_inv.id;
    IF v_dup > 0 THEN
      RAISE EXCEPTION 'already_reversed' USING ERRCODE = '23505';
    END IF;

    PERFORM set_config('app.internal_write', 'on', true);

    -- Inverse movements from original apply movements
    INSERT INTO public.inventory_movements
      (restaurant_id, ingredient_id, type, quantity, reason,
       source_type, source_id, invoice_item_id)
    SELECT
      m.restaurant_id, m.ingredient_id,
      CASE WHEN m.type = 'in' THEN 'out' ELSE 'in' END,
      m.quantity,
      'Reversión factura ' || COALESCE(v_inv.invoice_number, v_inv.id::text),
      'invoice_reverse', v_inv.id, m.invoice_item_id
    FROM public.inventory_movements m
    WHERE m.source_type = 'invoice_apply'
      AND m.source_id   = v_inv.id;
    GET DIAGNOSTICS v_created = ROW_COUNT;

    -- Aggregated stock rollback, scoped to invoice.restaurant_id
    WITH sums AS (
      SELECT matched_ingredient_id AS ing_id, SUM(base_quantity) AS qty
        FROM public.invoice_items
       WHERE invoice_id = v_inv.id
         AND review_status = 'confirmed'
         AND matched_ingredient_id IS NOT NULL
       GROUP BY matched_ingredient_id
    )
    UPDATE public.ingredients ing
       SET stock_quantity = GREATEST(0, COALESCE(ing.stock_quantity, 0) - s.qty),
           updated_at = now()
      FROM sums s
     WHERE ing.id = s.ing_id
       AND ing.restaurant_id = v_inv.restaurant_id;
    GET DIAGNOSTICS v_ing_updates = ROW_COUNT;

    UPDATE public.invoices
       SET status = 'reversed', reversed_at = now(), reversed_by = v_uid, updated_at = now()
     WHERE id = v_inv.id;

    SELECT s.name INTO v_supplier FROM public.suppliers s WHERE s.id = v_inv.supplier_id;

    INSERT INTO public.committee_log
      (restaurant_id, actor, action, target_type, target_id, reason, result)
    VALUES
      (v_inv.restaurant_id, 'sistema', 'invoice_reversed', 'invoice', v_inv.id,
       'Factura revertida',
       jsonb_build_object(
         'invoice_number', v_inv.invoice_number,
         'supplier', v_supplier,
         'reverse_movements_created', v_created,
         'ingredients_updated', v_ing_updates
       ));

    INSERT INTO public.notifications
      (restaurant_id, kind, severity, title, body, link)
    VALUES
      (v_inv.restaurant_id, 'invoice_reversed', 'warning',
       'Factura revertida',
       'Se ha revertido la factura ' || COALESCE(v_inv.invoice_number, v_inv.id::text)
         || COALESCE(' — ' || v_supplier, ''),
       '/facturas/' || v_inv.id::text);

    INSERT INTO public.automation_tasks
      (restaurant_id, state, mode, title, detail, reason, payload, dedupe_key)
    VALUES
      (v_inv.restaurant_id, 'detected', 'approval',
       'Factura revertida',
       'Se ha revertido la factura ' || COALESCE(v_inv.invoice_number, v_inv.id::text),
       'Reversión de factura',
       jsonb_build_object(
         'invoice_id', v_inv.id,
         'invoice_number', v_inv.invoice_number,
         'supplier', v_supplier,
         'reverse_movements_created', v_created
       ),
       'invoice_reverse:' || v_inv.id::text)
    ON CONFLICT (restaurant_id, dedupe_key) DO NOTHING;

    INSERT INTO public.invoice_application_runs
      (restaurant_id, invoice_id, run_type, status, performed_by, summary)
    VALUES
      (v_inv.restaurant_id, v_inv.id, 'reverse', 'success', v_uid,
       jsonb_build_object(
         'reverse_movements_created', v_created,
         'ingredients_updated', v_ing_updates
       ))
    RETURNING * INTO v_run;

    PERFORM set_config('app.internal_write', 'off', true);
    RETURN v_run;

  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.internal_write', 'off', true);
    INSERT INTO public.invoice_application_runs
      (restaurant_id, invoice_id, run_type, status, performed_by, error_message)
    VALUES
      (v_inv.restaurant_id, v_inv.id, 'reverse', 'failed', v_uid, sqlerrm)
    RETURNING * INTO v_run;
    RETURN v_run;
  END;
END $$;

-- 5. GRANTs (idempotent)
REVOKE ALL ON FUNCTION public.apply_invoice(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reverse_invoice(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_invoice(uuid) TO authenticated;
