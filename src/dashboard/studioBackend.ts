import { supabase } from "../lib/supabase";
import type { StudioBackend } from "../features/player-experience";

// The Studio and the sandbox save and read real campaigns' designs on Supabase (backend B4.1).
export const STUDIO_BACKEND: StudioBackend = {
  client: supabase,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
};
