// Gedeelde filterlogica voor de Tabel- en Kaart-tab.
// Beide tabs passen zowel de tabel-kolomfilters als de kaart-zijbalkfilters toe,
// zodat de selectie behouden blijft bij het wisselen van tab.

// Session-store sleutels (zie lib/use-session-state.ts)
export const TABLE_FILTERS_KEY = "tabel:columnFilters";
export const MAP_FILTERS_KEY = "kaart:filters";

// Waarden gelijk aan de DB-CHECK-constraint op public.locations.type_kade.
export const TYPE_KADE_LABEL: Record<string, string> = {
  verharde_kade:         "Verharde kade",
  onverharde_kade:       "Onverharde kade",
  oever_meerpalen:       "Oever met meerpalen",
  overdekte_overslaghal: "Overdekte overslaghal",
  veerstoep:             "Veerstoep",
  wachtplaats:           "Wachtplaats",
};

// ─── Tabel-kolomfilters ───────────────────────────────────────────────────────

export type ColumnFilterType = "text" | "boolean" | "select" | "gte";

export type ColumnFilter = { id: string; value: unknown };

// Houd in sync met de column-meta in components/locations-table.tsx
export const COLUMN_FILTERS: Record<string, { type: ColumnFilterType; label: string }> = {
  naam:                  { type: "text",    label: "Naam" },
  plaatsnaam:            { type: "text",    label: "Plaats" },
  type_kade:             { type: "select",  label: "Type kade" },
  heeft_overslag:        { type: "boolean", label: "Overslag" },
  afmeren_mogelijk:      { type: "boolean", label: "Afmeren" },
  container_lagen:       { type: "gte",     label: "Containerlagen" },
  primaire_bron:         { type: "select",  label: "Bron" },
  verificatiestatus:     { type: "select",  label: "Status" },
  gemeente:              { type: "text",    label: "Gemeente" },
  vaarweg:               { type: "text",    label: "Vaarweg" },
  kilometerraai:         { type: "gte",     label: "Km-raai" },
  cemt_klasse:           { type: "select",  label: "CEMT" },
  isrs_code:             { type: "text",    label: "ISRS" },
  fis_id:                { type: "text",    label: "FIS-ID" },
  btb_code:              { type: "text",    label: "BTB" },
  kadelengte_m:          { type: "gte",     label: "Kadelengte (m)" },
  kadebreedte_m:         { type: "gte",     label: "Kadebreedte (m)" },
  max_scheepslengte_m:   { type: "gte",     label: "Max. scheepslengte (m)" },
  max_scheepsbreedte_m:  { type: "gte",     label: "Max. scheepsbreedte (m)" },
  max_diepgang_m:        { type: "gte",     label: "Max. diepgang (m)" },
  max_doorvaarthoogte_m: { type: "gte",     label: "Max. doorvaarthoogte (m)" },
  max_duwvaartlengte_m:  { type: "gte",     label: "Max. duwvaartlengte (m)" },
  max_duwvaartbreedte_m: { type: "gte",     label: "Max. duwvaartbreedte (m)" },
  aantal_bolders:        { type: "gte",     label: "Bolders" },
  adn_klasse:            { type: "text",    label: "ADN" },
  droge_bulk:            { type: "boolean", label: "Droge bulk" },
  natte_bulk:            { type: "boolean", label: "Natte bulk" },
  containers:            { type: "boolean", label: "Containers" },
  zeehaven_containerterminal: { type: "boolean", label: "Zeehaven-containerterminal" },
  break_bulk:            { type: "boolean", label: "Break bulk" },
  passagiers:            { type: "boolean", label: "Passagiers" },
  overig_goederen:       { type: "boolean", label: "Overig" },
  brandstoflevering:     { type: "boolean", label: "Brandstof" },
  pomp:                  { type: "boolean", label: "Pomp" },
  vaste_kraan:           { type: "boolean", label: "Vaste kraan" },
  mobiele_kraan:         { type: "boolean", label: "Mob. kraan" },
  opmerking:             { type: "text",    label: "Opmerking" },
  gewijzigd_door_bron:   { type: "text",    label: "Gewijzigd door" },
};

