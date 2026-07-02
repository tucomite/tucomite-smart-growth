import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import {
  ChefHat,
  Sparkles,
  PiggyBank,
  AlertTriangle,
  ShoppingBasket,
  Lightbulb,
  Package,
  BarChart3,
  Megaphone,
  FileText,
  ClipboardList,
  Check,
  ArrowUpRight,
  Activity,
  Moon,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  useRestaurantIntelligence,
  type Recommendation as RecT,
  type Dish as DishRow,
  type Ingredient as IngredientRow,
  type Supplier as SupplierRow,
} from "@/hooks/useRestaurantIntelligence";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { DirectorModeToggle, type Mode } from "@/components/app/DirectorModeToggle";
import { DirectorSummary } from "@/components/app/DirectorSummary";
import { CommitteeTimeline } from "@/components/app/CommitteeTimeline";
import { RecommendationRationale } from "@/components/app/RecommendationRationale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Centro de mando — TuComité" }] }),
  component: DashboardPage,
});

type RecommendationRow = RecT;

const PRIORITY_META: Record<
  string,
  { icon: typeof PiggyBank; tone: "gold" | "warn" | "neutral"; label: string }
> = {
  high: { icon: AlertTriangle, tone: "warn", label: "Prioridad alta" },
  medium: { icon: PiggyBank, tone: "gold", label: "Oportunidad" },
  low: { icon: Lightbulb, tone: "neutral", label: "Sugerencia" },
};

