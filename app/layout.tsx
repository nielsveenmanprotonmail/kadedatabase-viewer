import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { NavTabs } from "@/components/nav-tabs";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Kadedatabase",
  description: "Open database van overslaglocaties op het Nederlandse binnenwater",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 antialiased">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-screen-xl mx-auto">
            <h1 className="text-xl font-semibold text-gray-900">Kadedatabase</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Overslaglocaties binnenvaart Nederland
            </p>
          </div>
        </header>
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-screen-xl mx-auto px-6">
            <NavTabs />
          </div>
        </div>
        <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
