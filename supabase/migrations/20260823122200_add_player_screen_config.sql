-- Add player_screen_config JSONB column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS player_screen_config JSONB DEFAULT '{}'::jsonb;
