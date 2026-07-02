import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import type { DailySnapshot } from "@/hooks/useRestaurantIntelligence";

type Range = "hoy" | "ayer" | "7d" | "30d";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const dayFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

export function HistoryCharts({ snapshots }: { snapshots: DailySnapshot[] }) {
  const [range, setRange] = useState<Range>("30d");
  const data = useMemo(() => filterRange(snapshots, range), [snapshots, range]);
  const totals = useMemo(() => {
    const savedDetected = data.reduce((s, d) => s + Number(d.saved_detected), 0);
    const savedApplied = data.reduce((s, d) => s + Number(d.saved_applied), 0);
    const recsApplied = data.reduce((s, d) => s + Number(d.recs_applied), 0);
    const avgMargin =
      data.length > 0 ? data.reduce((s, d) => s + Number(d.avg_margin), 0) / data.length : 0;
    return { savedDetected, savedApplied, recsApplied, avgMargin };
  }, [data]);

  const chartData = data.map((s) => ({
    label: dayFmt.format(new Date(s.date)),
    detected: Number(s.saved_detected),
    applied: Number(s.saved_applied),
    margin: Number(s.avg_margin),
    stock: Number(s.stock_value),
    waste: Number(s.waste_estimate),
    recsApplied: Number(s.recs_applied),
    recsPending: Number(s.recs_pending),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex items-center gap-1 rounded-full bg-white border border-charcoal/10 p-1">
          {(["hoy", "ayer", "7d", "30d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors ${
                range === r
                  ? "bg-charcoal text-white"
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              {rangeLabel(r)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-right">
          <Kpi label="Ahorro detectado" value={eur.format(totals.savedDetected)} />
          <Kpi label="Ahorro conseguido" value={eur.format(totals.savedApplied)} tone="gold" />
          <Kpi label="Decisiones aplicadas" value={String(totals.recsApplied)} />
          <Kpi label="Margen medio" value={`${totals.avgMargin.toFixed(1)}%`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Evolución del ahorro" subtitle="Detectado vs conseguido">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="detected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.75 0.14 85)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="oklch(0.75 0.14 85)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="applied" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.22 0.02 265)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="oklch(0.22 0.02 265)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<PrettyTooltip formatter={(v: number | string) => eur.format(Number(v))} />} />
              <Area type="monotone" dataKey="detected" stroke="oklch(0.75 0.14 85)" strokeWidth={2} fill="url(#detected)" />
              <Area type="monotone" dataKey="applied" stroke="oklch(0.22 0.02 265)" strokeWidth={2} fill="url(#applied)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Margen medio" subtitle="Porcentaje diario">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }} tickLine={false} axisLine={false} width={40} domain={["auto", "auto"]} />
              <Tooltip content={<PrettyTooltip formatter={(v: number | string) => `${Number(v).toFixed(1)}%`} />} />
              <Line type="monotone" dataKey="margin" stroke="oklch(0.6 0.18 75)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Decisiones del Comité" subtitle="Aplicadas y pendientes por día">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }} tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<PrettyTooltip />} />
              <Bar dataKey="recsApplied" stackId="a" fill="oklch(0.75 0.14 85)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recsPending" stackId="a" fill="oklch(0.85 0.02 260)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Stock y desperdicio" subtitle="Valor en €">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="stock" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.55 0.1 160)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.55 0.1 160)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<PrettyTooltip formatter={(v: number | string) => eur.format(Number(v))} />} />
              <Area type="monotone" dataKey="stock" stroke="oklch(0.55 0.1 160)" strokeWidth={2} fill="url(#stock)" />
              <Line type="monotone" dataKey="waste" stroke="oklch(0.65 0.2 30)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-charcoal/10 bg-white p-6"
    >
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45">{subtitle}</p>
        <h3 className="font-heading text-lg text-charcoal tracking-tight mt-0.5">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "gold" }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45">{label}</p>
      <p className={`font-heading text-xl tracking-tight tabular-nums mt-1 ${tone === "gold" ? "text-[color:var(--gold-dark)]" : "text-charcoal"}`}>
        {value}
      </p>
    </div>
  );
}

function PrettyTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-charcoal/10 bg-white shadow-lg px-3 py-2 text-xs">
      <p className="text-charcoal/50 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 tabular-nums">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-charcoal">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function filterRange(snapshots: DailySnapshot[], range: Range): DailySnapshot[] {
  if (snapshots.length === 0) return [];
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date().toISOString().slice(0, 10);
  if (range === "hoy") return sorted.filter((s) => s.date === today);
  if (range === "ayer") {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const key = y.toISOString().slice(0, 10);
    return sorted.filter((s) => s.date === key);
  }
  const days = range === "7d" ? 7 : 30;
  return sorted.slice(-days);
}

function rangeLabel(r: Range) {
  return r === "hoy" ? "Hoy" : r === "ayer" ? "Ayer" : r === "7d" ? "7 días" : "30 días";
}