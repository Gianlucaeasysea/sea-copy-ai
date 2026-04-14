ALTER TABLE public.generated_emails
  ADD COLUMN IF NOT EXISTS products_data jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hero_image_url text DEFAULT NULL;