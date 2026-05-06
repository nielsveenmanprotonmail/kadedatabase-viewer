"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Columns,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Location = {
  id: string;
  fis_id: string | null;
  isrs_code: string | null;
  btb_code: string | null;
  naam: string | null;
  alternatieve_naam: string | null;
  primaire_bron: string | null;
  aangemaakt_op: string | null;
  bijgewerkt_op: string | null;
  lat: number | null;
  lon: number | null;
  plaatsnaam: string | null;
  gemeente: string | null;
  vaarweg: string | null;
  kilometerraai: number | null;
  cemt_klasse: string | null;
  type_kade: string | null;
  openbaar_toegankelijk: boolean | null;
  toegankelijk_voor_zeevaart: boolean | null;
  kadelengte_m: number | null;
  kadebreedte_m: number | null;
  kadevlak_m2: number | null;
  perc_verhard_oppervlak: number | null;
  max_scheepslengte_m: number | null;
  max_scheepsbreedte_m: number | null;
  max_diepgang_m: number | null;
  max_doorvaarthoogte_m: number | null;
  max_duwvaartlengte_m: number | null;
  max_duwvaartbreedte_m: number | null;
  afmeren_mogelijk: boolean | null;
  aantal_bolders: number | null;
  adn_klasse: string | null;
  heeft_overslag: boolean | null;
  droge_bulk: boolean | null;
  natte_bulk: boolean | null;
  break_bulk: boolean | null;
  containers: boolean | null;
  passagiers: boolean | null;
  overig_goederen: boolean | null;
  vaste_kraan: boolean | null;
  mobiele_kraan: boolean | null;
  meerpalen_aanwezig: boolean | null;
  transportband: boolean | null;
  buisleiding: boolean | null;
  trechter: boolean | null;
  kiepsteiger: boolean | null;
  silo: boolean | null;
  tankopslag: boolean | null;
  open_opslag: boolean | null;
  gesloten_opslag: boolean | null;
  brandstoflevering: boolean | null;
  pomp: boolean | null;
  milieuklasse: string | null;
  vergunningsinformatie: string | null;
  verificatiestatus: string | null;
  verificatiedatum: string | null;
  opmerking: string | null;
  mapillary_link: string | null;
  gewijzigd_door_bron: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_KADE_LABEL: Record<string, string> = {
  verharde_kade: "Verharde kade",
  wachtplaats: "Wachtplaats",
  onverharde_kade: "Onverharde kade",
  steiger: "Steiger",
  aanlegpaal: "Aanlegpaal",
  drijvende_steiger: "Drijvende steiger",
};

function BoolCell({ value }: { value: boolean | null }) {
  if (value === null || value === undefined)
    return <span className="text-gray-300 select-none">—</span>;
  return value ? (
    <span className="text-lime font-bold">✓</span>
  ) : (
    <span className="text-gray-300">✗</span>
  );
}

function StatusBadge({ value }: { value: string | null }) {
  if (!value) return null;
  const styles: Record<string, string> = {
    automatisch: "bg-blue/10 text-blue border-blue/20",
    handmatig: "bg-lime/20 text-navy border-lime/30",
    geverifieerd: "bg-lime/40 text-navy-deep border-lime/50 font-semibold",
  };
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded text-xs border",
        styles[value] ?? "bg-gray-light text-navy/60 border-gray-light"
      )}
    >
      {value}
    </span>
  );
}

function NumCell({ value }: { value: number | null }) {
  if (value === null || value === undefined)
    return <span className="text-gray-300 select-none">—</span>;
  return <span>{value.toLocaleString("nl-NL")}</span>;
}

// ─── Column definitions ───────────────────────────────────────────────────────

const col = createColumnHelper<Location>();

