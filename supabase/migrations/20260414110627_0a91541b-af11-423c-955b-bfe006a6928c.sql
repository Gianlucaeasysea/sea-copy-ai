ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS products_data jsonb,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS collection_name text;