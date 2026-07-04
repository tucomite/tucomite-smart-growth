
-- Los defaults de Supabase conceden EXECUTE a 'anon' explícitamente.
-- Hay que revocarlo por rol, no solo desde PUBLIC.
revoke all on function public.apply_invoice(uuid)           from anon;
revoke all on function public.reverse_invoice(uuid)         from anon;
revoke all on function public.enforce_invoice_item_tenant() from anon;
