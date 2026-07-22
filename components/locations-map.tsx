"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { Filter, X, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useSessionState, writeSessionState, readSessionState } from "@/lib/use-session-state";
import {
  type MapFilters as Filters,
  type TriState,
  type CargoKey,
  type ColumnFilter,
  EMPTY_MAP_FILTERS as EMPTY_FILTERS,
  isMapFiltersActive as isFiltersActive,
  TYPE_KADE_LABEL,
  MAP_FILTERS_KEY,
  TABLE_FILTERS_KEY,
  describeColumnFilter,
  applyColumnFiltersToQuery,
} from "@/lib/location-filters";

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
  primaire_bron: string | null;
  verificatiestatus: string | null;
  droge_bulk: boolean | null;
  natte_bulk: boolean | null;
  containers: boolean | null;
  break_bulk: boolean | null;
  passagiers: boolean | null;
  overig_goederen: boolean | null;
};

// ─── Filter options ──────────────────────────────────────────────────────────

const TYPE_KADE_OPTIONS = Object.entries(TYPE_KADE_LABEL).map(([value, label]) => ({ value, label }));

const BRON_OPTIONS = [
  { value: "FIS/FRP", label: "FIS/FRP" },
  { value: "EuRIS",   label: "EuRIS" },
  { value: "BTB",     label: "BTB" },
];

const STATUS_OPTIONS = [
  { value: "automatisch",  label: "Automatisch" },
  { value: "handmatig",    label: "Handmatig" },
  { value: "geverifieerd", label: "Geverifieerd" },
];

const CARGO_OPTIONS: { value: CargoKey; label: string }[] = [
  { value: "droge_bulk",      label: "Droge bulk" },
  { value: "natte_bulk",      label: "Natte bulk" },
  { value: "containers",      label: "Containers" },
  { value: "break_bulk",      label: "Break bulk" },
  { value: "passagiers",      label: "Passagiers" },
  { value: "overig_goederen", label: "Overig" },
];

function matchTri(value: boolean | null, state: TriState): boolean {
  if (state === "alle") return true;
  if (state === "ja")   return value === true;
  return value === false;
}