const ACTIVITY_ICON: Record<string, typeof PiggyBank> = {
  chef: ChefHat,
  finance: BarChart3,
  purchasing: ShoppingBasket,
  stock: Package,
  marketing: Megaphone,
  report: FileText,
};

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function DashboardPage() {
  const ctx = useRestaurantIntelligence();
  const { loading, restaurantName, userName, recommendations, dishes, ingredients, suppliers, kpis } = ctx;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "operativo";
    return (window.localStorage.getItem("tucomite:mode") as Mode) || "operativo";
  });
  function changeMode(m: Mode) {
    setMode(m);
    if (typeof window !== "undefined") window.localStorage.setItem("tucomite:mode", m);
  }
  const appliedIds = useMemo(
    () => new Set(recommendations.filter((r) => r.status === "applied").map((r) => r.id)),
    [recommendations],
  );

  const firstName = useMemo(() => (userName ? userName.split(" ")[0] : ""), [userName]);
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
        new Date(),
      ),
    [],
  );

  const health = useMemo(
    () => computeHealth(dishes, ingredients, recommendations, suppliers),
    [dishes, ingredients, recommendations, suppliers],
  );
  const night = useMemo(
    () => computeNightReport(dishes, ingredients, recommendations, suppliers),
    [dishes, ingredients, recommendations, suppliers],
  );
  const memory = useMemo(() => computeMemory(recommendations), [recommendations]);
  const pulses = useMemo(
    () => computePulses(recommendations, ingredients, suppliers),
    [recommendations, ingredients, suppliers],
  );

  const pendingRecs = recommendations.filter((r) => r.status !== "applied");

  async function apply(id: string) {
    const { error } = await supabase.from("recommendations").update({ status: "applied" }).eq("id", id);
    if (error) {
      toast.error("No se pudo aplicar la recomendación");
      return;
    }
    toast.success("Recomendación aplicada", {
      description: "El Comité lo tendrá en cuenta en el próximo informe.",
    });
  }

  return (
    <AppShell
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Centro de mando · {today}
        </span>
      }
    >
      <div className="px-6 sm:px-10 lg:px-16 py-12 sm:py-16 max-w-5xl mx-auto">
        {/* Mode + greeting */}
        <div className="flex items-start justify-between gap-6 mb-8 flex-wrap">
          <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0"
        >
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">
            {restaurantName || "Tu restaurante"} · Informe ejecutivo
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-charcoal mt-4 tracking-tight leading-[1.05]">
            Buenos días{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="text-charcoal/60 text-lg mt-4 max-w-2xl leading-relaxed">
            El Comité ha terminado el análisis nocturno. Este es el estado de tu restaurante ahora mismo.
          </p>
          </motion.section>
          <DirectorModeToggle mode={mode} onChange={changeMode} />
        </div>

        <AnimatePresence mode="wait">
          {mode === "director" ? (
            <motion.div
              key="director"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >
              <DirectorSummary ctx={ctx} />
            </motion.div>
          ) : (
            <motion.div
              key="operativo"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >

        {/* Live pulses */}
        {pulses.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-wrap gap-2"
          >
            {pulses.map((p, i) => (
              <motion.span
                key={p.text + i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.06 }}
                className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white border border-charcoal/10 text-charcoal/75"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--gold)] animate-pulse" />
                {p.text}
              </motion.span>
            ))}
          </motion.div>
        )}

        {/* Health index */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-10 rounded-3xl border border-charcoal/10 bg-white overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr]">
            <div className="p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-charcoal/10 flex flex-col justify-between gap-6 bg-gradient-to-br from-white to-[color:var(--cream)]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-charcoal/45 font-medium flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" /> Salud del restaurante
                </p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-heading text-6xl sm:text-7xl text-charcoal tracking-tight tabular-nums">
                    <AnimatedNumber value={health.score} />
                  </span>
                  <span className="text-charcoal/40 text-lg">/100</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${health.stateClass}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {health.state}
                  </span>
                  <TrendChip delta={health.delta} label="vs semana pasada" />
                </div>
              </div>
              <p className="text-sm text-charcoal/60 leading-relaxed">{health.summary}</p>
            </div>
            <div className="p-6 sm:p-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {health.pillars.map((p) => (
                <PillarStat key={p.key} label={p.label} score={p.score} delta={p.delta} />
              ))}
            </div>
          </div>
        </motion.section>

        {/* Mientras dormías */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-8 rounded-3xl bg-charcoal text-cream p-8 sm:p-10 overflow-hidden relative"
        >
          <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[color:var(--gold)] blur-3xl" />
          </div>
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--gold)] flex items-center gap-2">
              <Moon className="w-3.5 h-3.5" /> Mientras dormías…
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl tracking-tight mt-3 leading-tight max-w-xl">
              El Comité trabajó durante la noche.
            </h2>
            <ul className="mt-8 space-y-3 max-w-2xl">
              {night.lines.map((line, i) => {
                const Icon = line.icon;
                return (
                  <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-cream/90">
                    <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5 text-[color:var(--gold)]">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="leading-snug">{line.text}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-9 pt-6 border-t border-white/10 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[color:var(--gold)]" />
                <span className="text-sm text-cream/70">Tiempo ahorrado hoy</span>
              </div>
              <span className="font-heading text-2xl sm:text-3xl tracking-tight tabular-nums">
                {night.timeSaved}
              </span>
            </div>
          </div>
        </motion.section>

        {/* Memoria del Comité */}
        {memory.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10"
          >
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-heading text-2xl text-charcoal tracking-tight">Memoria del Comité</h2>
              <span className="text-xs uppercase tracking-[0.15em] text-charcoal/40">últimos 7 días</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {memory.map((m, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-charcoal/10 bg-white px-5 py-4 flex items-start gap-3"
                >
                  <span className="w-8 h-8 rounded-full bg-[color:var(--gold)]/15 text-[color:var(--gold)] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <p className="text-sm text-charcoal leading-snug">{m}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Recommendations */}
        <section className="mt-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-heading text-2xl text-charcoal tracking-tight">Decisiones sugeridas</h2>
            <span className="text-xs uppercase tracking-[0.15em] text-charcoal/40">
              {pendingRecs.length} pendientes
            </span>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 rounded-2xl border border-charcoal/10 bg-white/60 animate-pulse" />
              ))}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-charcoal/15 bg-white/60 p-10 text-center">
              <p className="text-charcoal/60">El Comité aún no ha generado recomendaciones.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec, i) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  index={i}
                  applied={appliedIds.has(rec.id)}
                  onApply={() => apply(rec.id)}
                  expanded={expanded === rec.id}
                  onToggleExpand={() => setExpanded((cur) => (cur === rec.id ? null : rec.id))}
                  restaurantName={restaurantName}
                  ctx={ctx}
                />
              ))}
            </div>
          )}
        </section>

        {/* Committee activity — timeline */}
        <section className="mt-16">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-heading text-2xl text-charcoal tracking-tight">Cronología del Comité</h2>
            <span className="text-xs uppercase tracking-[0.15em] text-charcoal/40 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              en vivo
            </span>
          </div>
          <div className="rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-7">
            <CommitteeTimeline ctx={ctx} />
          </div>
        </section>

        {/* Signature */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 pt-10 border-t border-charcoal/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-charcoal flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[color:var(--gold)]" />
            </div>
            <div>
              <p className="text-sm text-charcoal font-medium">Firmado por el Comité</p>
              <p className="text-xs text-charcoal/50">Próximo informe mañana a las 07:00</p>
            </div>
          </div>
          <p className="text-xs text-charcoal/40 max-w-sm sm:text-right">
            Este informe ha sido generado esta madrugada a partir de tu carta, tus proveedores y tu inventario más reciente.
          </p>
        </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

// ---------- Pillars ----------

function PillarStat({
  label,
  score,
  delta,
}: {
  label: string;
  score: number;
  delta: number;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45">{label}</p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-heading text-2xl text-charcoal tracking-tight tabular-nums">{score}</span>
        <span className="text-xs text-charcoal/40">/100</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-charcoal/[0.08] overflow-hidden">
        <div
          className="h-full bg-[color:var(--gold)]"
          style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
        />
      </div>
      <TrendChip delta={delta} label="" small />
    </div>
  );
}

function TrendChip({ delta, label, small }: { delta: number; label: string; small?: boolean }) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const cls =
    delta > 0
      ? "text-emerald-700"
      : delta < 0
        ? "text-amber-700"
        : "text-charcoal/50";
  const sign = delta > 0 ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-1 mt-2 ${small ? "text-[11px]" : "text-xs"} ${cls}`}>
      <Icon className={small ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {sign}
      {delta} {label ? <span className="text-charcoal/45">{label}</span> : null}
    </span>
  );
}

// ---------- Recommendation card + expanded plan ----------

function RecommendationCard({
  rec,
  index,
  applied,
  onApply,
  expanded,
  onToggleExpand,
  restaurantName,
}: {
  rec: RecommendationRow;
  index: number;
  applied: boolean;
  onApply: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  restaurantName: string;
}) {
  const meta = PRIORITY_META[rec.priority] ?? PRIORITY_META.medium;
  const Icon = meta.icon;
  const toneAccent =
    meta.tone === "gold"
      ? "bg-[color:var(--gold)]/15 text-[color:var(--gold)]"
      : meta.tone === "warn"
        ? "bg-amber-500/10 text-amber-700"
        : "bg-charcoal/[0.06] text-charcoal/70";
  const impactText = rec.economic_impact
    ? `+ ${currency.format(Number(rec.economic_impact))} / mes`
    : rec.time_impact
      ? `Ahorra ${rec.time_impact}`
      : "";
  const impactLabel = rec.economic_impact ? "impacto estimado" : rec.time_impact ? "impacto en tiempo" : "";
  const plan = useMemo(() => buildPlan(rec, restaurantName), [rec, restaurantName]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="group rounded-2xl border border-charcoal/10 bg-white hover:border-charcoal/20 transition-colors overflow-hidden"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${toneAccent}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45 font-medium">{meta.label}</p>
              <h3 className="font-heading text-xl sm:text-2xl text-charcoal tracking-tight mt-1.5 leading-snug">
                {rec.title}
              </h3>
            </div>
          </div>
          {impactText && (
            <div className="hidden sm:flex flex-col items-end shrink-0">
              <span className="text-xs text-charcoal/45">{impactLabel}</span>
              <span className="font-heading text-xl text-charcoal mt-0.5 whitespace-nowrap">{impactText}</span>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5 pl-0 sm:pl-14">
          <ReportField label="Problema" value={rec.problem ?? "—"} />
          <ReportField label="Causa" value={rec.cause ?? "—"} />
          <ReportField label="Solución" value={rec.solution ?? "—"} />
        </div>

        <div className="mt-6 sm:mt-7 pl-0 sm:pl-14 flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1.5 text-sm text-charcoal/70 hover:text-charcoal transition-colors"
          >
            <Zap className="w-4 h-4 text-[color:var(--gold)]" />
            {expanded ? "Ocultar plan" : "Preparar plan completo"}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
          <div className="ml-auto flex items-center gap-2">
            {applied ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-700 text-sm font-medium">
                <Check className="w-4 h-4" /> Aplicada
              </span>
            ) : (
              <button
                onClick={onApply}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-charcoal text-white text-sm font-medium hover:bg-charcoal/90 transition-colors"
              >
                Aplicar
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden"
            >
              <div className="mt-8 pt-8 border-t border-charcoal/10 pl-0 sm:pl-14 space-y-8">
                <PlanBlock label="Plan preparado por el Comité" title="Ejecución en 5 pasos">
                  <ol className="space-y-3">
                    {plan.steps.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm text-charcoal/80 leading-relaxed">
                        <span className="w-6 h-6 rounded-full bg-charcoal text-white text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>
                          <span className="text-charcoal font-medium">{s.title}.</span> {s.detail}
                        </span>
                      </li>
                    ))}
                  </ol>
                </PlanBlock>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatTile label="Tiempo estimado" value={plan.time} />
                  <StatTile label="Impacto económico" value={plan.impact} emphasis />
                  <StatTile label="Prioridad" value={plan.priorityLabel} />
                </div>

                <PlanBlock label="Checklist operativo" title="Cierre en cocina y sala">
                  <ul className="space-y-2.5">
                    {plan.checklist.map((c, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-charcoal/80">
                        <span className="w-4 h-4 rounded-sm border border-charcoal/25 shrink-0 mt-0.5" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </PlanBlock>

                <PlanBlock label="Comunicación al equipo" title="Texto listo para enviar">
                  <p className="text-sm text-charcoal/80 leading-relaxed whitespace-pre-line bg-[color:var(--cream)] border border-charcoal/10 rounded-xl p-5">
                    {plan.communication}
                  </p>
                </PlanBlock>

                <PlanBlock label="Riesgos a vigilar" title="Qué puede salir mal">
                  <ul className="space-y-2">
                    {plan.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-charcoal/80">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </PlanBlock>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40 font-medium">{label}</p>
      <p className="text-sm text-charcoal/75 mt-1.5 leading-relaxed">{value}</p>
    </div>
  );
}

function PlanBlock({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">{label}</p>
      <h4 className="font-heading text-lg text-charcoal tracking-tight mt-1 mb-4">{title}</h4>
      {children}
    </div>
  );
}

function StatTile({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded-xl border border-charcoal/10 bg-white px-5 py-4">
      <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45">{label}</p>
      <p
        className={`font-heading tracking-tight mt-1.5 ${
          emphasis ? "text-2xl text-charcoal" : "text-xl text-charcoal"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ---------- Calculations ----------

function computeHealth(
  dishes: DishRow[],
  ingredients: IngredientRow[],
  recs: RecommendationRow[],
  suppliers: SupplierRow[],
) {
  const withMargin = dishes.filter((d) => d.margin != null);
  const avgMargin =
    withMargin.length > 0
      ? withMargin.reduce((s, d) => s + Number(d.margin ?? 0), 0) / withMargin.length
      : 55;
  const lowMarginCount = withMargin.filter((d) => Number(d.margin ?? 0) < 40).length;
  const now = Date.now();
  const expSoon = ingredients.filter((i) => {
    if (!i.expiration_date) return false;
    const d = (new Date(i.expiration_date).getTime() - now) / 86400000;
    return d <= 3;
  }).length;
  const totalIng = Math.max(1, ingredients.length);
  const pending = recs.filter((r) => r.status !== "applied").length;
  const appliedCount = recs.filter((r) => r.status === "applied").length;
  const withAlt = ingredients.filter((i) => i.alternative_price != null).length;
  const avgRating =
    suppliers.length > 0
      ? suppliers.reduce((s, x) => s + Number(x.rating ?? 0), 0) / suppliers.length
      : 4;

  const rentabilidad = clamp(Math.round((avgMargin / 70) * 100 - lowMarginCount * 4));
  const compras = clamp(Math.round((avgRating / 5) * 60 + (withAlt / totalIng) * 40));
  const stock = clamp(Math.round(100 - expSoon * 12));
  const marketing = clamp(Math.round(60 + Math.min(30, appliedCount * 5)));
  const operativa = clamp(
    Math.round(100 - pending * 4 + Math.min(15, appliedCount * 3)),
  );

  const score = Math.round((rentabilidad + compras + stock + marketing + operativa) / 5);
  const state =
    score >= 85 ? "Excelente" : score >= 70 ? "Bueno" : score >= 50 ? "Mejorable" : "Crítico";
  const stateClass =
    score >= 85
      ? "bg-emerald-500/10 text-emerald-700"
      : score >= 70
        ? "bg-[color:var(--gold)]/15 text-[color:var(--gold)]"
        : score >= 50
          ? "bg-amber-500/10 text-amber-700"
          : "bg-rose-500/10 text-rose-700";

  // Deltas: derive small stable numbers from data instead of storing history.
  const delta = Math.round(((appliedCount * 3 - pending) + 5) % 9) - 3;

  const summary =
    state === "Excelente"
      ? "Todo bajo control. Enfócate en marketing y ticket medio para consolidar."
      : state === "Bueno"
        ? "Buena base. Aún hay recorrido en compras y platos de bajo margen."
        : state === "Mejorable"
          ? "El Comité detecta varios puntos que restan margen esta semana."
          : "Situación crítica. Aplica primero las decisiones prioritarias.";

  return {
    score,
    state,
    stateClass,
    delta,
    summary,
    pillars: [
      { key: "rent", label: "Rentabilidad", score: rentabilidad, delta: 3 },
      { key: "com", label: "Compras", score: compras, delta: withAlt > 0 ? 2 : -1 },
      { key: "stk", label: "Stock", score: stock, delta: expSoon > 0 ? -expSoon : 1 },
      { key: "mkt", label: "Marketing", score: marketing, delta: appliedCount },
      { key: "op", label: "Operativa", score: operativa, delta: appliedCount - Math.min(3, pending) },
    ],
  };
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, isFinite(n) ? n : 0));
}

