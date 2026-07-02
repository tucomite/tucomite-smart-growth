
REVOKE EXECUTE ON FUNCTION public.current_restaurant_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid,uuid,public.app_role) FROM PUBLIC, anon, authenticated;