const COLUMNS = [
  col.accessor("naam", {
    header: "Naam",
    cell: (i) => <span className="font-medium">{i.getValue() ?? "—"}</span>,
  }),
  col.accessor("plaatsnaam", {
    header: "Plaats",
    cell: (i) => i.getValue() ?? <span className="text-gray-300">—</span>,
  }),
  col.accessor("type_kade", {
    header: "Type kade",
    cell: (i) => {
      const v = i.getValue();
      return v ? (
        <span className="text-xs">{TYPE_KADE_LABEL[v] ?? v}</span>
      ) : (
        <span className="text-gray-300">—</span>
      );
    },
  }),
  col.accessor("heeft_overslag", {
    header: "Overslag",
    cell: (i) => <BoolCell value={i.getValue()} />,
  }),
  col.accessor("afmeren_mogelijk", {
    header: "Afmeren",
    cell: (i) => <BoolCell value={i.getValue()} />,
  }),
  col.accessor("primaire_bron", {
    header: "Bron",
    cell: (i) => (
      <span className="text-xs text-navy/60">{i.getValue() ?? "—"}</span>
    ),
  }),
  col.accessor("verificatiestatus", {
    header: "Status",
    cell: (i) => <StatusBadge value={i.getValue()} />,
  }),
  // ── Hidden by default ──────────────────────────────────────────────────────
  col.accessor("gemeente", { header: "Gemeente" }),
  col.accessor("vaarweg", { header: "Vaarweg" }),
  col.accessor("kilometerraai", {
    header: "Km-raai",
    cell: (i) => <NumCell value={i.getValue()} />,
  }),
  col.accessor("cemt_klasse", { header: "CEMT" }),
  col.accessor("isrs_code", { header: "ISRS" }),
  col.accessor("fis_id", { header: "FIS-ID" }),
  col.accessor("btb_code", { header: "BTB" }),
  col.accessor("kadelengte_m", {
    header: "Kadelengte (m)",
    cell: (i) => <NumCell value={i.getValue()} />,
  }),
  col.accessor("kadebreedte_m", {
    header: "Kadebreedte (m)",
    cell: (i) => <NumCell value={i.getValue()} />,
  }),
  col.accessor("max_scheepslengte_m", {
    header: "Max. scheepslengte (m)",
    cell: (i) => <NumCell value={i.getValue()} />,
  }),
  col.accessor("max_scheepsbreedte_m", {
    header: "Max. scheepsbreedte (m)",
    cell: (i) => <NumCell value={i.getValue()} />,
  }),
  col.accessor("max_diepgang_m", {
    header: "Max. diepgang (m)",
    cell: (i) => <NumCell value={i.getValue()} />,
  }),
  col.accessor("max_doorvaarthoogte_m", {
    header: "Max. doorvaarthoogte (m)",
    cell: (i) => <NumCell value={i.getValue()} />,
  }),
  col.accessor("max_duwvaartlengte_m", {
    header: "Max. duwvaartlengte (m)",
    cell: (i) => <NumCell value={i.getValue()} />,
  }),
  col.accessor("max_duwvaartbreedte_m", {
    header: "Max. duwvaartbreedte (m)",
    cell: (i) => <NumCell value={i.getValue()} />,
  }),
  col.accessor("aantal_bolders", {
    header: "Bolders",
    cell: (i) => <NumCell value={i.getValue()} />,
  }),
  col.accessor("adn_klasse", { header: "ADN" }),
  col.accessor("droge_bulk", {
    header: "Droge bulk",
    cell: (i) => <BoolCell value={i.getValue()} />,
  }),
  col.accessor("natte_bulk", {
    header: "Natte bulk",
    cell: (i) => <BoolCell value={i.getValue()} />,
  }),
  col.accessor("containers", {
    header: "Containers",
    cell: (i) => <BoolCell value={i.getValue()} />,
  }),
  col.accessor("break_bulk", {
    header: "Break bulk",
    cell: (i) => <BoolCell value={i.getValue()} />,
  }),
  col.accessor("passagiers", {
    header: "Passagiers",
    cell: (i) => <BoolCell value={i.getValue()} />,
  }),
  col.accessor("overig_goederen", {
    header: "Overig",
    cell: (i) => <BoolCell value={i.getValue()} />,
  }),
  col.accessor("brandstoflevering", {
    header: "Brandstof",
    cell: (i) => <BoolCell value={i.getValue()} />,
  }),
  col.accessor("pomp", {
    header: "Pomp",
    cell: (i) => <BoolCell value={i.getValue()} />,
  }),
  col.accessor("vaste_kraan", {
    header: "Vaste kraan",
    cell: (i) => <BoolCell value={i.getValue()} />,
  }),
  col.accessor("mobiele_kraan", {
    header: "Mobiele kraan",
    cell: (i) => <BoolCell value={i.getValue()} />,
  }),
  col.accessor("opmerking", {
    header: "Opmerking",
    cell: (i) => (
      <span className="text-xs text-navy/50 max-w-xs truncate block">
        {i.getValue() ?? "—"}
      </span>
    ),
  }),
  col.accessor("gewijzigd_door_bron", {
    header: "Gewijzigd door",
    cell: (i) => (
      <span className="text-xs text-navy/40">{i.getValue() ?? "—"}</span>
    ),
  }),
  col.accessor("bijgewerkt_op", {
    header: "Bijgewerkt",
    cell: (i) => {
      const v = i.getValue();
      return v ? (
        <span className="text-xs text-navy/40">
          {new Date(v).toLocaleDateString("nl-NL")}
        </span>
      ) : (
        <span className="text-gray-300">—</span>
      );
    },
  }),
  col.accessor("lat", {
    header: "Lat",
    cell: (i) => {
      const v = i.getValue();
      return v != null ? (
        <span className="text-xs font-mono">{Number(v).toFixed(5)}</span>
      ) : (
        <span className="text-gray-300">—</span>
      );
    },
  }),
  col.accessor("lon", {
    header: "Lon",
    cell: (i) => {
      const v = i.getValue();
      return v != null ? (
        <span className="text-xs font-mono">{Number(v).toFixed(5)}</span>
      ) : (
        <span className="text-gray-300">—</span>
      );
    },
  }),
];