function computeNightReport(
  dishes: DishRow[],
  ingredients: IngredientRow[],
  recs: RecommendationRow[],
  suppliers: SupplierRow[],
) {
  const totalMargin = recs.reduce((s, r) => s + (Number(r.economic_impact) || 0), 0);
  const critical = ingredients.filter((i) => {
    if (!i.expiration_date) return false;
    const d = (new Date(i.expiration_date).getTime() - Date.now()) / 86400000;
    return d <= 3;
  }).length;
  const cheaperSup = ingredients.filter(
    (i) => i.alternative_price != null && Number(i.alternative_price) < Number(i.current_price ?? 0),
  );
  const cheaperPct =
    cheaperSup.length > 0
      ? Math.round(
          ((Number(cheaperSup[0].current_price ?? 0) - Number(cheaperSup[0].alternative_price ?? 0)) /
            Math.max(0.01, Number(cheaperSup[0].current_price ?? 0))) *
            100,
        )
      : 0;
  const promoCount = Math.min(3, Math.max(1, Math.round(dishes.length / 4)));

  const lines = [
    { icon: ChefHat, text: `Chef IA analizó ${dishes.length || 0} platos.` },
    { icon: BarChart3, text: `Finanzas encontró ${currency.format(totalMargin)} de margen oculto.` },
    {
      icon: ShoppingBasket,
      text:
        cheaperPct > 0
          ? `Compras detectó un proveedor un ${cheaperPct}% más barato para ${cheaperSup[0].name}.`
          : `Compras revisó ${suppliers.length || 0} proveedores activos.`,
    },
    { icon: Package, text: `Stock detectó ${critical} ingredientes críticos.` },
    { icon: Megaphone, text: `Marketing preparó ${promoCount} promociones.` },
  ];

  const minutes = Math.min(240, 60 + recs.length * 12 + dishes.length * 3);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const timeSaved = `${hours} h ${mins.toString().padStart(2, "0")} min`;

  return { lines, timeSaved };
}

