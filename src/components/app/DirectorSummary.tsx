import { motion } from "framer-motion";
import { ArrowUpRight, PiggyBank, AlertTriangle, TrendingUp, Sparkles } from "lucide-react";
import type { Intelligence } from "@/hooks/useRestaurantIntelligence";
import { AnimatedNumber } from "@/components/ui/animated-number";

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function DirectorSummary({ ctx }: { ctx: Intelligence }) {
  const top = ctx.recommendations.filter((r) => r.status !== "applied").slice(0, 3);
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        <BigStat
          icon={PiggyBank}
          label="Dinero ganado este mes"
          value={ctx.kpis.savedApplied}
          tone="gold"
          hint={`${ctx.kpis.appliedCount} decisiones ya aplicadas.`}
        />
        <BigStat
          icon={AlertTriangle}
          label="Dinero en juego ahora mismo"
          value={ctx.kpis.savedDetected}
          tone="charcoal"
          hint={`${ctx.kpis.pendingCount} decisiones esperando tu aprobación.`}
        />
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-3xl border border-charcoal/10 bg-white overflow-hidden"
      >
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--gold)]">Oportunidades</p>
            <h2 className="font-heading text-3xl text-charcoal tracking-tight mt-1">Las 3 decisiones importantes</h2>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-charcoal/50">
            <Sparkles className="w-3.5 h-3.5 text-[color:var(--gold)]" /> Firmadas por el Comité
          </span>
        </div>
        {top.length === 0 ? (
          <div className="px-8 pb-10 pt-2 text-charcoal/60">Todo bajo control. Sin decisiones urgentes.</div>
        ) : (
          <ol className="divide-y divide-charcoal/10">
            {top.map((r, i) => (
              <li key={r.id} className="px-8 py-6 flex items-start gap-6 group">
                <span className="font-heading text-4xl text-charcoal/20 tabular-nums w-10 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-xl text-charcoal tracking-tight leading-snug">{r.title}</p>
                  {r.solution && (
                    <p className="text-sm text-charcoal/60 mt-1.5 line-clamp-2">{r.solution}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {Number(r.economic_impact ?? 0) > 0 ? (
                    <p className="font-heading text-2xl text-charcoal tracking-tight tabular-nums">
                      +{eur(Number(r.economic_impact))}
                    </p>
                  ) : (
                    <p className="text-sm text-charcoal/50">{r.time_impact ?? "Impacto operativo"}</p>
                  )}
                  <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40">al mes</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="rounded-3xl bg-charcoal text-cream p-10 relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[color:var(--gold)]/20 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--gold)]">Resumen ejecutivo</p>
          <h2 className="font-heading text-3xl sm:text-4xl tracking-tight mt-2 max-w-2xl leading-tight">
            {buildExecutiveSummary(ctx)}
          </h2>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
            <MiniStat label="Salud" value={`${ctx.kpis.healthScore}/100`} />
            <MiniStat label="Margen medio" value={`${ctx.kpis.avgMargin.toFixed(0)}%`} />
            <MiniStat label="Facturación estimada" value={eur(ctx.kpis.monthlyRevenue)} />
            <MiniStat label="Beneficio estimado" value={eur(ctx.kpis.monthlyProfit)} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function BigStat({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: typeof PiggyBank;
  label: string;
  value: number;
  tone: "gold" | "charcoal";
  hint: string;
}) {
  const isGold = tone === "gold";
  return (
    <div
      className={`rounded-3xl p-8 sm:p-10 border overflow-hidden relative ${
        isGold
          ? "bg-gradient-to-br from-[color:var(--gold)]/15 to-white border-[color:var(--gold)]/25"
          : "bg-white border-charcoal/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="w-11 h-11 rounded-xl bg-charcoal text-white flex items-center justify-center">
          <Icon className="w-5 h-5 text-[color:var(--gold)]" />
        </div>
        <TrendingUp className="w-4 h-4 text-charcoal/40" />
      </div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-charcoal/50 mt-6">{label}</p>
      <div className="font-heading text-5xl sm:text-6xl text-charcoal tracking-tight mt-2 leading-none">
        <AnimatedNumber value={value} format={(n) => eur(Math.round(n))} />
      </div>
      <p className="text-sm text-charcoal/60 mt-4 inline-flex items-center gap-1.5">
        <ArrowUpRight className="w-3.5 h-3.5 text-[color:var(--gold)]" /> {hint}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-cream/60">{label}</p>
      <p className="font-heading text-2xl mt-1.5 tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

function buildExecutiveSummary(ctx: Intelligence) {
  const { healthState, savedApplied, savedDetected, pendingCount } = ctx.kpis;
  if (savedApplied > savedDetected && healthState === "Excelente") {
    return `Vas por delante del objetivo — este mes ya has recuperado ${eur(savedApplied)} y tu salud operativa es excelente.`;
  }
  if (pendingCount > 0) {
    return `Tienes ${eur(savedDetected)} sobre la mesa esperando tu decisión. El Comité ya lo ha preparado todo.`;
  }
  return "Tu restaurante está estable. El Comité seguirá vigilando y avisará ante cualquier cambio.";
}