
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  id BIGSERIAL PRIMARY KEY,
  bucket TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_hits_bucket_time_idx
  ON public.rate_limit_hits (bucket, occurred_at DESC);

-- Server-only: no anon/authenticated grants. service_role bypasses RLS.
GRANT ALL ON public.rate_limit_hits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rate_limit_hits_id_seq TO service_role;

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: table is opaque to end users.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key TEXT,
  _max INT,
  _window_sec INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF _key IS NULL OR length(_key) = 0 THEN
    RAISE EXCEPTION 'rate_limit_key_required';
  END IF;
  IF _max <= 0 OR _window_sec <= 0 THEN
    RAISE EXCEPTION 'rate_limit_bad_params';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.rate_limit_hits
  WHERE bucket = _key
    AND occurred_at > now() - (_window_sec || ' seconds')::interval;

  IF v_count >= _max THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.rate_limit_hits (bucket) VALUES (_key);

  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_hits WHERE occurred_at < now() - INTERVAL '1 day';
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO service_role;
