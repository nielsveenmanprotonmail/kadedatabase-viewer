"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Location } from "@/components/locations-table";
import { TYPE_KADE_LABEL } from "@/lib/location-filters";
import { Pencil, Plus, Search } from "lucide-react";

type Row = Pick<
  Location,
  "id" | "naam" | "plaatsnaam" | "type_kade" | "verificatiestatus" | "bijgewerkt_op"
>;

const PAGE_SIZE = 25;

export function BeheerList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce de zoekterm.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from("locations")
        .select("id, naam, plaatsnaam, type_kade, verificatiestatus, bijgewerkt_op", {
          count: "exact",
        })
        .order("naam", { ascending: true })
        .range(from, to);

      const term = debounced.trim().replace(/[,()]/g, "");
      if (term) q = q.or(`naam.ilike.%${term}%,plaatsnaam.ilike.%${term}%`);

      const { data, count, error: qError } = await q;
      if (cancelled) return;

      if (qError) {
        setError("Kon de records niet laden: " + qError.message);
        setRows([]);
        setTotal(0);
      } else {
        setRows((data as Row[]) ?? []);
        setTotal(count ?? 0);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, debounced]);

  const pageCount = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[16rem] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op naam of plaats…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-gray-light bg-white focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20"
          />
        </div>
        <Link
          href="/beheer/nieuw"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-lime text-navy-deep hover:brightness-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nieuw record
        </Link>
      </div>

      <p className="text-sm text-navy/50">
        {loading ? "Laden…" : `${total.toLocaleString("nl-NL")} records`}
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-light shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy text-left">
              <th className="px-4 py-3 text-xs font-semibold text-white/80 uppercase tracking-wide">Naam</th>
              <th className="px-4 py-3 text-xs font-semibold text-white/80 uppercase tracking-wide">Plaats</th>
              <th className="px-4 py-3 text-xs font-semibold text-white/80 uppercase tracking-wide hidden sm:table-cell">Type kade</th>
              <th className="px-4 py-3 text-xs font-semibold text-white/80 uppercase tracking-wide hidden md:table-cell">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-white/80 uppercase tracking-wide text-right">Actie</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-navy/40">Laden…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-navy/40">Geen records gevonden</td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={i % 2 === 1 ? "bg-gray-light/20 border-t border-gray-light/60" : "border-t border-gray-light/60"}
                >
                  <td className="px-4 py-2.5 font-medium text-navy-deep">{row.naam ?? "—"}</td>
                  <td className="px-4 py-2.5">{row.plaatsnaam ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-xs">
                    {row.type_kade ? (TYPE_KADE_LABEL[row.type_kade] ?? row.type_kade) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-xs text-navy/60">{row.verificatiestatus ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/beheer/${row.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-gray-light text-blue hover:border-blue/40 hover:bg-blue/5 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Bewerken
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-navy/60">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded border border-gray-light bg-white hover:border-navy/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Vorige
          </button>
          <span className="px-2">Pagina {page + 1} van {pageCount}</span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            className="px-3 py-1.5 rounded border border-gray-light bg-white hover:border-navy/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Volgende
          </button>
        </div>
      )}
    </div>
  );
}
