"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogIn } from "lucide-react";

// Vertaal Supabase-foutmeldingen naar nette Nederlandse teksten.
function nlError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Onjuist e-mailadres of wachtwoord.";
  if (m.includes("email not confirmed"))
    return "Dit account is nog niet bevestigd. Neem contact op met de beheerder.";
  if (m.includes("too many requests") || m.includes("rate limit"))
    return "Te veel pogingen. Wacht even en probeer het opnieuw.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Kan de server niet bereiken. Controleer je internetverbinding.";
  return "Inloggen mislukt. Probeer het opnieuw of neem contact op met de beheerder.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/beheer";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(nlError(signInError.message));
      setLoading(false);
      return;
    }

    // Sessie staat in de cookies; ververs server components en ga door.
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto mt-8">
      <div className="bg-white rounded-lg border border-gray-light shadow-sm p-6">
        <h2 className="text-lg font-bold text-navy-deep mb-1">Inloggen</h2>
        <p className="text-sm text-navy/50 mb-5">
          Alleen voor beheerders van de kadedatabase.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-navy">
              E-mailadres
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-light bg-white focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-navy">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-light bg-white focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-md bg-navy text-white hover:bg-navy-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {loading ? "Bezig…" : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}
