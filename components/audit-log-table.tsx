"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightSm, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type HistoryRow = {
  history_id: string;
  location_id: string;
  operatie: string;
  gewijzigd_op: string;
  gewijzigd_door_bron: string | null;
  gewijzigd_door_user_id: string | null;
  naam: string | null;
  plaatsnaam: string | null;
  type_kade: string | null;
  heeft_overslag: boolean | null;
  verificatiestatus: string | null;
  // full snapshot (remaining fields)
  [key: string]: unknown;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OPERATIE_STYLE: Record<string, string> = {
  INSERT: "bg-lime/30 text-navy-deep border-lime/50",
  UPDATE: "bg-blue/10 text-blue border-blue/20",
  DELETE: "bg-red-100 text-red-700 border-red-200",
};

// Fields to hide in the detail expansion (already shown in main columns)
const SKIP_IN_DETAIL = new Set([
  "history_id", "location_id", "operatie", "gewijzigd_op",
  "gewijzigd_door_user_id", "naam", "plaatsnaam", "type_kade",
  "heeft_overslag", "verificatiestatus", "gewijzigd_door_bron",
]);

function formatDt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("nl-NL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Ja" : "Nee";
  if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}T/))
    return new Date(value).toLocaleString("nl-NL");
  return String(value);
}

// ─── Main component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export function AuditLogTable() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [naam, setNaam] = useState("");
  const [operatie, setOperatie] = useState("");
  const [bron, setBron] = useState("");
  const [applied, setApplied] = useState({ naam: "", operatie: "", bron: "" });

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setApplied({ naam, operatie, bron });
      setPageIndex(0);
    }, 300);
    return () => clearTimeout(t);
  }, [naam, operatie, bron]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from("locations_history")
        .select("*", { count: "exact" })
        .order("gewijzigd_op", { ascending: false })
        .range(from, to);

      if (applied.naam)     q = q.ilike("naam", `%${applied.naam}%`);
      if (applied.operatie) q = q.eq("operatie", applied.operatie);
      if (applied.bron)     q = q.ilike("gewijzigd_door_bron", `%${applied.bron}%`);

      const { data, count } = await q;
      setRows((data as HistoryRow[]) ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    }
    load();
  }, [pageIndex, applied]);

  const hasFilters = naam || operatie || bron;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const fromRow = total === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const toRow = Math.min((pageIndex + 1) * PAGE_SIZE, total);

  function clearFilters() {
    setNaam(""); setOperatie(""); setBron("");
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text" value={naam} onChange={(e) => setNaam(e.target.value)}
          placeholder="Zoek op naam…"
          className="text-sm px-3 py-2 border border-gray-light rounded-md bg-white focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20 w-48"
        />
        <select
          value={operatie} onChange={(e) => setOperatie(e.target.value)}
          className="text-sm px-3 py-2 border border-gray-light rounded-md bg-white focus:outline-none focus:border-blue"
        >
          <option value="">Alle operaties</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
        <input
          type="text" value={bron} onChange={(e) => setBron(e.target.value)}
          placeholder="Filter op bron…"
          className="text-sm px-3 py-2 border border-gray-light rounded-md bg-white focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20 w-48"
        />
        {hasFilters && (
          <button onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-blue hover:text-navy transition-colors">
            <X className="w-3 h-3" /> Wis filters
          </button>
        )}
        <span className="ml-auto text-sm text-navy/50">
          {loading ? "Laden…" : `${total.toLocaleString("nl-NL")} wijzigingen`}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-light shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-navy text-white/80 text-xs font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-left w-8" />
                <th className="px-4 py-3 text-left whitespace-nowrap">Datum &amp; tijd</th>
                <th className="px-4 py-3 text-left">Operatie</th>
                <th className="px-4 py-3 text-left">Naam</th>
                <th className="px-4 py-3 text-left">Plaats</th>
                <th className="px-4 py-3 text-left">Bron</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-navy/40">Laden…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-navy/40">Geen resultaten</td>
                </tr>
              ) : rows.map((row, i) => {
                const isExpanded = expandedId === row.history_id;
                // Collect non-null extra fields for detail panel
                const detailFields = Object.entries(row).filter(
                  ([k, v]) => !SKIP_IN_DETAIL.has(k) && v !== null && v !== undefined
                );

                return [
                  // Main row
                  <tr
                    key={row.history_id}
                    onClick={() => setExpandedId(isExpanded ? null : row.history_id)}
                    className={cn(
                      "border-t border-gray-light/60 cursor-pointer transition-colors",
                      isExpanded ? "bg-pale-green/40" : i % 2 === 1 ? "bg-gray-light/15 hover:bg-pale-green/20" : "hover:bg-pale-green/20"
                    )}
                  >
                    <td className="px-4 py-2.5 text-navy/30">
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRightSm className="w-4 h-4" />}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-navy/60 text-xs font-mono">
                      {formatDt(row.gewijzigd_op)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded text-xs font-semibold border",
                        OPERATIE_STYLE[row.operatie] ?? "bg-gray-light text-navy/60 border-gray-light"
                      )}>
                        {row.operatie}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-navy">
                      {row.naam ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-navy/60">
                      {row.plaatsnaam ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-navy/40">
                      {row.gewijzigd_door_bron ?? "—"}
                    </td>
                  </tr>,

                  // Expanded detail row
                  isExpanded && (
                    <tr key={`${row.history_id}-detail`} className="border-t border-gray-light/40 bg-pale-green/20">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                          {/* Always show these key snapshot fields */}
                          {[
                            ["type_kade",         row.type_kade],
                            ["heeft_overslag",    row.heeft_overslag],
                            ["verificatiestatus", row.verificatiestatus],
                          ].filter(([, v]) => v !== null).map(([k, v]) => (
                            <div key={String(k)}>
                              <dt className="text-[10px] text-navy/40 uppercase tracking-wide">{String(k)}</dt>
                              <dd className="text-xs text-navy">{formatValue(v)}</dd>
                            </div>
                          ))}
                          {/* Remaining non-null fields */}
                          {detailFields.map(([k, v]) => (
                            <div key={k}>
                              <dt className="text-[10px] text-navy/40 uppercase tracking-wide">{k}</dt>
                              <dd className="text-xs text-navy">{formatValue(v)}</dd>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-[10px] text-navy/30 font-mono">
                          history_id: {row.history_id} &nbsp;·&nbsp; location_id: {row.location_id}
                        </p>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-navy/60">
        <span>{total > 0 ? `${fromRow}–${toRow} van ${total.toLocaleString("nl-NL")}` : ""}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={pageIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-gray-light bg-white hover:border-navy/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Vorige
          </button>
          <span className="px-3 py-1.5">Pagina {pageIndex + 1} van {pageCount || 1}</span>
          <button
            onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
            disabled={pageIndex >= pageCount - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-gray-light bg-white hover:border-navy/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Volgende <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