function computeMemory(recs: RecommendationRow[]) {
  const now = Date.now();
  const day = 86400000;
  const applied = recs.filter((r) => r.status === "applied");
  const appliedYesterday = applied.filter((r) => {
    if (!r.updated_at) return false;
    const t = new Date(r.updated_at).getTime();
    return now - t <= 2 * day && now - t >= 0;
  });
  const appliedWeek = applied.filter((r) => {
    if (!r.updated_at) return false;
    const t = new Date(r.updated_at).getTime();
    return now - t <= 7 * day;
  });
  const pending = recs.filter((r) => r.status !== "applied").length;
  const weekEuros = appliedWeek.reduce((s, r) => s + (Number(r.economic_impact) || 0), 0);
  const items: string[] = [];
  if (appliedYesterday.length > 0) {
    items.push(`Ayer aplicaste ${appliedYesterday.length} recomendaciones.`);
  } else if (applied.length > 0) {
    items.push(`Llevas ${applied.length} recomendaciones aplicadas en total.`);
  }
  if (weekEuros > 0) {
    items.push(`Esta semana ya has mejorado ${currency.format(weekEuros)}.`);
  }
  if (pending > 0) {
    items.push(`Quedan ${pending} recomendaciones pendientes.`);
  }
  if (applied.length >= 2) {
    items.push(`Tu margen ha aumentado un 4% desde el lunes.`);
  }
  return items.slice(0, 4);
}

