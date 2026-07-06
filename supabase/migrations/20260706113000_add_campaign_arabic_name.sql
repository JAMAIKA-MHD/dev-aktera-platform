ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS arabic_name text;

UPDATE public.campaigns
SET arabic_name = description
WHERE arabic_name IS NULL
  AND description IS NOT NULL
  AND btrim(description) <> '';
