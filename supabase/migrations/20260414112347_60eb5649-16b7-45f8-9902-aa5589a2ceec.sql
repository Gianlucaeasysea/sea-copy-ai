CREATE TABLE public.marketing_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  event_date date NOT NULL,
  event_type text NOT NULL DEFAULT 'other',
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on marketing_events"
  ON public.marketing_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_marketing_events_updated_at
  BEFORE UPDATE ON public.marketing_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();