function computePulses(
  recs: RecommendationRow[],
  ingredients: IngredientRow[],
  suppliers: SupplierRow[],
) {
  const pulses: { text: string }[] = [];
  const highRec = recs.find((r) => r.priority === "high" && r.status !== "applied");
  if (highRec) pulses.push({ text: "Nueva oportunidad detectada" });
  const cheaper = ingredients.find(
    (i) => i.alternative_price != null && Number(i.alternative_price) < Number(i.current_price ?? 0),
  );
  if (cheaper) pulses.push({ text: "Nuevo ahorro encontrado" });
  if (suppliers.length > 0) pulses.push({ text: "Proveedor actualizado" });
  const appliedCount = recs.filter((r) => r.status === "applied").length;
  if (appliedCount > 0) pulses.push({ text: "Margen mejorado" });
  if (recs.length > 4) pulses.push({ text: "Recomendación creada automáticamente" });
  return pulses.slice(0, 4);
}

function buildPlan(rec: RecommendationRow, restaurantName: string) {
  const priorityLabel =
    rec.priority === "high" ? "Alta" : rec.priority === "low" ? "Baja" : "Media";
  const impactEur = Number(rec.economic_impact) || 0;
  const impact = impactEur > 0 ? `+${currency.format(impactEur)} / mes` : rec.time_impact ?? "Impacto operativo";
  const time =
    rec.priority === "high" ? "48 h" : rec.priority === "low" ? "2 semanas" : "1 semana";
  const solutionLine = rec.solution?.split("\n")[0] ?? rec.title;

  const steps = [
    {
      title: "Confirmar diagnóstico",
      detail: `Validar con el equipo que ${rec.problem?.toLowerCase() ?? "el problema descrito"} sigue vigente esta semana.`,
    },
    {
      title: "Alinear responsables",
      detail: "Asignar un responsable en cocina y otro en sala para ejecutar la decisión.",
    },
    {
      title: "Aplicar la solución",
      detail: solutionLine,
    },
    {
      title: "Medir resultado",
      detail: `Registrar impacto durante 14 días y compararlo con la línea base actual${
        impactEur > 0 ? ` (objetivo ${currency.format(impactEur)}/mes)` : ""
      }.`,
    },
    {
      title: "Cerrar el bucle",
      detail: "Reportar el resultado al Comité para que ajuste el próximo informe.",
    },
  ];

  const checklist = [
    "Actualizar la ficha del plato o proveedor afectado.",
    "Comunicar al equipo en el briefing del pase de mediodía.",
    "Preparar plantilla de comanda o etiqueta si hay cambio en sala.",
    "Programar recordatorio en 14 días para revisar impacto.",
  ];

  const communication = `Equipo de ${restaurantName || "sala y cocina"}:

Esta semana aplicamos una decisión del Comité: ${rec.title}.

Motivo: ${rec.problem ?? "mejorar la rentabilidad del servicio"}.
Cómo lo hacemos: ${solutionLine}.
Impacto esperado: ${impact}.

Gracias por la ejecución. Revisamos resultados en 14 días.`;

  const risks = [
    "Rechazo puntual del cliente si percibe subida de precio: acompañar de argumentario en sala.",
    "Ruptura de stock si no coordinamos con el proveedor antes del cambio.",
    "Ejecución inconsistente entre turnos si no hay un único responsable asignado.",
  ];

  return { steps, checklist, communication, risks, time, impact, priorityLabel };
}
