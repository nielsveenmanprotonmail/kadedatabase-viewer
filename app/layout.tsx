import type { Metadata } from "next";
import "./globals.css";
import { NavTabs } from "@/components/nav-tabs";

export const metadata: Metadata = {
  title: "Kadedatabase | Topsector Logistiek",
  description: "Open database van overslaglocaties op het Nederlandse binnenwater",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-light/30 text-navy-deep antialiased">

        {/* Header */}
        <header className="bg-navy">
          <div className="max-w-screen-xl mx-auto px-6 py-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-blue mb-1">
                Topsector Logistiek
              </p>
              <h1 className="text-2xl font-bold text-white leading-tight">
                Kadedatabase
              </h1>
            </div>
            <p className="text-xs text-white/40 hidden sm:block pb-0.5">
              Overslaglocaties binnenvaart Nederland
            </p>
          </div>
          {/* Tri-colour stripe */}
          <div className="flex h-1">
            <div className="flex-1 bg-blue" />
            <div className="flex-1 bg-navy-deep" />
            <div className="flex-1 bg-lime" />
          </div>
        </header>

        {/* Tab navigation — sticky */}
        <div className="sticky top-0 z-[1001] bg-white border-b border-gray-light shadow-sm">
          <div className="max-w-screen-xl mx-auto px-6">
            <NavTabs />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-navy mt-auto">
          <div className="flex h-1">
            <div className="flex-1 bg-blue" />
            <div className="flex-1 bg-navy-deep" />
            <div className="flex-1 bg-lime" />
          </div>
          <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-white/50">
              Kadedatabase &copy; {new Date().getFullYear()} Topsector Logistiek
            </p>
            <p className="text-xs text-white/30">
              Publieke data — PostgREST API beschikbaar
            </p>
          </div>
        </footer>

      </body>
    </html>
  );
}