// Columns visible on first load
const DEFAULT_VISIBILITY: VisibilityState = {
  gemeente: false,
  vaarweg: false,
  kilometerraai: false,
  cemt_klasse: false,
  isrs_code: false,
  fis_id: false,
  btb_code: false,
  kadelengte_m: false,
  kadebreedte_m: false,
  max_scheepslengte_m: false,
  max_scheepsbreedte_m: false,
  max_diepgang_m: false,
  max_doorvaarthoogte_m: false,
  max_duwvaartlengte_m: false,
  max_duwvaartbreedte_m: false,
  aantal_bolders: false,
  adn_klasse: false,
  droge_bulk: false,
  natte_bulk: false,
  containers: false,
  break_bulk: false,
  passagiers: false,
  overig_goederen: false,
  brandstoflevering: false,
  pomp: false,
  vaste_kraan: false,
  mobiele_kraan: false,
  opmerking: false,
  gewijzigd_door_bron: false,
  bijgewerkt_op: false,
  lat: false,
  lon: false,
};

// ─── Main component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export function LocationsTable() {
  const [data, setData] = useState<Location[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([{ id: "naam", desc: false }]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>(DEFAULT_VISIBILITY);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  // Close column menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setColMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPageIndex(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch data
  useEffect(() => {
    async function load() {
      setLoading(true);
      const sortCol = sorting[0]?.id ?? "naam";
      const sortAsc = !(sorting[0]?.desc ?? false);
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from("locations")
        .select("*", { count: "exact" })
        .order(sortCol, { ascending: sortAsc })
        .range(from, to);

      if (search.trim()) {
        q = q.or(
          `naam.ilike.%${search.trim()}%,plaatsnaam.ilike.%${search.trim()}%`
        );
      }

      const { data: rows, count } = await q;
      setData((rows as Location[]) ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    }
    load();
  }, [pageIndex, sorting, search]);

  const table = useReactTable({
    data,
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: Math.ceil(total / PAGE_SIZE),
    state: { sorting, columnVisibility },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPageIndex(0);
    },
    onColumnVisibilityChange: setColumnVisibility,
  });

  const pageCount = Math.ceil(total / PAGE_SIZE);
  const from = total === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const to = Math.min((pageIndex + 1) * PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-4">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/30" />
          <input
            type="text"
            placeholder="Zoek op naam of plaats…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-light rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Record count */}
          <span className="text-sm text-navy/50 hidden sm:block">
            {loading ? "Laden…" : `${total.toLocaleString("nl-NL")} locaties`}
          </span>

          {/* Column toggle */}
          <div className="relative" ref={colMenuRef}>
            <button
              onClick={() => setColMenuOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-colors",
                colMenuOpen
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-navy border-gray-light hover:border-navy/30"
              )}
            >
              <Columns className="w-4 h-4" />
              Kolommen
            </button>

            {colMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-light rounded-lg shadow-lg w-64 max-h-96 overflow-y-auto p-2">
                <p className="text-xs font-semibold text-navy/40 uppercase tracking-wide px-2 py-1.5">
                  Toon / verberg kolommen
                </p>
                {table.getAllLeafColumns().map((column) => (
                  <label
                    key={column.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-light/50 text-sm text-navy"
                  >
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                      className="accent-blue w-3.5 h-3.5"
                    />
                    {typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-light shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="bg-navy">
                  {hg.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wide whitespace-nowrap select-none cursor-pointer hover:text-white transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className="flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {sorted === "asc" ? (
                            <ChevronUp className="w-3 h-3 text-blue" />
                          ) : sorted === "desc" ? (
                            <ChevronDown className="w-3 h-3 text-blue" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 text-white/30" />
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={table.getVisibleLeafColumns().length}
                    className="px-4 py-12 text-center text-sm text-navy/40"
                  >
                    Laden…
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getVisibleLeafColumns().length}
                    className="px-4 py-12 text-center text-sm text-navy/40"
                  >
                    Geen locaties gevonden
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-t border-gray-light/60 hover:bg-pale-green/40 transition-colors",
                      i % 2 === 1 && "bg-gray-light/20"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2.5 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-navy/60">
        <span>
          {total > 0 ? `${from}–${to} van ${total.toLocaleString("nl-NL")}` : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={pageIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-gray-light bg-white hover:border-navy/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Vorige
          </button>
          <span className="px-3 py-1.5">
            Pagina {pageIndex + 1} van {pageCount || 1}
          </span>
          <button
            onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
            disabled={pageIndex >= pageCount - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-gray-light bg-white hover:border-navy/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Volgende
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
