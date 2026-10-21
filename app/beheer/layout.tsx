import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Beheer | Kadedatabase",
};

// Beveiligde route-groep: zonder geldige sessie → /login.
// (proxy.ts doet dezelfde controle als eerste verdedigingslinie; deze
// server-side check is defense-in-depth. De échte beveiliging is RLS in
// Supabase, die schrijfacties afdwingt.)
export default async function BeheerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/beheer");
  }

  return <>{children}</>;
}
