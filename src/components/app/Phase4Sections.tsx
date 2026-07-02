import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowUpRight,
  FileDown,
  Presentation,
  X,
  Zap,
  Info,
  ChefHat,
  Package,
  ShoppingBasket,
  BarChart3,
  Megaphone,
  Settings2,
  Check,
  Bookmark,
  CalendarClock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Intelligence } from "@/hooks/useRestaurantIntelligence";
import {
  enrichRecommendations,
  detectRisks,
  computeGoals,
  detectMissingData,
  simulateOutcome,
  type EnrichedRec,
  type Area,
} from "@/lib/recommendationIntel";
import { generateOwnerReport } from "@/lib/pdfReport";

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const AREA_ICON: Record<Area, typeof ChefHat> = {
  Chef: ChefHat,
  Finanzas: BarChart3,
  Compras: ShoppingBasket,
  Stock: Package,
  Marketing: Megaphone,
  Operativa: Settings2,
};

export type RecAction = "applied" | "saved" | "postponed" | "discarded";

// ============================================================
// Top-of-page: "Si hoy solo haces 3 cosas"
// ============================================================

export function TopActionsToday({
  ctx,
  onAction,
}: {
  ctx: Intelligence;
  onAction: (id: string, action: RecAction) => Promise<void> | void;
}) {
  const enriched = useMemo(
    () => enrichRecommendations(ctx.recommendations.filter((r) => r.status === "pending"), ctx),
    [ctx],
  );
  const top3 = useMemo(
    () => [...enriched].sort((a, b) => b.score - a.score).slice(0, 3),
    [enriched],
  );
  if (top3.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-3xl border border-[color:var(--tc-gold)]/20 bg-gradient-to-br from-[color:var(--tc-gold)]/[0.05] via-white/[0.02] to-transparent p-9 sm:p-11 overflow-hidden shadow-[var(--tc-shadow-md)]"
    >
      <div className="absolute -top-24 -right-24 w-[380px] h-[380px] rounded-full bg-[color:var(--tc-gold)]/10 blur-[80px] pointer-events-none" />
      <div className="relative mb-8">
        <p className="text-[10.5px] uppercase tracking-[0.24em] text-[color:var(--tc-gold)] font-medium">
          Prioridad del Comité · Hoy
        </p>
        <h2 className="font-heading text-[30px] sm:text-[34px] text-white tracking-[-0.02em] mt-3 leading-[1.08]">
          Si hoy solo haces tres cosas, haz estas.
        </h2>
        <p className="text-[13.5px] text-white/55 mt-3 max-w-lg leading-relaxed">
          Ordenadas por impacto económico esperado, probabilidad de éxito y confianza en los datos.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3.map((e, i) => (
          <TopActionCard key={e.rec.id} e={e} index={i} onAction={onAction} />
        ))}
      </div>
    </motion.section>
  );
}

function TopActionCard({
  e,
  index,
  onAction,
}: {
  e: EnrichedRec;
  index: number;
  onAction: (id: string, action: RecAction) => Promise<void> | void;
}) {
  const Icon = AREA_ICON[e.area] ?? Sparkles;
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.4 }}
      className="relative rounded-2xl border border-white/[0.07] bg-[#0d0d10]/60 backdrop-blur p-6 hover:border-[color:var(--tc-gold)]/25 transition-all duration-200 flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-white/45">
          <span className="w-6 h-6 rounded-md bg-[color:var(--tc-gold)]/10 border border-[color:var(--tc-gold)]/25 flex items-center justify-center text-[color:var(--tc-gold)]">
            <Icon className="w-3 h-3" strokeWidth={1.75} />
          </span>
          #{index + 1} · {e.area}
        </span>
        <PriorityScore score={e.score} />
      </div>
      <h3 className="font-heading text-[19px] text-white tracking-[-0.014em] leading-[1.22] mt-1 min-h-[3.4em]">
        {e.rec.title}
      </h3>
      <p className="text-[12.5px] text-white/55 mt-2 leading-relaxed line-clamp-2">
        {e.rec.solution ?? e.rec.problem ?? ""}
      </p>
      {e.monthlyImpact > 0 && (
        <div className="mt-5 pt-5 border-t border-white/[0.06] flex items-baseline justify-between">
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-white/45">Impacto</span>
          <span className="font-heading text-[22px] text-[color:var(--tc-gold)] tabular-nums tracking-[-0.018em]">
            +{currency.format(e.monthlyImpact)}/mes
          </span>
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MicroStat label="Éxito" value={`${e.probability}%`} />
        <MicroStat label="Confianza" value={cap(e.confidence)} />
        <MicroStat label="Tiempo" value={`${e.timeHours} h`} />
        <MicroStat label="Dificultad" value={cap(e.difficulty)} />
      </div>
      <div className="mt-5 flex items-center gap-1.5">
        <button
          onClick={() => onAction(e.rec.id, "applied")}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-[9px] bg-gradient-to-b from-[color:var(--tc-gold-light)] via-[color:var(--tc-gold)] to-[color:var(--tc-gold-dark)] text-[color:var(--tc-gold-contrast)] text-[12px] font-semibold hover:brightness-110 transition-all"
        >
          Aplicar <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <IconAction title="Guardar" onClick={() => onAction(e.rec.id, "saved")}>
          <Bookmark className="w-3.5 h-3.5" />
        </IconAction>
        <IconAction title="Posponer" onClick={() => onAction(e.rec.id, "postponed")}>
          <CalendarClock className="w-3.5 h-3.5" />
        </IconAction>
        <IconAction title="Descartar" onClick={() => onAction(e.rec.id, "discarded")}>
          <Trash2 className="w-3.5 h-3.5" />
        </IconAction>
      </div>
    </motion.article>
  );
}

