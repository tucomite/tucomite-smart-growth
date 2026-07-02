
-- Lock down SECURITY DEFINER and helper functions from direct API calls
REVOKE ALL ON FUNCTION public.current_restaurant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_restaurant_id() TO authenticated;

REVOKE ALL ON FUNCTION public.seed_demo_restaurant_data() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tucomite_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
