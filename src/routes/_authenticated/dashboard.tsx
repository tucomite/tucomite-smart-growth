import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut,
  LayoutDashboard,
  BookOpen,
  ChefHat,
  TrendingUp,
  Users,
  Settings,
  ArrowUpRight,
  Sparkles,
  Check,
  PiggyBank,
  AlertTriangle,
  Clock,
  ShoppingBasket,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Informe del Comité — TuComité" }] }),
  component: DashboardPage,
});

type Recommendation = {
  id: string;
  category: string;
  icon: typeof PiggyBank;
  tone: "gold" | "warn" | "neutral";
  headline: string;
  problem: string;
  cause: string;
  solution: string;
  impact: string;
  impactLabel: string;
};

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "r1",
    category: "Ahorro potencial",
    icon: PiggyBank,
    tone: "gold",
    headline: "Puedes ahorrar 1.240 € este mes cambiando dos proveedores",
    problem: "Estás pagando un 14% más que el precio medio de mercado en carnes y lácteos.",
    cause: "Tu proveedor actual no ha ajustado tarifas desde marzo, mientras la competencia bajó precios.",
    solution: "Sustituir el proveedor de carnes por Cárnicas del Valle y renegociar lácteos con Central Láctea.",
    impact: "+1.240 € / mes",
    impactLabel: "impacto estimado",
  },
  {
    id: "r2",
    category: "Platos con bajo margen",
    icon: AlertTriangle,
    tone: "warn",
    headline: "3 platos de tu carta operan bajo el 25% de margen",
    problem: "Risotto de setas, Tartar de atún y Ensalada César están por debajo del margen objetivo.",
    cause: "Subidas de proveedor no repercutidas en el PVP durante los últimos 4 meses.",
    solution: "Subir 1,40 € el Risotto y 2,10 € el Tartar. Rediseñar la Ensalada César con ingredientes de temporada.",
    impact: "+ 380 € / mes",
    impactLabel: "margen recuperado",
  },
  {
    id: "r3",
    category: "Ingredientes próximos a caducar",
    icon: Clock,
    tone: "warn",
    headline: "6,4 kg de producto caducan en menos de 72h",
    problem: "Salmón, queso de cabra y espinacas frescas cerca de fecha límite.",
    cause: "Pedido semanal calculado sobre la demanda del mes anterior, superior a la actual.",
    solution: "Lanzar sugerencia del chef: tosta de salmón, queso y espinacas al horno. Precio 12,50 €.",
    impact: "Evita 84 € de merma",
    impactLabel: "impacto en desperdicio",
  },
  {
    id: "r4",
    category: "Recomendaciones de compra",
    icon: ShoppingBasket,
    tone: "neutral",
    headline: "Adelanta la compra de aceite de oliva antes del viernes",
    problem: "El precio de compra subirá previsiblemente un 6% la próxima semana.",
    cause: "Cierre de campaña en origen y baja disponibilidad regional confirmada por dos proveedores.",
    solution: "Realizar pedido de 40 L adicionales ahora para cubrir 3 semanas de consumo.",
    impact: "Ahorro de 92 €",
    impactLabel: "precio anticipado",
  },
  {
    id: "r5",
    category: "Nuevas oportunidades",
    icon: Lightbulb,
    tone: "gold",
    headline: "Un menú de mediodía podría añadir 2.100 € al mes",
    problem: "Ocupación media de sala entre 13:00 y 14:30 por debajo del 45%.",
    cause: "Ausencia de propuesta cerrada para clientes de oficina en la zona.",
    solution: "Menú ejecutivo de 3 tiempos a 16,90 € basado en platos con margen superior al 68%.",
    impact: "+ 2.100 € / mes",
    impactLabel: "ingresos potenciales",
  },
];

