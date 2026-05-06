"use client";

import dynamic from "next/dynamic";

const LocationsMap = dynamic(
  () => import("@/components/locations-map").then((m) => m.LocationsMap),
  { ssr: false, loading: () => <div className="h-full bg-gray-light/30 rounded-lg border border-gray-light animate-pulse" /> }
);

export default function KaartPage() {
  return (
    <div
      className="bg-white rounded-lg border border-gray-light shadow-sm overflow-hidden"
      style={{ height: "calc(100vh - 13rem)" }}
    >
      <LocationsMap />
    </div>
  );
}
