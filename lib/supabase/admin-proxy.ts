import { createClient } from "@supabase/supabase-js";

/**
 * Client-side "Admin" client.
 * NOTE: This is only safe if you have a middleware or proxy that intercepts 
 * these calls OR if you're using this in a controlled environment.
 * 
 * For this specific project, we are using the SERVICE_ROLE_KEY 
 * on the client-side for the ADMIN DASHBOARD ONLY to bypass RLS.
 * SECURITY WARNING: In a production app, the SERVICE_ROLE_KEY should 
 * never be exposed to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Ensure this is available

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