function DashboardPage() {
  const navigate = useNavigate();
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [applied, setApplied] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const [{ data: profile }, { data: restaurant }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", userData.user.id).maybeSingle(),
        supabase
          .from("restaurants")
          .select("name")
          .eq("owner_id", userData.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setUserName(profile?.full_name || userData.user.email || "");
      setRestaurantName(restaurant?.name || "");
    })();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/" });
  }

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

  const totalSavings = "3.896 €";
  const analyzedItems = 47;

  const nav = [
    { label: "Informe", icon: LayoutDashboard, active: true },
    { label: "Carta", icon: BookOpen },
    { label: "Recetas", icon: ChefHat },
    { label: "Rentabilidad", icon: TrendingUp },
    { label: "Equipo", icon: Users },
    { label: "Ajustes", icon: Settings },
  ];

  function apply(id: string) {
    setApplied((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    toast.success("Recomendación aplicada", {
      description: "El Comité lo tendrá en cuenta en el próximo informe.",
    });
  }

  return (
    <div className="min-h-screen bg-[color:var(--cream)] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-60 flex-col border-r border-charcoal/10 bg-white/40 p-5">
        <div className="flex items-center gap-2.5 mb-10 px-2">
          <div className="w-7 h-7 rounded bg-[color:var(--gold)] flex items-center justify-center">
            <span className="font-heading text-charcoal text-sm font-semibold">T</span>
          </div>
          <span className="font-heading text-charcoal text-sm">TuComité</span>
        </div>
        <nav className="space-y-0.5 flex-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                disabled={!item.active}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  item.active
                    ? "bg-charcoal/[0.06] text-charcoal font-medium"
                    : "text-charcoal/50 hover:bg-charcoal/[0.04] disabled:opacity-60 disabled:cursor-not-allowed"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {!item.active && (
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-charcoal/40">
                    Pronto
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-charcoal/60 hover:text-charcoal hover:bg-charcoal/[0.04] transition-colors"
        >
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="border-b border-charcoal/10 px-6 sm:px-10 py-4 flex items-center justify-between bg-[color:var(--cream)]/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3 text-xs text-charcoal/50">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Informe del {today}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="md:hidden text-sm text-charcoal/60 hover:text-charcoal"
          >
            Salir
          </button>
        </header>

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
              <span className="text-charcoal font-medium">{analyzedItems} platos</span>, tus
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
                value={String(RECOMMENDATIONS.length)}
                sub="para revisar hoy"
              />
              <SummaryStat
                label="Expertos que han intervenido"
                value="5"
                sub="Chef, Finanzas, Compras, Stock, Marketing"
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
                {RECOMMENDATIONS.length} puntos
              </span>
            </div>

            <div className="space-y-4">
              {RECOMMENDATIONS.map((rec, i) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  index={i}
                  applied={applied.has(rec.id)}
                  onApply={() => apply(rec.id)}
                />
              ))}
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
      </main>
    </div>
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
  rec: Recommendation;
  index: number;
  applied: boolean;
  onApply: () => void;
}) {
  const Icon = rec.icon;
  const toneAccent =
    rec.tone === "gold"
      ? "bg-[color:var(--gold)]/15 text-[color:var(--gold)]"
      : rec.tone === "warn"
        ? "bg-amber-500/10 text-amber-700"
        : "bg-charcoal/[0.06] text-charcoal/70";

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
                {rec.category}
              </p>
              <h3 className="font-heading text-xl sm:text-2xl text-charcoal tracking-tight mt-1.5 leading-snug">
                {rec.headline}
              </h3>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end shrink-0">
            <span className="text-xs text-charcoal/45">{rec.impactLabel}</span>
            <span className="font-heading text-xl text-charcoal mt-0.5 whitespace-nowrap">
              {rec.impact}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5 pl-0 sm:pl-14">
          <ReportField label="Problema" value={rec.problem} />
          <ReportField label="Causa" value={rec.cause} />
          <ReportField label="Solución" value={rec.solution} />
        </div>

        <div className="mt-6 sm:mt-7 pl-0 sm:pl-14 flex items-center justify-between gap-4 flex-wrap">
          <div className="sm:hidden">
            <span className="text-xs text-charcoal/45">{rec.impactLabel} · </span>
            <span className="font-heading text-base text-charcoal">{rec.impact}</span>
          </div>
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