import { createClient } from '@supabase/supabase-js';

const env: Record<string, string | undefined> =
  (typeof import.meta !== 'undefined' && (import.meta as any).env) ||
  (typeof process !== 'undefined' && process.env) ||
  {};

const DEFAULT_URL = 'https://manrkeaawscpkwnfbcmb.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbnJrZWFhd3NjcGt3bmZiY21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODExMzAsImV4cCI6MjEwNTU1NzEzMH0.YbC7Jf3GoAEKMG-dwDpREjIYrvrSBk2tL0N3rBBxekY';

const rawUrl = env.VITE_SUPABASE_URL || DEFAULT_URL;
// Support both naming conventions
const rawKey =
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_KEY;

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  !rawUrl.includes('your-project-ref') &&
  rawKey !== 'your-anon-key-here'
);

const supabaseUrl = isSupabaseConfigured ? rawUrl : DEFAULT_URL;
const supabaseAnonKey = isSupabaseConfigured ? rawKey : DEFAULT_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
