ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS sequence_emails jsonb,
  ADD COLUMN IF NOT EXISTS is_sequence boolean DEFAULT false;