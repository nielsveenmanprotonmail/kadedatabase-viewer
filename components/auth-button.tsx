"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { LogOut, Settings } from "lucide-react";

// Toont rechts in de nav de sessiestatus:
//  - uitgelogd → niets (login is bewust alleen via de directe /login-URL,
//    die alleen beheerders kennen — geen knop in de publieke UI)
//  - ingelogd  → "Beheer"-link + "Uitloggen"-knop (met e-mail)
export function AuthButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  // Niets tonen tot de sessiestatus bekend is (voorkomt knipperen).
  if (!ready) return <div className="w-px" aria-hidden />;

  // Uitgelogd: geen knop tonen. /login blijft bereikbaar via de directe URL.
  if (!email) return <div className="w-px" aria-hidden />;

  const beheerActive = pathname.startsWith("/beheer");

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/beheer"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
          beheerActive
            ? "bg-navy text-white"
            : "border border-gray-light text-navy hover:border-navy/30"
        )}
      >
        <Settings className="w-4 h-4" />
        Beheer
      </Link>
      <span className="hidden md:inline text-xs text-navy/40 max-w-[14rem] truncate" title={email}>
        {email}
      </span>
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-light text-navy hover:border-navy/30 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Uitloggen
      </button>
    </div>
  );
}
