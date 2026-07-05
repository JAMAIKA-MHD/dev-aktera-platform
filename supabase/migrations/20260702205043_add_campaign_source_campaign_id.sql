ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS source_campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS campaigns_source_campaign_id_idx
ON public.campaigns(source_campaign_id);