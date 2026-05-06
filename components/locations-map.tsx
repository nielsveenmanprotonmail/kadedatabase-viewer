"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { supabase } from "@/lib/supabase";

// ─── Custom marker icons (TSL colours) ───────────────────────────────────────

function pinIcon(fill: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 22 30">
    <path d="M11 0C5 0 0 5 0 11c0 8 11 19 11 19S22 19 22 11C22 5 17 0 11 0z"
          fill="${fill}" stroke="white" stroke-width="1.5"/>
    <circle cx="11" cy="11" r="4" fill="white" fill-opacity="0.75"/>
  </svg>`;
  return L.divIcon({
    className: "",
    html: svg,
    iconSize:    [22, 30],
    iconAnchor:  [11, 30],
    popupAnchor: [0, -32],
  });
}

const ICONS = {
  overslag:      pinIcon("#009EE3"), // TSL light blue  — heeft_overslag = true
  geen_overslag: pinIcon("#156082"), // TSL steel teal  — heeft_overslag = false
  onbekend:      pinIcon("#9CA3AF"), // neutral gray    — heeft_overslag = null
};

// ─── Type ────────────────────────────────────────────────────────────────────

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
  verharde_kade:     "Verharde kade",
  wachtplaats:       "Wachtplaats",
  onverharde_kade:   "Onverharde kade",
  steiger:           "Steiger",
  aanlegpaal:        "Aanlegpaal",
  drijvende_steiger: "Drijvende steiger",
};

// ─── Cluster layer ────────────────────────────────────────────────────────────

function ClusteredMarkers({ locations }: { locations: MapLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (!locations.length) return;

    const cluster = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 60 });

    for (const loc of locations) {
      if (loc.lat == null || loc.lon == null) continue;

      const icon =
        loc.heeft_overslag === true  ? ICONS.overslag :
        loc.heeft_overslag === false ? ICONS.geen_overslag :
                                       ICONS.onbekend;

      const typeLabel = loc.type_kade ? (TYPE_KADE_LABEL[loc.type_kade] ?? loc.type_kade) : null;

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

      L.marker([Number(loc.lat), Number(loc.lon)], { icon })
        .bindPopup(popup)
        .addTo(cluster);
    }

    map.addLayer(cluster);
    return () => { map.removeLayer(cluster); };
  }, [map, locations]);

  return null;
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Pin({ fill }: { fill: string }) {
  return (
    <svg width="14" height="19" viewBox="0 0 22 30" className="shrink-0">
      <path d="M11 0C5 0 0 5 0 11c0 8 11 19 11 19S22 19 22 11C22 5 17 0 11 0z"
            fill={fill} stroke="white" strokeWidth="1.5" />
      <circle cx="11" cy="11" r="4" fill="white" fillOpacity="0.75" />
    </svg>
  );
}

function ClusterBubble({ bg }: { bg: string }) {
  return (
    <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
         style={{ backgroundColor: bg + "55" }}>
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bg }} />
    </div>
  );
}

function MapLegend() {
  return (
    <div className="absolute bottom-8 right-3 z-[1000] bg-white/95 backdrop-blur-sm
                    rounded-lg shadow-lg border border-gray-200 p-3 text-xs min-w-[175px]">
      <p className="font-semibold text-navy uppercase tracking-widest text-[10px] mb-2">
        Legenda
      </p>

      {/* Marker colours */}
      <div className="flex flex-col gap-1.5 mb-2.5">
        {[
          { fill: "#009EE3", label: "Overslaglocatie" },
          { fill: "#156082", label: "Geen overslag / wachtplaats" },
          { fill: "#9CA3AF", label: "Onbekend" },
        ].map(({ fill, label }) => (
          <div key={label} className="flex items-center gap-2">
            <Pin fill={fill} />
            <span className="text-navy/70 leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Cluster colours */}
      <div className="border-t border-gray-100 pt-2">
        <p className="text-[10px] text-navy/40 font-medium uppercase tracking-wide mb-1.5">
          Clusters
        </p>
        <div className="flex flex-col gap-1.5">
          {[
            { bg: "#6ECC39", label: "< 10 locaties" },
            { bg: "#F0C20C", label: "10 – 99 locaties" },
            { bg: "#F18017", label: "≥ 100 locaties" },
          ].map(({ bg, label }) => (
            <div key={label} className="flex items-center gap-2">
              <ClusterBubble bg={bg} />
              <span className="text-navy/70">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LocationsMap() {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loaded, setLoaded]       = useState(0);
  const [total, setTotal]         = useState<number | null>(null);

  useEffect(() => {
    async function fetchAll() {
      const BATCH = 1000;
      let from = 0;
      const acc: MapLocation[] = [];

      const { count } = await supabase
        .from("locations")
        .select("id", { count: "exact", head: true });
      setTotal(count ?? 0);

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
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]
                        bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md
                        text-sm text-navy flex items-center gap-2">
          <span className="animate-spin inline-block w-3.5 h-3.5 border-2
                           border-blue border-t-transparent rounded-full" />
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

      <MapLegend />
    </div>
  );
}
