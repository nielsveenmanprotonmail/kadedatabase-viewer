import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Publieke anon-client, uitsluitend voor de alleen-lezen tabs. Deze client
// beheert geen sessie — dat doet de aparte cookie-client in lib/supabase/
// (@supabase/ssr) voor de /beheer-omgeving. Zo is er maar één auth-beherende
// client en voorkomen we dat twee GoTrue-instanties dezelfde opslagsleutel delen.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