function applyFilters(locs: MapLocation[], f: Filters): MapLocation[] {
  const term = f.search.trim().toLowerCase();
  return locs.filter((l) => {
    if (term) {
      const hay = `${l.naam ?? ""} ${l.plaatsnaam ?? ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (f.typeKade.length && !(l.type_kade && f.typeKade.includes(l.type_kade))) return false;
    if (f.bron.length     && !(l.primaire_bron && f.bron.includes(l.primaire_bron))) return false;
    if (f.status.length   && !(l.verificatiestatus && f.status.includes(l.verificatiestatus))) return false;
    if (f.cargo.length    && !f.cargo.some((k) => l[k] === true)) return false;
    if (!matchTri(l.heeft_overslag,   f.heeftOverslag))   return false;
    if (!matchTri(l.afmeren_mogelijk, f.afmerenMogelijk)) return false;
    return true;
  });
}

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

// ─── Filter sidebar ───────────────────────────────────────────────────────────

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function CheckboxList<T extends string>({
  options, selected, onToggle,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => {
        const checked = selected.includes(o.value);
        return (
          <label
            key={o.value}
            className="flex items-center gap-2 text-sm text-navy/80 cursor-pointer
                       hover:text-navy py-0.5 select-none"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(o.value)}
              className="accent-blue w-3.5 h-3.5"
            />
            <span className="leading-tight">{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function TriStatePills({
  value, onChange,
}: {
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  const opts: { value: TriState; label: string }[] = [
    { value: "alle", label: "Alle" },
    { value: "ja",   label: "Ja" },
    { value: "nee",  label: "Nee" },
  ];
  return (
    <div className="inline-flex rounded-md border border-gray-light overflow-hidden bg-white">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1 text-xs font-medium transition-colors",
            value === o.value
              ? "bg-navy text-white"
              : "text-navy/70 hover:bg-gray-light/60"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-light first:border-t-0 pt-3 first:pt-0">
      <p className="text-[10px] font-semibold text-navy/50 uppercase tracking-widest mb-1.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function FilterSidebar({
  open, onClose, filters, setFilters, tableFilters, onClearTableFilters, visibleCount, totalCount,
}: {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  tableFilters: ColumnFilter[];
  onClearTableFilters: () => void;
  visibleCount: number;
  totalCount: number;
}) {
  const active = isFiltersActive(filters);

  return (
    <div
      className={cn(
        "absolute top-0 left-0 z-[1000] h-full w-[280px] bg-white shadow-xl",
        "border-r border-gray-light flex flex-col",
        "transition-transform duration-200 ease-out",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-light bg-navy">
        <p className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filters
        </p>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white p-1 rounded transition-colors"
          aria-label="Sluit filters"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Counter + reset */}
      <div className="px-4 py-2.5 border-b border-gray-light flex items-center justify-between bg-gray-light/30">
        <span className="text-xs text-navy/70">
          <span className="font-semibold text-navy">{visibleCount.toLocaleString("nl-NL")}</span>
          {" / "}
          {totalCount.toLocaleString("nl-NL")} zichtbaar
        </span>
        {active && (
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="flex items-center gap-1 text-xs text-blue hover:text-navy transition-colors"
          >
            <X className="w-3 h-3" /> Wis alles
          </button>
        )}
      </div>

      {/* Filter body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Actieve filters uit de Tabel-tab */}
        {tableFilters.length > 0 && (
          <div className="rounded-md border border-blue/25 bg-blue/5 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-blue uppercase tracking-widest mb-1.5">
              Tabelfilters actief
            </p>
            <ul className="text-xs text-navy/80 flex flex-col gap-0.5 mb-2">
              {tableFilters.map((f) => (
                <li key={f.id}>{describeColumnFilter(f)}</li>
              ))}
            </ul>
            <button
              onClick={onClearTableFilters}
              className="flex items-center gap-1 text-xs text-blue hover:text-navy transition-colors"
            >
              <X className="w-3 h-3" /> Wis tabelfilters
            </button>
          </div>
        )}

        {/* Search */}
        <FilterSection title="Zoeken">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy/40" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Naam of plaats…"
              className="w-full text-sm pl-7 pr-2 py-1.5 rounded border border-gray-light
                         bg-white focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20"
            />
          </div>
        </FilterSection>

        <FilterSection title="Type kade">
          <CheckboxList
            options={TYPE_KADE_OPTIONS}
            selected={filters.typeKade}
            onToggle={(v) => setFilters({ ...filters, typeKade: toggle(filters.typeKade, v) })}
          />
        </FilterSection>

        <FilterSection title="Overslag">
          <TriStatePills
            value={filters.heeftOverslag}
            onChange={(v) => setFilters({ ...filters, heeftOverslag: v })}
          />
        </FilterSection>

        <FilterSection title="Afmeren mogelijk">
          <TriStatePills
            value={filters.afmerenMogelijk}
            onChange={(v) => setFilters({ ...filters, afmerenMogelijk: v })}
          />
        </FilterSection>

        <FilterSection title="Goederensoorten (één van)">
          <CheckboxList
            options={CARGO_OPTIONS}
            selected={filters.cargo}
            onToggle={(v) => setFilters({ ...filters, cargo: toggle(filters.cargo, v) })}
          />
        </FilterSection>

        <FilterSection title="Bron">
          <CheckboxList
            options={BRON_OPTIONS}
            selected={filters.bron}
            onToggle={(v) => setFilters({ ...filters, bron: toggle(filters.bron, v) })}
          />
        </FilterSection>

        <FilterSection title="Verificatiestatus">
          <CheckboxList
            options={STATUS_OPTIONS}
            selected={filters.status}
            onToggle={(v) => setFilters({ ...filters, status: toggle(filters.status, v) })}
          />
        </FilterSection>

      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LocationsMap() {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loaded, setLoaded]       = useState(0);
  const [total, setTotal]         = useState<number | null>(null);
  const [filters, setFilters]     = useSessionState<Filters>(MAP_FILTERS_KEY, EMPTY_FILTERS);
  const [sidebarOpen, setSidebarOpen] = useSessionState("kaart:sidebarOpen", false);
  // Filters die in de Tabel-tab zijn ingesteld, gelden ook hier
  const [tableFilters, setTableFilters] = useState<ColumnFilter[]>(() =>
    readSessionState(TABLE_FILTERS_KEY, [])
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLocations([]);
      setLoaded(0);
      setTotal(null);

      const BATCH = 1000;
      let from = 0;
      const acc: MapLocation[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let countQ: any = supabase
        .from("locations")
        .select("id", { count: "exact", head: true });
      countQ = applyColumnFiltersToQuery(countQ, tableFilters);
      const { count } = await countQ;
      if (cancelled) return;
      setTotal(count ?? 0);

      while (!cancelled) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let batchQ: any = supabase
          .from("locations")
          .select(
            "id,naam,plaatsnaam,lat,lon,type_kade,heeft_overslag,afmeren_mogelijk," +
            "primaire_bron,verificatiestatus," +
            "droge_bulk,natte_bulk,containers,break_bulk,passagiers,overig_goederen"
          );
        batchQ = applyColumnFiltersToQuery(batchQ, tableFilters);
        const { data: rows } = await batchQ.range(from, from + BATCH - 1);

        if (cancelled || !rows || rows.length === 0) break;
        acc.push(...(rows as unknown as MapLocation[]));
        setLoaded(acc.length);
        from += BATCH;
        if (rows.length < BATCH) break;
      }

      if (!cancelled) setLocations(acc);
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [tableFilters]);

  function clearTableFilters() {
    writeSessionState(TABLE_FILTERS_KEY, []);
    setTableFilters([]);
  }

  const isLoading = total === null || loaded < (total ?? 0);

  const filteredLocations = useMemo(
    () => applyFilters(locations, filters),
    [locations, filters]
  );
  const active = isFiltersActive(filters) || tableFilters.length > 0;

  return (
    <div className="relative h-full">
      {/* Sidebar toggle button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className={cn(
          "absolute top-3 left-3 z-[999] flex items-center gap-2",
          "bg-white shadow-md border border-gray-light rounded-md",
          "px-3 py-2 text-sm font-medium text-navy",
          "hover:border-blue/40 hover:shadow-lg transition-all",
          sidebarOpen && "opacity-0 pointer-events-none"
        )}
      >
        <Filter className="w-4 h-4" />
        Filters
        {active && (
          <span className="bg-blue text-white text-[10px] font-bold leading-none
                           px-1.5 py-0.5 rounded-full">
            actief
          </span>
        )}
      </button>

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

      {/* "Geen resultaten" hint */}
      {!isLoading && active && filteredLocations.length === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]
                        bg-white/95 backdrop-blur px-4 py-2 rounded-full shadow-md
                        text-sm text-navy">
          Geen locaties voldoen aan de filters
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
        <ClusteredMarkers locations={filteredLocations} />
      </MapContainer>

      <MapLegend />

      <FilterSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        filters={filters}
        setFilters={setFilters}
        tableFilters={tableFilters}
        onClearTableFilters={clearTableFilters}
        visibleCount={filteredLocations.length}
        totalCount={locations.length}
      />
    </div>
  );
}
