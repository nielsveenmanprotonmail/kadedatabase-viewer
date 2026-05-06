"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as PieTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, Tooltip as BarTooltip, CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase";

// ─── TSL colours ─────────────────────────────────────────────────────────────

const C = {
  blue:      "#009EE3",
  navy:      "#013A57",
  lime:      "#97C141",
  teal:      "#156082",
  blueMid:   "#0F9ED5",
  navyDeep:  "#0E2841",
  gray:      "#CBD5DC",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Row = {
  type_kade: string | null;
  heeft_overslag: boolean | null;
  plaatsnaam: string | null;
  droge_bulk: boolean | null;
  natte_bulk: boolean | null;
  containers: boolean | null;
  break_bulk: boolean | null;
  passagiers: boolean | null;
  overig_goederen: boolean | null;
};

type ChartEntry = { name: string; value: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countBy(rows: Row[], key: keyof Row, labels?: Record<string, string>): ChartEntry[] {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const raw = r[key];
    const val = raw === null || raw === undefined ? "Onbekend" : String(raw);
    const name = labels?.[val] ?? val;
    counts[name] = (counts[name] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function pct(part: number, total: number) {
  return total ? ((part / total) * 100).toFixed(1) + "%" : "—";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-light shadow-sm p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-navy/40 mb-1">{label}</p>
      <p className="text-3xl font-bold" style={{ color: accent ?? C.navy }}>
        {typeof value === "number" ? value.toLocaleString("nl-NL") : value}
      </p>
      {sub && <p className="text-sm text-navy/50 mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, tall }: {
  title: string; children: React.ReactNode; tall?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-light shadow-sm p-5">
      <h3 className="text-sm font-semibold text-navy mb-4 uppercase tracking-wide">{title}</h3>
      <div style={{ height: tall ? 320 : 240 }}>{children}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-light rounded shadow-md px-3 py-2 text-xs text-navy">
      <p className="font-semibold">{payload[0].name}</p>
      <p>{payload[0].value.toLocaleString("nl-NL")}</p>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export function StatsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const BATCH = 1000;
      let from = 0;
      const acc: Row[] = [];
      while (true) {
        const { data } = await supabase
          .from("locations")
          .select("type_kade,heeft_overslag,plaatsnaam,droge_bulk,natte_bulk,containers,break_bulk,passagiers,overig_goederen")
          .range(from, from + BATCH - 1);
        if (!data || data.length === 0) break;
        acc.push(...(data as Row[]));
        from += BATCH;
        if (data.length < BATCH) break;
      }
      setRows(acc);
      setLoading(false);
    }
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-navy/40">
        <span className="animate-spin inline-block w-4 h-4 border-2 border-blue border-t-transparent rounded-full mr-2" />
        Statistieken laden…
      </div>
    );
  }

  const total = rows.length;
  const metOverslag    = rows.filter((r) => r.heeft_overslag === true).length;
  const geenOverslag   = rows.filter((r) => r.heeft_overslag === false).length;
  const onbekendOverslag = rows.filter((r) => r.heeft_overslag === null).length;
  const metTypeKade    = rows.filter((r) => r.type_kade !== null).length;

  // Heeft overslag donut
  const overslagData: ChartEntry[] = [
    { name: "Ja — overslag",       value: metOverslag },
    { name: "Nee — geen overslag", value: geenOverslag },
    { name: "Onbekend",            value: onbekendOverslag },
  ];
  const overslagColors = [C.blue, C.teal, C.gray];

  // Type kade (excl null → grouped as "Onbekend")
  const typeKadeData = countBy(rows, "type_kade", {
    verharde_kade:     "Verharde kade",
    wachtplaats:       "Wachtplaats",
    onverharde_kade:   "Onverharde kade",
    steiger:           "Steiger",
    aanlegpaal:        "Aanlegpaal",
    drijvende_steiger: "Drijvende steiger",
    Onbekend:          "Niet ingevuld",
  });
  const typeKadeColors = [C.gray, C.blue, C.navy, C.teal, C.blueMid, C.lime, C.navyDeep];

  // Top 10 plaatsen
  const plaatsData = countBy(rows, "plaatsnaam")
    .filter((e) => e.name !== "Onbekend")
    .slice(0, 10)
    .reverse(); // recharts horizontal bar renders bottom-up

  // Goederentypes (count where true)
  const goederenData: ChartEntry[] = [
    { name: "Overig goederen", value: rows.filter((r) => r.overig_goederen).length },
    { name: "Droge bulk",      value: rows.filter((r) => r.droge_bulk).length },
    { name: "Containers",      value: rows.filter((r) => r.containers).length },
    { name: "Natte bulk",      value: rows.filter((r) => r.natte_bulk).length },
    { name: "Break bulk",      value: rows.filter((r) => r.break_bulk).length },
    { name: "Passagiers",      value: rows.filter((r) => r.passagiers).length },
  ].filter((e) => e.value > 0).sort((a, b) => a.value - b.value);

  return (
    <div className="flex flex-col gap-6">

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Totaal locaties"     value={total} />
        <KpiCard label="Met overslag"        value={metOverslag}      sub={pct(metOverslag, total)}      accent={C.blue} />
        <KpiCard label="Geen overslag"       value={geenOverslag}     sub={pct(geenOverslag, total)}     accent={C.teal} />
        <KpiCard label="Type kade ingevuld" value={metTypeKade}      sub={pct(metTypeKade, total)}      accent={C.lime} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <ChartCard title="Heeft overslag">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={overslagData}
                cx="40%" cy="50%"
                innerRadius="45%" outerRadius="70%"
                dataKey="value"
                paddingAngle={2}
              >
                {overslagData.map((_, i) => (
                  <Cell key={i} fill={overslagColors[i]} />
                ))}
              </Pie>
              <PieTooltip content={<CustomTooltip />} />
              <Legend
                layout="vertical" align="right" verticalAlign="middle"
                formatter={(v) => <span style={{ fontSize: 12, color: C.navy }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Type kade">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeKadeData}
                cx="40%" cy="50%"
                innerRadius="45%" outerRadius="70%"
                dataKey="value"
                paddingAngle={2}
              >
                {typeKadeData.map((_, i) => (
                  <Cell key={i} fill={typeKadeColors[i % typeKadeColors.length]} />
                ))}
              </Pie>
              <PieTooltip content={<CustomTooltip />} />
              <Legend
                layout="vertical" align="right" verticalAlign="middle"
                formatter={(v) => <span style={{ fontSize: 12, color: C.navy }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top 10 plaatsen */}
      <ChartCard title="Top 10 plaatsen" tall>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={plaatsData} layout="vertical" margin={{ left: 16, right: 32 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5EBEE" />
            <XAxis type="number" tick={{ fontSize: 11, fill: C.navy + "99" }} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: C.navy }} />
            <BarTooltip content={<CustomTooltip />} cursor={{ fill: "#E5EBEE55" }} />
            <Bar dataKey="value" fill={C.blue} radius={[0, 3, 3, 0]} name="Locaties" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Goederentypes */}
      {goederenData.length > 0 && (
        <ChartCard title="Goederentypes (locaties met type = Ja)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={goederenData} layout="vertical" margin={{ left: 16, right: 32 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5EBEE" />
              <XAxis type="number" tick={{ fontSize: 11, fill: C.navy + "99" }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: C.navy }} />
              <BarTooltip content={<CustomTooltip />} cursor={{ fill: "#E5EBEE55" }} />
              <Bar dataKey="value" fill={C.navy} radius={[0, 3, 3, 0]} name="Locaties" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

    </div>
  );
}
