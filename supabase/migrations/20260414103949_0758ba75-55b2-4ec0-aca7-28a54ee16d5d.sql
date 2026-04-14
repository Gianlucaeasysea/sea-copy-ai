CREATE TABLE IF NOT EXISTS brand_voice_analysis (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analyzed_at          timestamptz DEFAULT now(),
  campaigns_analyzed   int NOT NULL DEFAULT 0,
  date_range_start     date,
  date_range_end       date,
  analysis_document    text NOT NULL,
  subject_examples     jsonb,
  opener_examples      jsonb,
  cta_examples         jsonb,
  vocabulary_bank      jsonb,
  is_active            bool DEFAULT true
);

ALTER TABLE brand_voice_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on brand_voice_analysis"
  ON brand_voice_analysis FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX brand_voice_analysis_active_idx
  ON brand_voice_analysis (is_active, analyzed_at DESC);