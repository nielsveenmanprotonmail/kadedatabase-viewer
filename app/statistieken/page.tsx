"use client";

import dynamic from "next/dynamic";

const StatsPanel = dynamic(
  () => import("@/components/stats-panel").then((m) => m.StatsPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20 text-sm text-navy/40">
        <span className="animate-spin inline-block w-4 h-4 border-2 border-blue border-t-transparent rounded-full mr-2" />
        Statistieken laden…
      </div>
    ),
  }
);

export default function StatistiekenPage() {
  return <StatsPanel />;
}
