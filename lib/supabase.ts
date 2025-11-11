// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

/**
 * This helper creates a Supabase client you can reuse
 * inside any API route on the server.
 */
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Create and return the client
  return createClient(url, anonKey, {
    auth: { persistSession: false }, // not needed for server routes
  });
}
