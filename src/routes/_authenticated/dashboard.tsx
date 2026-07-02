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
  Check,
  ArrowUpRight,
  Moon,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  ChevronDown,
  Layers,
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
import { HealthRing } from "@/components/app/HealthRing";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Centro de mando — TuComité" }] }),
  component: DashboardPage,
});

type RecommendationRow = RecT;

const PRIORITY_META: Record<
  string,
  { icon: typeof PiggyBank; label: string; dot: string; ring: string }
> = {
  high: {
    icon: AlertTriangle,
    label: "Prioridad alta",
    dot: "bg-rose-400",
    ring: "text-rose-300 bg-rose-400/10 border-rose-400/20",
  },
  medium: {
    icon: PiggyBank,
    label: "Oportunidad",
    dot: "bg-[color:var(--tc-gold)]",
    ring: "text-[color:var(--tc-gold)] bg-[color:var(--tc-gold)]/10 border-[color:var(--tc-gold)]/25",
  },
  low: {
    icon: Lightbulb,
    label: "Sugerencia",
    dot: "bg-white/40",
    ring: "text-white/70 bg-white/[0.04] border-white/10",
  },
};

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function DashboardPage() {
  const ctx = useRestaurantIntelligence();
  const { loading, restaurantName, userName, recommendations, dishes, ingredients, suppliers } = ctx;
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
      new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(
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
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Centro de mando
          <span className="text-white/25">·</span>
          <span className="capitalize">{today}</span>
        </span>
      }
    >
      <div className="px-6 sm:px-12 lg:px-16 py-14 sm:py-20 max-w-6xl mx-auto">
        {/* Greeting + Mode */}
        <div className="flex items-start justify-between gap-6 mb-16 flex-wrap">
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--tc-gold)] font-medium">
              {restaurantName || "Tu restaurante"} · Informe ejecutivo
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[60px] text-white mt-5 tracking-[-0.022em] leading-[1.02]">
              Buenos días{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="text-white/60 text-[15.5px] mt-5 max-w-xl leading-relaxed">
              El Comité ha terminado el análisis nocturno. Este es el estado de tu operación ahora mismo.
            </p>
          </motion.section>
          <div className="[&_button]:!text-white/60 [&_button]:hover:!text-white [&_.absolute]:!bg-white/10">
            <DirectorModeToggle mode={mode} onChange={changeMode} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === "director" ? (
            <motion.div
              key="director"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="rounded-3xl border border-white/[0.05] bg-[color:var(--tc-surface-2)] p-1"
            >
              <div className="rounded-[22px] bg-[color:var(--cream)] p-8 sm:p-10">
                <DirectorSummary ctx={ctx} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="operativo"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="space-y-16"
            >
              {/* Live pulses */}
              {pulses.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap gap-2"
                >
                  {pulses.map((p, i) => (
                    <motion.span
                      key={p.text + i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + i * 0.06 }}
                      className="inline-flex items-center gap-2 text-[11.5px] px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.07] text-white/70"
                    >
                      <span className="relative flex w-1.5 h-1.5">
                        <span className="absolute inset-0 rounded-full bg-[color:var(--tc-gold)] animate-ping opacity-60" />
                        <span className="relative rounded-full w-1.5 h-1.5 bg-[color:var(--tc-gold)]" />
                      </span>
                      {p.text}
                    </motion.span>
                  ))}
                </motion.div>
              )}

              {/* Hero: Health + Night report */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-6">
                {/* Health card */}
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="relative rounded-3xl border border-white/[0.05] bg-gradient-to-b from-white/[0.035] to-white/[0.008] backdrop-blur-xl p-9 sm:p-11 overflow-hidden group shadow-[var(--tc-shadow-md)]"
                >
                  <div className="absolute -top-40 -left-28 w-[420px] h-[420px] rounded-full bg-[color:var(--tc-gold)]/[0.07] blur-[80px] pointer-events-none" />
                  <div className="relative flex items-start justify-between mb-8">
                    <div>
                      <p className="text-[10.5px] uppercase tracking-[0.24em] text-[color:var(--tc-gold)] font-medium">
                        Salud del restaurante
                      </p>
                      <p className="text-[13.5px] text-white/60 mt-3 max-w-sm leading-relaxed">
                        {health.summary}
                      </p>
                    </div>
                    <TrendChip delta={health.delta} label="vs 7d" />
                  </div>
                  <div className="relative flex items-center gap-10 flex-wrap">
                    <HealthRing score={health.score} state={health.state} />
                    <div className="flex-1 min-w-[200px] space-y-4">
                      {health.pillars.map((p) => (
                        <PillarRow key={p.key} label={p.label} score={p.score} delta={p.delta} />
                      ))}
                    </div>
                  </div>
                </motion.section>

                {/* Night report */}
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="relative rounded-3xl border border-[color:var(--tc-gold)]/15 bg-[#0d0d10] p-9 sm:p-10 overflow-hidden shadow-[var(--tc-shadow-md)]"
                >
                  <div className="absolute inset-0 pointer-events-none opacity-70">
                    <svg
                      className="absolute -top-8 -right-8 w-64 h-64 text-[color:var(--tc-gold)]/25"
                      viewBox="0 0 200 200"
                      fill="none"
                    >
                      <defs>
                        <radialGradient id="ngrad" cx="50%" cy="50%">
                          <stop offset="0%" stopColor="currentColor" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <circle cx="100" cy="100" r="90" fill="url(#ngrad)" />
                      <g stroke="currentColor" strokeWidth="0.5" opacity="0.4">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <circle key={i} cx="100" cy="100" r={20 + i * 10} fill="none" />
                        ))}
                      </g>
                    </svg>
                  </div>
                  <div className="relative">
                    <p className="text-[10.5px] uppercase tracking-[0.24em] text-[color:var(--tc-gold)] flex items-center gap-2 font-medium">
                      <Moon className="w-3.5 h-3.5" strokeWidth={1.75} /> Mientras dormías
                    </p>
                    <h2 className="font-heading text-[28px] sm:text-[30px] tracking-[-0.018em] mt-4 leading-[1.1] text-white max-w-sm">
                      El Comité trabajó durante la noche por ti.
                    </h2>
                    <p className="text-[13px] text-white/55 mt-3 leading-relaxed max-w-sm">
                      5 expertos analizaron tu operación mientras el restaurante descansaba.
                    </p>
                    <ul className="mt-7 space-y-3">
                      {night.lines.map((line, i) => {
                        const Icon = line.icon;
                        return (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 + i * 0.06, duration: 0.2 }}
                            className="flex items-start gap-3 text-[13.5px] text-white/80"
                          >
                            <span className="w-7 h-7 rounded-lg bg-[color:var(--tc-gold)]/[0.08] border border-[color:var(--tc-gold)]/15 flex items-center justify-center shrink-0 text-[color:var(--tc-gold)]">
                              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </span>
                            <span className="leading-relaxed pt-0.5">{line.text}</span>
                          </motion.li>
                        );
                      })}
                    </ul>
                    <div className="mt-8 pt-5 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.16em] text-white/50">
                        <Clock className="w-3.5 h-3.5 text-[color:var(--tc-gold)]" strokeWidth={1.75} />
                        Tiempo que te ahorramos
                      </span>
                      <span className="font-heading text-[26px] text-white tracking-[-0.02em] tabular-nums leading-none">
                        {night.timeSaved}
                      </span>
                    </div>
                  </div>
                </motion.section>
              </div>

              {/* Memoria */}
              {memory.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="flex items-baseline justify-between mb-6">
                    <h2 className="font-heading text-[22px] text-white tracking-[-0.014em]">
                      Memoria del Comité
                    </h2>
                    <span className="text-[10.5px] uppercase tracking-[0.18em] text-white/35">
                      últimos 7 días
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {memory.map((m, i) => (
                      <div
                        key={i}
                        className="rounded-xl bg-white/[0.02] px-5 py-4 flex items-start gap-3 hover:bg-white/[0.035] transition-all duration-200"
                      >
                        <span className="w-6 h-6 rounded-full bg-[color:var(--tc-gold)]/[0.10] text-[color:var(--tc-gold)] flex items-center justify-center shrink-0 mt-px">
                          <Sparkles className="w-3 h-3" strokeWidth={1.75} />
                        </span>
                        <p className="text-[13.5px] text-white/80 leading-relaxed">{m}</p>
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Recommendations */}
              <section>
                <div className="flex items-baseline justify-between mb-8">
                  <div>
                    <p className="text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--tc-gold)] font-medium mb-2">
                      Informes del Comité
                    </p>
                    <h2 className="font-heading text-[28px] text-white tracking-[-0.018em]">
                      Decisiones sugeridas
                    </h2>
                    <p className="text-[13.5px] text-white/50 mt-2 max-w-md leading-relaxed">
                      Cada informe está preparado por un experto del Comité y priorizado por impacto.
                    </p>
                  </div>
                  <span className="text-[10.5px] uppercase tracking-[0.18em] text-white/35">
                    {pendingRecs.length} pendientes
                  </span>
                </div>
                {loading ? (
                  <div className="space-y-4">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-32 rounded-2xl bg-white/[0.02] animate-pulse"
                      />
                    ))}
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] p-14 text-center text-white/55">
                    El Comité aún no ha generado recomendaciones.
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
                        onToggleExpand={() =>
                          setExpanded((cur) => (cur === rec.id ? null : rec.id))
                        }
                        restaurantName={restaurantName}
                        ctx={ctx}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Timeline */}
              <section>
                <div className="flex items-baseline justify-between mb-6">
                  <h2 className="font-heading text-[22px] text-white tracking-[-0.014em]">
                    Cronología del Comité
                  </h2>
                  <span className="text-[10.5px] uppercase tracking-[0.18em] text-white/35 inline-flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    en vivo
                  </span>
                </div>
                <div className="rounded-2xl bg-white/[0.02] p-8 [&_.text-charcoal]:!text-white [&_.text-charcoal\/60]:!text-white/60 [&_.text-charcoal\/50]:!text-white/45 [&_.bg-white]:!bg-white/[0.06] [&_.border-charcoal\/15]:!border-white/[0.12] [&_.border-charcoal\/10]:!border-white/[0.08] [&_.bg-charcoal\/10]:!bg-white/[0.06]">
                  <CommitteeTimeline ctx={ctx} />
                </div>
              </section>

              <div className="pt-10 mt-6 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[color:var(--tc-gold)]/10 border border-[color:var(--tc-gold)]/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[color:var(--tc-gold)]" />
                  </div>
                  <div>
                    <p className="text-[13px] text-white/85 font-medium">Firmado por el Comité</p>
                    <p className="text-[11.5px] text-white/40">Próximo informe mañana a las 07:00</p>
                  </div>
                </div>
                <p className="text-[11.5px] text-white/35 max-w-sm sm:text-right">
                  Generado esta madrugada a partir de tu carta, tus proveedores y tu inventario más
                  reciente.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

