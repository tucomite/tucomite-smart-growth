
-- Endurecimiento: quitar EXECUTE por defecto a PUBLIC en las 3 funciones nuevas.
revoke all on function public.enforce_invoice_item_tenant() from public;
revoke all on function public.enforce_invoice_item_tenant() from authenticated;
-- (queda disponible solo para el owner y para triggers internos)

revoke all on function public.apply_invoice(uuid)   from public;
revoke all on function public.reverse_invoice(uuid) from public;
grant execute on function public.apply_invoice(uuid)   to authenticated;
grant execute on function public.reverse_invoice(uuid) to authenticated;
