import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Informe del Comité — TuComité" }] }),
  component: DashboardPage,
});

type RecommendationRow = {
  id: string;
  title: string;
  problem: string | null;
  cause: string | null;
  solution: string | null;
  economic_impact: number | null;
  time_impact: string | null;
  priority: string;
  status: string;
};

type ActivityRow = {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  created_at: string;
};

const PRIORITY_META: Record<string, { icon: typeof PiggyBank; tone: "gold" | "warn" | "neutral"; label: string }> = {
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
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [dishCount, setDishCount] = useState<number>(0);
  const [expiringSoon, setExpiringSoon] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, restaurant_id")
        .eq("id", userData.user.id)
        .maybeSingle();
      setUserName(profile?.full_name || userData.user.email || "");
      const rid = profile?.restaurant_id ?? null;
      setRestaurantId(rid);
      if (!rid) {
        setLoading(false);
        return;
      }
      const soonISO = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10);
      const [
        { data: restaurant },
        { data: recs },
        { data: acts },
        { count: dc },
        { count: expCount },
      ] = await Promise.all([
        supabase.from("restaurants").select("name").eq("id", rid).maybeSingle(),
        supabase
          .from("recommendations")
          .select("id,title,problem,cause,solution,economic_impact,time_impact,priority,status")
          .eq("restaurant_id", rid)
          .order("economic_impact", { ascending: false, nullsFirst: false }),
        supabase
          .from("committee_activity")
          .select("id,title,description,type,created_at")
          .eq("restaurant_id", rid)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.from("dishes").select("id", { count: "exact", head: true }).eq("restaurant_id", rid),
        supabase
          .from("ingredients")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", rid)
          .lte("expiration_date", soonISO),
      ]);
      setRestaurantName(restaurant?.name || "");
      setRecommendations((recs ?? []) as RecommendationRow[]);
      setActivity((acts ?? []) as ActivityRow[]);
      setDishCount(dc ?? 0);
      setExpiringSoon(expCount ?? 0);
      setApplied(
        new Set((recs ?? []).filter((r) => r.status === "applied").map((r) => r.id as string)),
      );
      setLoading(false);
    })();
  }, []);

  const firstName = useMemo(() => (userName ? userName.split(" ")[0] : ""), [userName]);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const totalSavings = useMemo(
    () =>
      currency.format(
        recommendations.reduce((sum, r) => sum + (Number(r.economic_impact) || 0), 0),
      ),
    [recommendations],
  );

  async function apply(id: string) {
    setApplied((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const { error } = await supabase
      .from("recommendations")
      .update({ status: "applied" })
      .eq("id", id);
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
          Informe del {today}
        </span>
      }
    >
        <div className="px-6 sm:px-10 lg:px-16 py-12 sm:py-16 max-w-5xl mx-auto">
          {/* Greeting */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">
              {restaurantName || "Tu restaurante"} · Informe ejecutivo
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-charcoal mt-4 tracking-tight leading-[1.05]">
              Buenos días{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="text-charcoal/60 text-lg mt-4 max-w-2xl leading-relaxed">
              El Comité ha terminado el análisis de tu restaurante. Hemos revisado{" "}
              <span className="text-charcoal font-medium">{dishCount} platos</span>, tus
              proveedores activos y el inventario de esta semana.
            </p>
          </motion.section>

          {/* Summary strip */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 rounded-2xl border border-charcoal/10 bg-white overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-charcoal/10">
              <SummaryStat
                label="Oportunidad total detectada"
                value={totalSavings}
                sub="este mes"
                emphasis
              />
              <SummaryStat
                label="Recomendaciones nuevas"
                value={String(recommendations.length)}
                sub="para revisar hoy"
              />
              <SummaryStat
                label="Ingredientes que caducan pronto"
                value={String(expiringSoon)}
                sub="próximos 3 días"
              />
            </div>
          </motion.section>

          {/* Report */}
          <section className="mt-16">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="font-heading text-2xl text-charcoal tracking-tight">
                Decisiones sugeridas
              </h2>
              <span className="text-xs uppercase tracking-[0.15em] text-charcoal/40">
                {recommendations.length} puntos
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-40 rounded-2xl border border-charcoal/10 bg-white/60 animate-pulse"
                  />
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-charcoal/15 bg-white/60 p-10 text-center">
                <p className="text-charcoal/60">
                  El Comité aún no ha generado recomendaciones para tu restaurante.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recommendations.map((rec, i) => (
                  <RecommendationCard
                    key={rec.id}
                    rec={rec}
                    index={i}
                    applied={applied.has(rec.id)}
                    onApply={() => apply(rec.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Committee activity */}
          {activity.length > 0 && (
            <section className="mt-16">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-heading text-2xl text-charcoal tracking-tight">
                  Actividad del Comité
                </h2>
                <span className="text-xs uppercase tracking-[0.15em] text-charcoal/40">
                  esta madrugada
                </span>
              </div>
              <ol className="rounded-2xl border border-charcoal/10 bg-white divide-y divide-charcoal/10 overflow-hidden">
                {activity.map((a) => {
                  const Icon = (a.type && ACTIVITY_ICON[a.type]) || ClipboardList;
                  return (
                    <li key={a.id} className="flex items-start gap-4 px-5 sm:px-6 py-4">
                      <div className="w-9 h-9 rounded-lg bg-charcoal/[0.06] text-charcoal/70 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-charcoal font-medium">{a.title}</p>
                        {a.description && (
                          <p className="text-sm text-charcoal/60 mt-0.5">{a.description}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

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
                <p className="text-xs text-charcoal/50">
                  Próximo informe mañana a las 07:00
                </p>
              </div>
            </div>
            <p className="text-xs text-charcoal/40 max-w-sm sm:text-right">
              Este informe ha sido generado esta madrugada a partir de tu carta, tus proveedores y
              tu inventario más reciente.
            </p>
          </motion.section>
        </div>
    </AppShell>
  );
}

function SummaryStat({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: string;
  sub: string;
  emphasis?: boolean;
}) {
  return (
    <div className="px-6 py-6 sm:py-7">
      <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40">{label}</p>
      <p
        className={`font-heading tracking-tight mt-2 ${
          emphasis ? "text-3xl sm:text-4xl text-charcoal" : "text-2xl sm:text-3xl text-charcoal"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-charcoal/50 mt-1.5">{sub}</p>
    </div>
  );
}

function RecommendationCard({
  rec,
  index,
  applied,
  onApply,
}: {
  rec: RecommendationRow;
  index: number;
  applied: boolean;
  onApply: () => void;
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
              <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45 font-medium">
                {meta.label}
              </p>
              <h3 className="font-heading text-xl sm:text-2xl text-charcoal tracking-tight mt-1.5 leading-snug">
                {rec.title}
              </h3>
            </div>
          </div>
          {impactText && (
            <div className="hidden sm:flex flex-col items-end shrink-0">
              <span className="text-xs text-charcoal/45">{impactLabel}</span>
              <span className="font-heading text-xl text-charcoal mt-0.5 whitespace-nowrap">
                {impactText}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5 pl-0 sm:pl-14">
          <ReportField label="Problema" value={rec.problem ?? "—"} />
          <ReportField label="Causa" value={rec.cause ?? "—"} />
          <ReportField label="Solución" value={rec.solution ?? "—"} />
        </div>

        <div className="mt-6 sm:mt-7 pl-0 sm:pl-14 flex items-center justify-between gap-4 flex-wrap">
          {impactText && (
            <div className="sm:hidden">
              <span className="text-xs text-charcoal/45">{impactLabel} · </span>
              <span className="font-heading text-base text-charcoal">{impactText}</span>
            </div>
          )}
          <div className="ml-auto">
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
      </div>
    </motion.article>
  );
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40 font-medium">
        {label}
      </p>
      <p className="text-sm text-charcoal/75 mt-1.5 leading-relaxed">{value}</p>
    </div>
  );
}