// ---------- Pillars ----------

function PillarRow({
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
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11.5px] text-white/60 uppercase tracking-[0.14em]">{label}</span>
        <span className="inline-flex items-baseline gap-1 tabular-nums">
          <span className="text-[13px] text-white font-medium">{score}</span>
          <TrendChip delta={delta} label="" small />
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(4, Math.min(100, score))}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="h-full bg-gradient-to-r from-[color:var(--tc-gold-dark)] to-[color:var(--tc-gold-light)]"
        />
      </div>
    </div>
  );
}

function TrendChip({ delta, label, small }: { delta: number; label: string; small?: boolean }) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const cls =
    delta > 0
      ? "text-emerald-400"
      : delta < 0
        ? "text-amber-400"
        : "text-white/40";
  const sign = delta > 0 ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-1 ${small ? "text-[10.5px]" : "text-[11.5px]"} ${cls}`}>
      <Icon className={small ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {sign}
      {delta}
      {label ? <span className="text-white/40 ml-1">{label}</span> : null}
    </span>
  );
}

// ---------- Recommendation card ----------

function RecommendationCard({
  rec,
  index,
  applied,
  onApply,
  expanded,
  onToggleExpand,
  restaurantName,
  ctx,
}: {
  rec: RecommendationRow;
  index: number;
  applied: boolean;
  onApply: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  restaurantName: string;
  ctx: import("@/hooks/useRestaurantIntelligence").Intelligence;
}) {
  const meta = PRIORITY_META[rec.priority] ?? PRIORITY_META.medium;
  const Icon = meta.icon;
  const impactEur = Number(rec.economic_impact) || 0;
  const timeLabel =
    rec.priority === "high" ? "48 h" : rec.priority === "low" ? "2 semanas" : "1 semana";
  const plan = useMemo(() => buildPlan(rec, restaurantName), [rec, restaurantName]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-200 overflow-hidden"
    >
      <div className="p-5 sm:p-6">
        {/* Header row */}
        <div className="flex items-start gap-4">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${meta.ring}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-white/45">
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
              <span className="text-white/20">·</span>
              <span className="inline-flex items-center gap-1 text-[11.5px] text-white/50">
                <Clock className="w-3 h-3" /> {timeLabel}
              </span>
            </div>
            <h3 className="font-heading text-xl sm:text-[22px] text-white tracking-tight mt-1.5 leading-snug">
              {rec.title}
            </h3>
          </div>
          {impactEur > 0 && (
            <div className="hidden sm:flex flex-col items-end shrink-0 pl-3">
              <span className="text-[10px] uppercase tracking-[0.15em] text-white/40">
                Impacto / mes
              </span>
              <span className="font-heading text-2xl text-[color:var(--tc-gold)] tracking-tight tabular-nums mt-0.5 whitespace-nowrap">
                <AnimatedNumber value={impactEur} format={(n) => `+${currency.format(Math.round(n))}`} />
              </span>
            </div>
          )}
        </div>

        {/* Action row */}
        <div className="mt-5 flex items-center gap-2 flex-wrap">
          <button
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-[12.5px] text-white/75 hover:text-white transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-[color:var(--tc-gold)]" />
            {expanded ? "Ocultar plan" : "Preparar plan"}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          <div className="ml-auto flex items-center gap-2">
            {applied ? (
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[12.5px] font-medium">
                <Check className="w-3.5 h-3.5" /> Aplicada
              </span>
            ) : (
              <button
                onClick={onApply}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[color:var(--tc-gold)] text-black text-[12.5px] font-semibold hover:brightness-110 transition-all shadow-[0_0_20px_-6px_rgba(212,175,110,0.5)]"
              >
                Aplicar
                <ArrowUpRight className="w-3.5 h-3.5" />
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
              <div className="mt-6 pt-6 border-t border-white/[0.06] space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ReportField label="Problema" value={rec.problem ?? "—"} />
                  <ReportField label="Causa" value={rec.cause ?? "—"} />
                  <ReportField label="Solución" value={rec.solution ?? "—"} />
                </div>

                <PlanBlock label="Plan preparado por el Comité" title="Ejecución en 5 pasos">
                  <ol className="space-y-2.5">
                    {plan.steps.map((s, i) => (
                      <li key={i} className="flex gap-3 text-[13px] text-white/75 leading-relaxed">
                        <span className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/10 text-white/85 text-[11px] flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                          {i + 1}
                        </span>
                        <span>
                          <span className="text-white font-medium">{s.title}.</span> {s.detail}
                        </span>
                      </li>
                    ))}
                  </ol>
                </PlanBlock>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatTile label="Tiempo estimado" value={plan.time} />
                  <StatTile label="Impacto económico" value={plan.impact} emphasis />
                  <StatTile label="Prioridad" value={plan.priorityLabel} />
                </div>

                <PlanBlock label="Checklist operativo" title="Cierre en cocina y sala">
                  <ul className="space-y-2">
                    {plan.checklist.map((c, i) => (
                      <li key={i} className="flex items-start gap-3 text-[13px] text-white/75">
                        <span className="w-4 h-4 rounded-[4px] border border-white/25 shrink-0 mt-0.5" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </PlanBlock>

                <PlanBlock label="Comunicación al equipo" title="Texto listo para enviar">
                  <p className="text-[13px] text-white/75 leading-relaxed whitespace-pre-line bg-black/40 border border-white/[0.06] rounded-xl p-4">
                    {plan.communication}
                  </p>
                </PlanBlock>

                <PlanBlock label="Riesgos a vigilar" title="Qué puede salir mal">
                  <ul className="space-y-2">
                    {plan.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 text-[13px] text-white/75">
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </PlanBlock>

                <div className="[&_.text-charcoal]:!text-white [&_.text-charcoal\/80]:!text-white/80 [&_.text-charcoal\/60]:!text-white/60 [&_.text-charcoal\/55]:!text-white/55 [&_.text-charcoal\/50]:!text-white/50 [&_.bg-white]:!bg-white/[0.03] [&_.border-charcoal\/10]:!border-white/[0.08]">
                  <RecommendationRationale rec={rec} ctx={ctx} />
                </div>
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
      <p className="text-[10.5px] uppercase tracking-[0.16em] text-white/40 font-medium flex items-center gap-1.5">
        <Layers className="w-3 h-3" /> {label}
      </p>
      <p className="text-[13px] text-white/75 mt-1.5 leading-relaxed">{value}</p>
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
      <p className="text-[9.5px] uppercase tracking-[0.2em] text-[color:var(--tc-gold)] font-medium">
        {label}
      </p>
      <h4 className="font-heading text-base text-white tracking-tight mt-1 mb-3">{title}</h4>
      {children}
    </div>
  );
}

function StatTile({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.15em] text-white/40">{label}</p>
      <p
        className={`font-heading tracking-tight mt-1 tabular-nums ${
          emphasis ? "text-xl text-[color:var(--tc-gold)]" : "text-lg text-white"
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
  const operativa = clamp(Math.round(100 - pending * 4 + Math.min(15, appliedCount * 3)));

  const score = Math.round((rentabilidad + compras + stock + marketing + operativa) / 5);
  const state =
    score >= 85 ? "Excelente" : score >= 70 ? "Bueno" : score >= 50 ? "Mejorable" : "Crítico";

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
  const impact =
    impactEur > 0 ? `+${currency.format(impactEur)} / mes` : rec.time_impact ?? "Impacto operativo";
  const time = rec.priority === "high" ? "48 h" : rec.priority === "low" ? "2 semanas" : "1 semana";
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
    { title: "Aplicar la solución", detail: solutionLine },
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