function IconAction({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-9 h-9 rounded-[9px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14] text-white/60 hover:text-white flex items-center justify-center transition-all duration-200"
    >
      {children}
    </button>
  );
}

function MicroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-2.5 py-2">
      <p className="text-[9.5px] uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p className="text-[12px] text-white/85 font-medium tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

function PriorityScore({ score }: { score: number }) {
  const tone =
    score >= 75
      ? "text-[color:var(--tc-gold)] border-[color:var(--tc-gold)]/30 bg-[color:var(--tc-gold)]/10"
      : score >= 50
        ? "text-white/80 border-white/15 bg-white/[0.04]"
        : "text-white/50 border-white/[0.08] bg-white/[0.02]";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full border tabular-nums font-medium ${tone}`}
    >
      <Zap className="w-3 h-3" strokeWidth={2} /> {score}
    </span>
  );
}

export function RecEnrichmentBadges({ e }: { e: EnrichedRec }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <PriorityScore score={e.score} />
      <Chip>{`${e.probability}% éxito`}</Chip>
      <Chip>{`Confianza ${e.confidence}`}</Chip>
      <Chip>{`${e.timeHours} h`}</Chip>
      <Chip>{`Dificultad ${e.difficulty}`}</Chip>
      <Chip>{e.area}</Chip>
      {e.roi > 0 && <Chip gold>{`ROI ${e.roi.toFixed(1)}×`}</Chip>}
    </div>
  );
}

function Chip({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span
      className={`text-[10.5px] px-2 py-0.5 rounded-full border tabular-nums ${
        gold
          ? "text-[color:var(--tc-gold)] bg-[color:var(--tc-gold)]/10 border-[color:var(--tc-gold)]/25"
          : "text-white/60 bg-white/[0.03] border-white/[0.08]"
      }`}
    >
      {children}
    </span>
  );
}

export function RecFourActions({
  onAction,
  applied,
}: {
  onAction: (a: RecAction) => void;
  applied?: boolean;
}) {
  if (applied) {
    return (
      <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[12.5px] font-medium">
        <Check className="w-3.5 h-3.5" strokeWidth={2} /> Aplicada
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onAction("applied")}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] bg-gradient-to-b from-[color:var(--tc-gold-light)] via-[color:var(--tc-gold)] to-[color:var(--tc-gold-dark)] text-[color:var(--tc-gold-contrast)] text-[12.5px] font-semibold hover:brightness-110 transition-all"
      >
        Aplicar <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
      <IconAction title="Guardar" onClick={() => onAction("saved")}>
        <Bookmark className="w-3.5 h-3.5" />
      </IconAction>
      <IconAction title="Posponer" onClick={() => onAction("postponed")}>
        <CalendarClock className="w-3.5 h-3.5" />
      </IconAction>
      <IconAction title="Descartar" onClick={() => onAction("discarded")}>
        <Trash2 className="w-3.5 h-3.5" />
      </IconAction>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================================
// Opportunities panel
// ============================================================

export function OpportunitiesPanel({ ctx }: { ctx: Intelligence }) {
  const opps = useMemo(() => {
    const enriched = enrichRecommendations(
      ctx.recommendations.filter((r) => r.status !== "applied" && r.status !== "discarded"),
      ctx,
    );
    return enriched
      .filter((e) => e.monthlyImpact > 0)
      .sort((a, b) => b.monthlyImpact - a.monthlyImpact);
  }, [ctx]);
  const total = opps.reduce((s, o) => s + o.monthlyImpact, 0);
  if (opps.length === 0) return null;
  return (
    <SectionShell
      eyebrow="Oportunidades detectadas"
      title="Ganancias mensuales al alcance"
      right={
        <span className="font-heading text-[22px] text-[color:var(--tc-gold)] tabular-nums tracking-[-0.018em]">
          +{currency.format(total)}/mes
        </span>
      }
    >
      <ul className="divide-y divide-white/[0.05]">
        {opps.map((e) => {
          const Icon = AREA_ICON[e.area];
          return (
            <li key={e.rec.id} className="flex items-center gap-4 py-4">
              <span className="w-8 h-8 rounded-lg bg-[color:var(--tc-gold)]/[0.08] border border-[color:var(--tc-gold)]/20 flex items-center justify-center text-[color:var(--tc-gold)]">
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] text-white/85 font-medium truncate">{e.rec.title}</p>
                <p className="text-[11.5px] text-white/45 mt-0.5">
                  {e.area} · Éxito {e.probability}% · Confianza {e.confidence}
                </p>
              </div>
              <span className="font-heading text-[18px] text-[color:var(--tc-gold)] tabular-nums whitespace-nowrap">
                +{currency.format(e.monthlyImpact)}
              </span>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

// ============================================================
// Risks panel
// ============================================================

export function RisksPanel({ ctx }: { ctx: Intelligence }) {
  const risks = useMemo(() => detectRisks(ctx.dishes, ctx.ingredients, ctx.suppliers), [ctx]);
  if (risks.length === 0) return null;
  const totalImpact = risks.reduce((s, r) => s + (r.impact ?? 0), 0);
  return (
    <SectionShell
      eyebrow="Riesgos activos"
      title="Puntos que restan margen ahora"
      right={
        <span className="text-[11.5px] text-white/50">
          {risks.length} riesgos
          {totalImpact > 0 ? ` · ${currency.format(totalImpact)} expuestos` : ""}
        </span>
      }
    >
      <ul className="divide-y divide-white/[0.05]">
        {risks.slice(0, 12).map((r) => {
          const Icon = AREA_ICON[r.area];
          const tone =
            r.severity === "alta"
              ? "text-rose-300 bg-rose-400/10 border-rose-400/20"
              : r.severity === "media"
                ? "text-amber-300 bg-amber-400/10 border-amber-400/20"
                : "text-white/60 bg-white/[0.03] border-white/[0.08]";
          return (
            <li key={r.id} className="flex items-center gap-4 py-4">
              <span className={`w-8 h-8 rounded-lg border flex items-center justify-center ${tone}`}>
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] text-white/85 font-medium truncate">{r.title}</p>
                <p className="text-[11.5px] text-white/45 mt-0.5">{r.detail}</p>
              </div>
              <span className={`text-[10.5px] px-2 py-0.5 rounded-full border uppercase tracking-[0.14em] ${tone}`}>
                {r.severity}
              </span>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

// ============================================================
// Goals panel
// ============================================================

export function GoalsPanel({ ctx }: { ctx: Intelligence }) {
  const goals = useMemo(() => computeGoals(ctx), [ctx]);
  return (
    <SectionShell eyebrow="Objetivos" title="Metas del trimestre">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((g) => (
          <div key={g.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] text-white/90 font-medium">{g.title}</p>
                <p className="text-[11.5px] text-white/45 mt-1">{g.detail}</p>
              </div>
              <span className="text-[11.5px] text-[color:var(--tc-gold)] tabular-nums font-semibold shrink-0">
                {g.progress}%
              </span>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(2, g.progress)}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-gradient-to-r from-[color:var(--tc-gold-dark)] to-[color:var(--tc-gold-light)]"
              />
            </div>
            <div className="flex items-center justify-between mt-2.5 text-[11px] text-white/45 tabular-nums">
              <span>{g.current}</span>
              <span>Meta {g.target}</span>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

// ============================================================
// Simulation panel
// ============================================================

export function SimulationPanel({ ctx }: { ctx: Intelligence }) {
  const enriched = useMemo(() => enrichRecommendations(ctx.recommendations, ctx), [ctx]);
  const sim = useMemo(() => simulateOutcome(enriched, ctx), [enriched, ctx]);
  if (sim.recCount === 0) return null;
  return (
    <SectionShell
      eyebrow="Proyección"
      title="Qué ocurrirá si haces caso al Comité"
      subtitle={`Simulación basada en ${sim.recCount} recomendaciones activas, ponderadas por su probabilidad de éxito.`}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BigStat label="Beneficio actual" value={currency.format(sim.currentMonthly)} sub="mensual" />
        <BigStat
          label="Estimado tras aplicar"
          value={currency.format(sim.estimatedMonthly)}
          sub={`+${currency.format(sim.gainMonthly)} / mes`}
          gold
        />
        <BigStat label="Impacto anual" value={`+${currency.format(sim.annualImpact)}`} sub="año completo" gold />
        <BigStat label="Recuperación" value={`${sim.paybackDays} d`} sub={`${sim.totalHours} h de trabajo total`} />
      </div>
    </SectionShell>
  );
}

function BigStat({ label, value, sub, gold }: { label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <p className="text-[10.5px] uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className={`font-heading text-[24px] tabular-nums tracking-[-0.02em] mt-2 ${gold ? "text-[color:var(--tc-gold)]" : "text-white"}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-white/45 mt-1">{sub}</p>}
    </div>
  );
}

