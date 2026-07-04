GRANT EXECUTE ON FUNCTION public.current_restaurant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_invoice(uuid) TO authenticated;