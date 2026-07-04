-- P2: Índice adicional y resiliencia OCR
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_restaurant_date_desc
  ON public.daily_snapshots (restaurant_id, date DESC);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS processing_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3;

CREATE INDEX IF NOT EXISTS idx_invoices_processing_expires
  ON public.invoices (processing_expires_at)
  WHERE status = 'processing';