// ============================================================
// Missing data
// ============================================================

export function MissingDataPanel({ ctx }: { ctx: Intelligence }) {
  const items = useMemo(() => detectMissingData(ctx), [ctx]);
  if (items.length === 0) return null;
  return (
    <SectionShell
      eyebrow="Datos que mejorarían tus decisiones"
      title="El Comité necesita más contexto"
      subtitle="Cuanto más completa sea tu operación, mayor será la confianza de cada recomendación."
    >
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((m, i) => (
          <li key={i} className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.05] bg-white/[0.015]">
            <span className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/55 shrink-0">
              <Info className="w-3.5 h-3.5" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/40 font-medium">{m.area}</p>
              <p className="text-[13px] text-white/75 mt-1 leading-relaxed">{m.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

// ============================================================
// Toolbar & Presentation Mode
// ============================================================

export function ExecutiveToolbar({ ctx, onPresent }: { ctx: Intelligence; onPresent: () => void }) {
  const [generating, setGenerating] = useState(false);
  const generate = useCallback(async () => {
    try {
      setGenerating(true);
      const enriched = enrichRecommendations(ctx.recommendations, ctx);
      const risks = detectRisks(ctx.dishes, ctx.ingredients, ctx.suppliers);
      const goals = computeGoals(ctx);
      const sim = simulateOutcome(enriched, ctx);
      generateOwnerReport(ctx, enriched, risks, goals, sim);
      toast.success("Informe PDF listo", {
        description: "El documento se ha descargado en tu equipo.",
      });
    } catch (err) {
      toast.error("No se pudo generar el informe");
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }, [ctx]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={generate}
        disabled={generating}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14] text-[12.5px] text-white/80 hover:text-white transition-all disabled:opacity-50"
      >
        <FileDown className="w-3.5 h-3.5 text-[color:var(--tc-gold)]" strokeWidth={1.75} />
        {generating ? "Generando…" : "Informe para propietario"}
      </button>
      <button
        onClick={onPresent}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14] text-[12.5px] text-white/80 hover:text-white transition-all"
      >
        <Presentation className="w-3.5 h-3.5 text-[color:var(--tc-gold)]" strokeWidth={1.75} />
        Modo presentación
      </button>
    </div>
  );
}

export function PresentationOverlay({ ctx, onClose }: { ctx: Intelligence; onClose: () => void }) {
  const enriched = useMemo(
    () => enrichRecommendations(ctx.recommendations.filter((r) => r.status !== "applied"), ctx),
    [ctx],
  );
  const top3 = [...enriched].sort((a, b) => b.score - a.score).slice(0, 3);
  const sim = useMemo(() => simulateOutcome(enriched, ctx), [enriched, ctx]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] bg-[#08080A] overflow-y-auto"
    >
      <div className="max-w-5xl mx-auto px-10 py-14">
        <div className="flex items-center justify-between mb-16">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[color:var(--tc-gold)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--tc-gold)]" />
            {ctx.restaurantName || "Restaurante"} · Informe ejecutivo
          </span>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.04] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h1 className="font-heading text-[64px] text-white tracking-[-0.028em] leading-[1] mb-6">
          Estado de tu restaurante
        </h1>
        <p className="text-white/60 text-[18px] max-w-2xl leading-relaxed">
          {new Intl.DateTimeFormat("es-ES", { dateStyle: "full" }).format(new Date())}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
          <PresentStat label="Salud" value={`${ctx.kpis.healthScore}`} sub={ctx.kpis.healthState} />
          <PresentStat label="Margen medio" value={`${ctx.kpis.avgMargin.toFixed(1)}%`} />
          <PresentStat label="Ahorro mensual" value={currency.format(ctx.kpis.savedDetected)} gold />
          <PresentStat label="Impacto anual" value={`+${currency.format(sim.annualImpact)}`} gold />
        </div>
        <div className="mt-20">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--tc-gold)] mb-4">
            Prioridades
          </p>
          <h2 className="font-heading text-[36px] text-white tracking-[-0.02em] mb-10">
            Si hoy solo haces tres cosas
          </h2>
          <div className="space-y-4">
            {top3.map((e, i) => (
              <div key={e.rec.id} className="flex items-center gap-6 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <span className="font-heading text-[42px] text-[color:var(--tc-gold)] tabular-nums w-12">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10.5px] uppercase tracking-[0.2em] text-white/45">{e.area}</p>
                  <h3 className="font-heading text-[24px] text-white tracking-[-0.014em] mt-1">
                    {e.rec.title}
                  </h3>
                </div>
                <span className="font-heading text-[28px] text-[color:var(--tc-gold)] tabular-nums whitespace-nowrap">
                  +{currency.format(e.monthlyImpact)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PresentStat({ label, value, sub, gold }: { label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className={`font-heading tabular-nums tracking-[-0.02em] mt-3 text-[38px] ${gold ? "text-[color:var(--tc-gold)]" : "text-white"}`}>
        {value}
      </p>
      {sub && <p className="text-[12px] text-white/50 mt-1">{sub}</p>}
    </div>
  );
}

// ============================================================
// Timeline range tabs
// ============================================================

export type TimelineRange = "hoy" | "ayer" | "semana" | "mes";

export function TimelineRangeTabs({ value, onChange }: { value: TimelineRange; onChange: (v: TimelineRange) => void }) {
  const options: [TimelineRange, string][] = [
    ["hoy", "Hoy"],
    ["ayer", "Ayer"],
    ["semana", "7 días"],
    ["mes", "30 días"],
  ];
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full border border-white/[0.08] bg-white/[0.02]">
      {options.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={`h-7 px-3 text-[11.5px] rounded-full transition-all duration-200 ${
            value === k ? "bg-white/[0.08] text-white" : "text-white/50 hover:text-white/80"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Section shell
// ============================================================

function SectionShell({
  eyebrow,
  title,
  subtitle,
  right,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-white/[0.05] bg-white/[0.015] p-8 sm:p-10"
    >
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--tc-gold)] font-medium mb-2">
            {eyebrow}
          </p>
          <h2 className="font-heading text-[24px] sm:text-[26px] text-white tracking-[-0.016em]">{title}</h2>
          {subtitle && (
            <p className="text-[13px] text-white/55 mt-2 max-w-xl leading-relaxed">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
      {children}
    </motion.section>
  );
}

// ============================================================
// Actions helpers
// ============================================================

export async function updateRecStatus(id: string, status: RecAction) {
  const { error } = await supabase.from("recommendations").update({ status }).eq("id", id);
  if (error) {
    toast.error("No se pudo actualizar la recomendación");
    return;
  }
  const msg =
    status === "applied" ? "Aplicada" : status === "saved" ? "Guardada" : status === "postponed" ? "Pospuesta" : "Descartada";
  toast.success(msg, {
    description: status === "applied" ? "El Comité lo tendrá en cuenta en el próximo informe." : undefined,
  });
}

export function usePresentationMode() {
  const [open, setOpen] = useState(false);
  return {
    open,
    show: () => setOpen(true),
    hide: () => setOpen(false),
    render: (ctx: Intelligence) => (
      <AnimatePresence>
        {open && <PresentationOverlay ctx={ctx} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    ),
  };
}