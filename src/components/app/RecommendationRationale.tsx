import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { AlertTriangle, ChevronDown, HelpCircle, Sparkles, TrendingDown, Clock } from "lucide-react";
import type { Recommendation, Intelligence } from "@/hooks/useRestaurantIntelligence";
import { buildRationale } from "@/lib/rationale";

export function RecommendationRationale({
  rec,
  ctx,
}: {
  rec: Recommendation;
  ctx: Intelligence;
}) {
  const [open, setOpen] = useState(false);
  const r = buildRationale(rec, ctx);
  const riskTone =
    r.risk.level === "Alto"
      ? "text-amber-700 bg-amber-500/10 border-amber-500/20"
      : r.risk.level === "Medio"
        ? "text-[color:var(--gold)] bg-[color:var(--gold)]/10 border-[color:var(--gold)]/25"
        : "text-emerald-700 bg-emerald-500/10 border-emerald-500/20";

  return (
    <div className="mt-6 border-t border-charcoal/10 pt-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-charcoal/55 hover:text-charcoal transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/40 rounded"
      >
        <Sparkles className="w-3.5 h-3.5 text-[color:var(--gold)]" />
        {open ? "Ocultar razonamiento" : "Ver razonamiento del Comité"}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card icon={HelpCircle} label="¿Por qué?" body={r.why} />
              <Card icon={Sparkles} label="¿Cómo se calculó?" body={r.how} />
              <Card icon={TrendingDown} label="Si no haces nada" body={r.ifNothing} />
              <Card icon={Clock} label="Cuándo recuperas la inversión" body={r.roi} />
              <div className={`rounded-xl border p-5 md:col-span-2 ${riskTone}`}>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Riesgo: {r.risk.level}
                </div>
                <p className="mt-2 text-sm leading-relaxed">{r.risk.note}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Card({
  icon: Icon,
  label,
  body,
}: {
  icon: typeof HelpCircle;
  label: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-charcoal/10 bg-white p-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-charcoal/50">
        <Icon className="w-3.5 h-3.5 text-[color:var(--gold)]" />
        {label}
      </div>
      <p className="mt-2 text-sm text-charcoal/80 leading-relaxed">{body}</p>
    </div>
  );
}