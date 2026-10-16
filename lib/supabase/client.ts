import { createBrowserClient } from "@supabase/ssr";

// Browser-client voor ingelogde sessies (lezen én schrijven onder RLS).
// Gebruikt dezelfde env-vars als de publieke anon-client in lib/supabase.ts,
// maar bewaart de sessie in cookies (via @supabase/ssr) i.p.v. localStorage,
// zodat de server-client in proxy.ts / server components dezelfde sessie ziet.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
