
-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'it',
  framework TEXT NOT NULL DEFAULT 'AIDA',
  subject_line TEXT,
  preview_text TEXT,
  body_markdown TEXT,
  whatsapp_copy TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  notion_url TEXT,
  klaviyo_campaign_id TEXT,
  shopify_product_ids TEXT[],
  subject_tone TEXT DEFAULT 'curiosity',
  context_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

-- Create corrections table
CREATE TABLE public.corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  language TEXT NOT NULL DEFAULT 'all',
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to corrections" ON public.corrections FOR ALL USING (true) WITH CHECK (true);

-- Create brand_settings table
CREATE TABLE public.brand_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to brand_settings" ON public.brand_settings FOR ALL USING (true) WITH CHECK (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_brand_settings_updated_at BEFORE UPDATE ON public.brand_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
