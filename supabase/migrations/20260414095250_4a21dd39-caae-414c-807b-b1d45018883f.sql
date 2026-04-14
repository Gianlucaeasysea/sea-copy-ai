CREATE TABLE IF NOT EXISTS public.generated_emails (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  campaign_name text NOT NULL,
  subject_line  text,
  preview_text  text,
  body_markdown text,
  whatsapp_copy text,
  language      text,
  framework     text,
  model_used    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on generated_emails"
  ON public.generated_emails FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX generated_emails_campaign_id_idx ON public.generated_emails (campaign_id);
CREATE INDEX generated_emails_created_at_idx ON public.generated_emails (created_at DESC);