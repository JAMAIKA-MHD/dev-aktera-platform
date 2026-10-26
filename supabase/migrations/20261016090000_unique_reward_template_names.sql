-- A reward name is unique within an organization's Reward Library, regardless of case or whitespace.
CREATE UNIQUE INDEX IF NOT EXISTS prize_templates_org_name_unique
  ON public.prize_templates (organization_id, lower(btrim(name)));
