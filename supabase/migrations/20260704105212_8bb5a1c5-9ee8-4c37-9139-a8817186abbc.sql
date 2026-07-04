
-- =====================================================================
-- FASE 6 P0.1 — INVOICES / OCR foundation
-- Aditivo. No modifica tablas existentes salvo 3 columnas nullables
-- en inventory_movements. No toca auth, ni UI, ni módulos existentes.
-- =====================================================================

-- ---------- ENUMS ----------------------------------------------------
do $$ begin
  create type public.invoice_status as enum
    ('uploaded','processing','needs_review','ready_to_apply',
     'applied','failed','reversed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_item_review as enum
    ('pending','confirmed','ignored','needs_attention');
exception when duplicate_object then null; end $$;

-- ---------- TABLE: invoices ------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  supplier_id uuid null references public.suppliers(id) on delete set null,
  invoice_number text,
  invoice_date date,
  status public.invoice_status not null default 'uploaded',
  storage_path text not null,
  file_checksum text,
  ocr_provider text,
  ocr_mode text not null default 'demo',
  confidence_score numeric(5,2),
  subtotal numeric(14,2),
  tax_total numeric(14,2),
  total numeric(14,2),
  currency text not null default 'EUR',
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  applied_at timestamptz,
  applied_by uuid references auth.users(id) on delete set null,
  reversed_at timestamptz,
  reversed_by uuid references auth.users(id) on delete set null,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- TABLE: invoice_items -------------------------------------
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  line_number int,
  raw_text text,
  description text,
  supplier_product_code text,
  quantity numeric(14,4),
  unit text,
  package_size numeric(14,4),
  base_quantity numeric(14,4),
  base_unit text,
  conversion_factor numeric(14,6),
  unit_price numeric(14,4),
  net_amount numeric(14,2),
  tax_rate numeric(5,2),
  tax_amount numeric(14,2),
  total_amount numeric(14,2),
  matched_ingredient_id uuid references public.ingredients(id) on delete set null,
  confidence_score numeric(5,2),
  review_status public.invoice_item_review not null default 'pending',
  ignored_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- TABLE: invoice_application_runs (append-only) ------------
create table if not exists public.invoice_application_runs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  run_type text not null check (run_type in ('apply','reverse')),
  status text not null check (status in ('success','failed')),
  performed_by uuid references auth.users(id) on delete set null,
  summary jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

-- ---------- ALTER inventory_movements: source columns ----------------
alter table public.inventory_movements
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists invoice_item_id uuid;

do $$ begin
  alter table public.inventory_movements
    add constraint inventory_movements_invoice_item_fk
    foreign key (invoice_item_id) references public.invoice_items(id) on delete set null;
exception when duplicate_object then null; end $$;

-- Idempotencia: una línea solo puede tener UN movimiento de tipo 'invoice_apply'
-- y UN movimiento de tipo 'invoice_reverse'.
create unique index if not exists inventory_movements_invoice_apply_uniq
  on public.inventory_movements(restaurant_id, invoice_item_id)
  where invoice_item_id is not null and source_type = 'invoice_apply';

create unique index if not exists inventory_movements_invoice_reverse_uniq
  on public.inventory_movements(restaurant_id, invoice_item_id)
  where invoice_item_id is not null and source_type = 'invoice_reverse';

-- ---------- INDEXES --------------------------------------------------
create index if not exists idx_invoices_tenant_status_date
  on public.invoices(restaurant_id, status, invoice_date desc);
create index if not exists idx_invoices_tenant_supplier_number
  on public.invoices(restaurant_id, supplier_id, invoice_number);
create index if not exists idx_invoices_tenant_checksum
  on public.invoices(restaurant_id, file_checksum);
create index if not exists idx_invoice_items_tenant_invoice
  on public.invoice_items(restaurant_id, invoice_id);
create index if not exists idx_invoice_items_tenant_ingredient_created
  on public.invoice_items(restaurant_id, matched_ingredient_id, created_at desc);
create index if not exists idx_inventory_movements_source
  on public.inventory_movements(restaurant_id, source_type, source_id);
create index if not exists idx_invoice_application_runs_tenant_invoice
  on public.invoice_application_runs(restaurant_id, invoice_id, created_at desc);

-- ---------- GRANTS ---------------------------------------------------
-- Sin DELETE para authenticated. invoice_application_runs es append-only.
grant select, insert, update on public.invoices        to authenticated;
grant select, insert, update on public.invoice_items   to authenticated;
grant select, insert           on public.invoice_application_runs to authenticated;

grant all on public.invoices                  to service_role;
grant all on public.invoice_items             to service_role;
grant all on public.invoice_application_runs  to service_role;

-- ---------- RLS ------------------------------------------------------
alter table public.invoices                 enable row level security;
alter table public.invoice_items            enable row level security;
alter table public.invoice_application_runs enable row level security;

create policy "invoices_select" on public.invoices for select to authenticated
  using (restaurant_id = public.current_restaurant_id());
create policy "invoices_insert" on public.invoices for insert to authenticated
  with check (restaurant_id = public.current_restaurant_id());
create policy "invoices_update" on public.invoices for update to authenticated
  using (restaurant_id = public.current_restaurant_id())
  with check (restaurant_id = public.current_restaurant_id());

create policy "invoice_items_select" on public.invoice_items for select to authenticated
  using (restaurant_id = public.current_restaurant_id());
create policy "invoice_items_insert" on public.invoice_items for insert to authenticated
  with check (restaurant_id = public.current_restaurant_id());
create policy "invoice_items_update" on public.invoice_items for update to authenticated
  using (restaurant_id = public.current_restaurant_id())
  with check (restaurant_id = public.current_restaurant_id());

-- invoice_application_runs: solo SELECT del propio restaurante. Los INSERT
-- llegan por las funciones SECURITY DEFINER (bypass RLS al ejecutarse con
-- el propietario). Bloqueamos INSERT directos desde clientes.
create policy "invoice_runs_select" on public.invoice_application_runs for select to authenticated
  using (restaurant_id = public.current_restaurant_id());
create policy "invoice_runs_insert_deny" on public.invoice_application_runs for insert to authenticated
  with check (false);

-- ---------- TRIGGER: tenant integrity on invoice_items ---------------
create or replace function public.enforce_invoice_item_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare inv_rid uuid;
begin
  select restaurant_id into inv_rid from public.invoices where id = NEW.invoice_id;
  if inv_rid is null then
    raise exception 'invoice_not_found' using errcode = 'P0002';
  end if;
  if NEW.restaurant_id is null then
    NEW.restaurant_id := inv_rid;
  elsif NEW.restaurant_id <> inv_rid then
    raise exception 'restaurant_id_mismatch' using errcode = '22023';
  end if;
  return NEW;
end $$;

drop trigger if exists trg_invoice_items_tenant on public.invoice_items;
create trigger trg_invoice_items_tenant
  before insert or update on public.invoice_items
  for each row execute function public.enforce_invoice_item_tenant();

-- ---------- TRIGGERS: updated_at + audit -----------------------------
drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

drop trigger if exists trg_invoice_items_updated_at on public.invoice_items;
create trigger trg_invoice_items_updated_at
  before update on public.invoice_items
  for each row execute function public.set_updated_at();

drop trigger if exists trg_invoices_audit on public.invoices;
create trigger trg_invoices_audit
  after insert or update on public.invoices
  for each row execute function public.log_audit_event();

drop trigger if exists trg_invoice_items_audit on public.invoice_items;
create trigger trg_invoice_items_audit
  after insert or update on public.invoice_items
  for each row execute function public.log_audit_event();

drop trigger if exists trg_invoice_runs_audit on public.invoice_application_runs;
create trigger trg_invoice_runs_audit
  after insert on public.invoice_application_runs
  for each row execute function public.log_audit_event();

-- ---------- FUNCTION: apply_invoice ----------------------------------
create or replace function public.apply_invoice(_invoice_id uuid)
returns public.invoice_application_runs
language plpgsql
security definer
set search_path = public
as $$
declare
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
begin
  select * into v_inv from public.invoices where id = _invoice_id for update;
  if v_inv.id is null then
    raise exception 'invoice_not_found' using errcode = 'P0002';
  end if;

  begin
    if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
    if v_inv.restaurant_id <> v_rid then raise exception 'forbidden' using errcode = '42501'; end if;
    if v_inv.status <> 'ready_to_apply' then
      raise exception 'invalid_status:%', v_inv.status using errcode = '22023';
    end if;

    select count(*) into v_confirmed
      from public.invoice_items
     where invoice_id = v_inv.id and review_status = 'confirmed';
    if v_confirmed = 0 then
      raise exception 'no_confirmed_lines' using errcode = '22023';
    end if;

    select count(*) into v_bad_ing
      from public.invoice_items
     where invoice_id = v_inv.id and review_status = 'confirmed'
       and matched_ingredient_id is null;
    if v_bad_ing > 0 then
      raise exception 'confirmed_lines_without_ingredient:%', v_bad_ing using errcode = '22023';
    end if;

    select count(*) into v_bad_qty
      from public.invoice_items
     where invoice_id = v_inv.id and review_status = 'confirmed'
       and (base_quantity is null or base_quantity <= 0);
    if v_bad_qty > 0 then
      raise exception 'confirmed_lines_invalid_quantity:%', v_bad_qty using errcode = '22023';
    end if;

    if v_inv.subtotal is not null and v_inv.tax_total is not null and v_inv.total is not null then
      v_sum_check := abs((v_inv.subtotal + v_inv.tax_total) - v_inv.total);
      if v_sum_check > 0.02 then
        raise exception 'totals_mismatch:%', v_sum_check using errcode = '22023';
      end if;
    end if;

    select count(*) into v_dup
      from public.inventory_movements
     where source_type = 'invoice_apply' and source_id = v_inv.id;
    if v_dup > 0 then
      raise exception 'already_applied' using errcode = '23505';
    end if;

    insert into public.inventory_movements
      (restaurant_id, ingredient_id, type, quantity, reason,
       source_type, source_id, invoice_item_id)
    select
      ii.restaurant_id, ii.matched_ingredient_id, 'in', ii.base_quantity,
      'Factura ' || coalesce(v_inv.invoice_number, v_inv.id::text),
      'invoice_apply', v_inv.id, ii.id
    from public.invoice_items ii
    where ii.invoice_id = v_inv.id
      and ii.review_status = 'confirmed';
    get diagnostics v_created = row_count;

    update public.invoices
       set status = 'applied', applied_at = now(), applied_by = v_uid,
           error_code = null, error_message = null, updated_at = now()
     where id = v_inv.id;

    insert into public.invoice_application_runs
      (restaurant_id, invoice_id, run_type, status, performed_by, summary)
    values
      (v_inv.restaurant_id, v_inv.id, 'apply', 'success', v_uid,
       jsonb_build_object('movements_created', v_created, 'lines_confirmed', v_confirmed))
    returning * into v_run;

    return v_run;

  exception when others then
    insert into public.invoice_application_runs
      (restaurant_id, invoice_id, run_type, status, performed_by, error_message)
    values
      (v_inv.restaurant_id, v_inv.id, 'apply', 'failed', v_uid, sqlerrm)
    returning * into v_run;

    update public.invoices
       set status = 'failed', error_code = sqlstate, error_message = sqlerrm, updated_at = now()
     where id = v_inv.id and status = 'ready_to_apply';

    return v_run;
  end;
end $$;

-- ---------- FUNCTION: reverse_invoice --------------------------------
create or replace function public.reverse_invoice(_invoice_id uuid)
returns public.invoice_application_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv     public.invoices;
  v_uid     uuid := auth.uid();
  v_rid     uuid := public.current_restaurant_id();
  v_run     public.invoice_application_runs;
  v_created int  := 0;
  v_dup     int  := 0;
begin
  select * into v_inv from public.invoices where id = _invoice_id for update;
  if v_inv.id is null then
    raise exception 'invoice_not_found' using errcode = 'P0002';
  end if;

  begin
    if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
    if v_inv.restaurant_id <> v_rid then raise exception 'forbidden' using errcode = '42501'; end if;
    if v_inv.status <> 'applied' then
      raise exception 'invalid_status:%', v_inv.status using errcode = '22023';
    end if;

    select count(*) into v_dup
      from public.inventory_movements
     where source_type = 'invoice_reverse' and source_id = v_inv.id;
    if v_dup > 0 then
      raise exception 'already_reversed' using errcode = '23505';
    end if;

    insert into public.inventory_movements
      (restaurant_id, ingredient_id, type, quantity, reason,
       source_type, source_id, invoice_item_id)
    select
      m.restaurant_id, m.ingredient_id,
      case when m.type = 'in' then 'out' else 'in' end,
      m.quantity,
      'Reversión factura ' || coalesce(v_inv.invoice_number, v_inv.id::text),
      'invoice_reverse', v_inv.id, m.invoice_item_id
    from public.inventory_movements m
    where m.source_type = 'invoice_apply'
      and m.source_id   = v_inv.id;
    get diagnostics v_created = row_count;

    update public.invoices
       set status = 'reversed', reversed_at = now(), reversed_by = v_uid, updated_at = now()
     where id = v_inv.id;

    insert into public.invoice_application_runs
      (restaurant_id, invoice_id, run_type, status, performed_by, summary)
    values
      (v_inv.restaurant_id, v_inv.id, 'reverse', 'success', v_uid,
       jsonb_build_object('reverse_movements_created', v_created))
    returning * into v_run;

    return v_run;

  exception when others then
    insert into public.invoice_application_runs
      (restaurant_id, invoice_id, run_type, status, performed_by, error_message)
    values
      (v_inv.restaurant_id, v_inv.id, 'reverse', 'failed', v_uid, sqlerrm)
    returning * into v_run;
    return v_run;
  end;
end $$;

revoke all on function public.apply_invoice(uuid)   from public;
revoke all on function public.reverse_invoice(uuid) from public;
grant execute on function public.apply_invoice(uuid)   to authenticated;
grant execute on function public.reverse_invoice(uuid) to authenticated;

-- =====================================================================
-- STORAGE policies para el bucket privado 'invoices'
-- (bucket creado por tool con: privado, 25MB, PDF/JPG/PNG/WEBP)
-- Path esperado: {restaurant_id}/{invoice_id}/{filename}
-- Comparación segura como texto (sin cast a uuid).
-- =====================================================================
drop policy if exists "invoices_bucket_select" on storage.objects;
create policy "invoices_bucket_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );

drop policy if exists "invoices_bucket_insert" on storage.objects;
create policy "invoices_bucket_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );

drop policy if exists "invoices_bucket_update" on storage.objects;
create policy "invoices_bucket_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = public.current_restaurant_id()::text
  )
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );
-- Sin policy de DELETE: los ficheros no se borran desde el cliente.
