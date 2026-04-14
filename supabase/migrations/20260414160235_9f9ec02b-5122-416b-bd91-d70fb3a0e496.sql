INSERT INTO storage.buckets (id, name, public) VALUES ('hero-images', 'hero-images', true);

CREATE POLICY "Anyone can view hero images"
ON storage.objects FOR SELECT
USING (bucket_id = 'hero-images');

CREATE POLICY "Anyone can upload hero images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'hero-images');

CREATE POLICY "Anyone can update hero images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'hero-images');

CREATE POLICY "Anyone can delete hero images"
ON storage.objects FOR DELETE
USING (bucket_id = 'hero-images');