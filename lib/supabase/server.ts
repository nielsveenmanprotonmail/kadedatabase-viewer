import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-client voor Server Components, Route Handlers en Server Actions.
// Leest/schrijft de sessie uit de request-cookies. `cookies()` is in Next.js 16
// asynchroon, dus await'en. De setAll-try/catch is nodig omdat cookies niet
// vanuit een Server Component gezet mogen worden (dat doet proxy.ts); daar
// negeren we de fout veilig.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Aangeroepen vanuit een Server Component — proxy.ts ververst de
            // sessie-cookie, dus dit mag genegeerd worden.
          }
        },
      },
    }
  );
}
