import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/update-session";

// Next.js 16: "middleware" heet nu "proxy" (zelfde functionaliteit).
// Ververst de Supabase-sessie en beschermt /beheer.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Draai op alle routes behalve statische bestanden en afbeeldingen.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