// Minimale structurele typering van de Supabase query-builder,
// zodat deze helpers zonder `any` bruikbaar zijn.
type FilterableQuery = {
  eq(column: string, value: unknown): FilterableQuery;
  is(column: string, value: null): FilterableQuery;
  gte(column: string, value: number): FilterableQuery;
  ilike(column: string, pattern: string): FilterableQuery;
  in(column: string, values: readonly unknown[]): FilterableQuery;
  or(filters: string): FilterableQuery;
};

export function applyColumnFiltersToQuery<Q extends FilterableQuery>(
  q: Q,
  filters: ColumnFilter[]
): Q {
  let query: FilterableQuery = q;
  for (const f of filters) {
    const val = f.value as string;
    if (!val && val !== "false") continue;

    const type = COLUMN_FILTERS[f.id]?.type;
    if (type === "boolean") {
      if (val === "null") query = query.is(f.id, null);
      else query = query.eq(f.id, val === "true");
    } else if (type === "select") {
      query = query.eq(f.id, val);
    } else if (type === "gte") {
      const num = parseFloat(val);
      if (!isNaN(num)) query = query.gte(f.id, num);
    } else {
      // text (default)
      query = query.ilike(f.id, `%${val}%`);
    }
  }
  return query as Q;
}

export function describeColumnFilter(f: ColumnFilter): string {
  const def = COLUMN_FILTERS[f.id];
  const label = def?.label ?? f.id;
  const val = String(f.value);
  switch (def?.type) {
    case "boolean":
      return `${label}: ${val === "true" ? "Ja" : val === "false" ? "Nee" : "Onbekend"}`;
    case "gte":
      return `${label} ≥ ${val}`;
    case "select":
      return `${label}: ${f.id === "type_kade" ? TYPE_KADE_LABEL[val] ?? val : val}`;
    default:
      return `${label} bevat "${val}"`;
  }
}

// ─── Kaart-zijbalkfilters ─────────────────────────────────────────────────────

export type TriState = "alle" | "ja" | "nee";

export type CargoKey =
  | "droge_bulk" | "natte_bulk" | "containers"
  | "break_bulk" | "passagiers" | "overig_goederen";

export type MapFilters = {
  search:          string;
  typeKade:        string[];
  bron:            string[];
  status:          string[];
  cargo:           CargoKey[];
  heeftOverslag:   TriState;
  afmerenMogelijk: TriState;
};

export const EMPTY_MAP_FILTERS: MapFilters = {
  search:          "",
  typeKade:        [],
  bron:            [],
  status:          [],
  cargo:           [],
  heeftOverslag:   "alle",
  afmerenMogelijk: "alle",
};

export function isMapFiltersActive(f: MapFilters): boolean {
  return (
    f.search.trim() !== "" ||
    f.typeKade.length > 0 ||
    f.bron.length > 0 ||
    f.status.length > 0 ||
    f.cargo.length > 0 ||
    f.heeftOverslag !== "alle" ||
    f.afmerenMogelijk !== "alle"
  );
}

export function applyMapFiltersToQuery<Q extends FilterableQuery>(
  q: Q,
  f: MapFilters
): Q {
  let query: FilterableQuery = q;
  // Komma's en haakjes zijn scheidingstekens in de PostgREST or()-syntax
  const term = f.search.trim().replace(/[,()]/g, "");
  if (term) query = query.or(`naam.ilike.%${term}%,plaatsnaam.ilike.%${term}%`);
  if (f.typeKade.length) query = query.in("type_kade", f.typeKade);
  if (f.bron.length)     query = query.in("primaire_bron", f.bron);
  if (f.status.length)   query = query.in("verificatiestatus", f.status);
  if (f.cargo.length)    query = query.or(f.cargo.map((c) => `${c}.eq.true`).join(","));
  if (f.heeftOverslag !== "alle")   query = query.eq("heeft_overslag", f.heeftOverslag === "ja");
  if (f.afmerenMogelijk !== "alle") query = query.eq("afmeren_mogelijk", f.afmerenMogelijk === "ja");
  return query as Q;
}
