"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { supabase } from "@/lib/supabase";

// ─── Fix default Leaflet marker icons in Next.js ──────────────────────────────

const markerIcon = L.icon({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  shadowSize:  [41, 41],
});

// ─── Types ────────────────────────────────────────────────────────────────────

type MapLocation = {
  id: string;
  naam: string | null;
  plaatsnaam: string | null;
  lat: number | null;
  lon: number | null;
  type_kade: string | null;
  heeft_overslag: boolean | null;
  afmeren_mogelijk: boolean | null;
};

const TYPE_KADE_LABEL: Record<string, string> = {
  verharde_kade:    "Verharde kade",
  wachtplaats:      "Wachtplaats",
  onverharde_kade:  "Onverharde kade",
  steiger:          "Steiger",
  aanlegpaal:       "Aanlegpaal",
  drijvende_steiger:"Drijvende steiger",
};

// ─── Marker cluster layer (inside MapContainer) ───────────────────────────────

function ClusteredMarkers({ locations }: { locations: MapLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (!locations.length) return;

    const cluster = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 60 });

    for (const loc of locations) {
      if (loc.lat == null || loc.lon == null) continue;

      const typeLabel = loc.type_kade ? TYPE_KADE_LABEL[loc.type_kade] ?? loc.type_kade : null;

      const popup = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;min-width:180px;padding:2px 0">
          <div style="font-weight:600;color:#013A57;font-size:13px;margin-bottom:3px">
            ${loc.naam ?? "Onbekend"}
          </div>
          ${loc.plaatsnaam ? `<div style="color:#555;font-size:12px">${loc.plaatsnaam}</div>` : ""}
          ${typeLabel ? `<div style="margin-top:6px;font-size:11px;color:#009EE3;font-weight:500">${typeLabel}</div>` : ""}
          <div style="margin-top:4px;font-size:11px;color:#777">
            ${loc.heeft_overslag !== null ? `Overslag: <b>${loc.heeft_overslag ? "Ja" : "Nee"}</b>` : ""}
            ${loc.afmeren_mogelijk !== null ? ` &nbsp;·&nbsp; Afmeren: <b>${loc.afmeren_mogelijk ? "Ja" : "Nee"}</b>` : ""}
          </div>
        </div>`;

      L.marker([Number(loc.lat), Number(loc.lon)], { icon: markerIcon })
        .bindPopup(popup)
        .addTo(cluster);
    }

    map.addLayer(cluster);
    return () => { map.removeLayer(cluster); };
  }, [map, locations]);

  return null;
}

// ─── Main map component ───────────────────────────────────────────────────────

export function LocationsMap() {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    async function fetchAll() {
      const BATCH = 1000;
      let from = 0;
      const acc: MapLocation[] = [];

      // Get total
      const { count } = await supabase
        .from("locations")
        .select("id", { count: "exact", head: true });
      setTotal(count ?? 0);

      // Fetch batches
      while (true) {
        const { data: rows } = await supabase
          .from("locations")
          .select("id,naam,plaatsnaam,lat,lon,type_kade,heeft_overslag,afmeren_mogelijk")
          .range(from, from + BATCH - 1);

        if (!rows || rows.length === 0) break;
        acc.push(...(rows as MapLocation[]));
        setLoaded(acc.length);
        from += BATCH;
        if (rows.length < BATCH) break;
      }

      setLocations(acc);
    }

    fetchAll();
  }, []);

  const isLoading = total === null || loaded < (total ?? 0);

  return (
    <div className="relative h-full">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md text-sm text-navy flex items-center gap-2">
          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-blue border-t-transparent rounded-full" />
          {total !== null
            ? `Laden ${loaded.toLocaleString("nl-NL")} / ${total.toLocaleString("nl-NL")}…`
            : "Laden…"}
        </div>
      )}

      <MapContainer
        center={[52.2, 5.3]}
        zoom={8}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png"
          attribution='Kaart: <a href="https://www.pdok.nl">PDOK</a> / BRT'
          maxZoom={19}
        />
        <ClusteredMarkers locations={locations} />
      </MapContainer>
    </div>
  );
}
