/**
 * Supabase Client Initialization
 * -------------------------------
 * Creates and exports a singleton Supabase client instance used across the
 * DZENGAGE application for all database, auth, and storage operations.
 *
 * Environment variables (pre-populated in .env):
 *   - VITE_SUPABASE_URL      → The project's API URL.
 *   - VITE_SUPABASE_ANON_KEY → The anonymous (public) API key used by the browser.
 *
 * Only the anon key is exposed to the client; the service-role key must NEVER
 * be imported here — it is server-side only and would bypass RLS if leaked.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Read Supabase configuration from Vite environment variables.
 * `import.meta.env` is statically replaced by Vite at build time, so these
 * values are baked into the bundle and available at runtime in the browser.
 */
const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * The shared Supabase client singleton.
 *
 * Reusing a single instance avoids opening redundant WebSocket connections
 * (for realtime) and GoTrue auth sessions. Import this from anywhere in the
 * app instead of calling `createClient` again.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the user's session in localStorage so a page refresh keeps
    // them signed in across reloads.
    persistSession: true,
    // Auto-refresh the JWT in the background before it expires so the user
    // is not interrupted by sudden 401s during long sessions.
    autoRefreshToken: true,
    // Detect the session from the URL on first load (supports email-link
    // redirects and OAuth callbacks, even though we default to password auth).
    detectSessionInUrl: true,
  },
});

/**
 * Default export of the client for convenience imports.
 * Prefer the named `supabase` export in application code.
 */
export default supabase;
