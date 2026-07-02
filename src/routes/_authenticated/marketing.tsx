import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { Megaphone, Sparkles, TrendingUp } from "lucide-react";
import { useRestaurantIntelligence, type Dish } from "@/hooks/useRestaurantIntelligence";

export const Route = createFileRoute("/_authenticated/marketing")({
  head: () => ({ meta: [{ title: "Marketing — TuComité" }] }),
  component: MarketingPage,
});

function MarketingPage() {
  const { dishes, loading, kpis } = useRestaurantIntelligence();
  const promos = useMemo(() => buildPromos(dishes, kpis.monthlyRevenue), [dishes, kpis.monthlyRevenue]);

  return (
    <AppShell>
      <div className="px-6 sm:px-10 lg:px-16 py-12 sm:py-16 max-w-5xl mx-auto">
        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">
            Módulo · Marketing
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl text-charcoal mt-3 tracking-tight leading-[1.05]">
            Promociones sugeridas
          </h1>
          <p className="text-charcoal/60 text-lg mt-3 max-w-xl">
            El Comité analiza tus platos más rentables y propone acciones para subir ticket medio y frecuencia de visita.
          </p>
        </motion.header>

        <section className="mt-12 space-y-4">
          {loading &&
            [0, 1, 2].map((i) => (
              <div key={i} className="h-32 rounded-2xl border border-charcoal/10 bg-white/60 animate-pulse" />
            ))}
          {!loading &&
            promos.map((p, i) => (
              <motion.article
                key={p.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8"
              >
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[color:var(--gold)]/15 text-[color:var(--gold)] flex items-center justify-center shrink-0">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45 font-medium">
                        {p.tag}
                      </p>
                      <h3 className="font-heading text-xl sm:text-2xl text-charcoal tracking-tight mt-1.5 leading-snug">
                        {p.title}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-charcoal/70">
                    <TrendingUp className="w-4 h-4 text-[color:var(--gold)]" />
                    {p.impact}
                  </div>
                </div>
                <p className="mt-5 text-sm text-charcoal/75 leading-relaxed border-l-2 border-[color:var(--gold)] pl-4">
                  {p.description}
                </p>
              </motion.article>
            ))}
          {!loading && promos.length === 0 && (
            <div className="rounded-2xl border border-dashed border-charcoal/15 bg-white/60 p-10 text-center flex flex-col items-center gap-3">
              <Sparkles className="w-5 h-5 text-[color:var(--gold)]" />
              <p className="text-charcoal/60">Sin datos suficientes para proponer promociones.</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function buildPromos(dishes: Dish[], monthlyRevenue: number) {
  if (dishes.length === 0) return [] as { tag: string; title: string; description: string; impact: string }[];
  const top = [...dishes].sort((a, b) => (b.monthly_sales ?? 0) - (a.monthly_sales ?? 0))[0];
  const bestMargin = [...dishes].sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0))[0];
  const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const uplift9 = Math.round(monthlyRevenue * 0.09);
  const uplift6 = Math.round(monthlyRevenue * 0.06);
  const promos = [
    {
      tag: "Ticket medio",
      title: `Maridaje sugerido junto a ${top?.name ?? "tu plato estrella"}`,
      description: `Añade una copa recomendada en sala al pedir ${top?.name ?? "tu plato más vendido"}. Impacto directo en el ticket medio sin coste adicional de marketing.`,
      impact: uplift9 > 0 ? `+${eur.format(uplift9)}/mes` : "+9% ticket medio",
    },
    {
      tag: "Frecuencia",
      title: `Postre del día con ${bestMargin?.name ?? "tu producto más rentable"}`,
      description: `Comunica un postre destacado de martes a jueves para elevar la ocupación en días valle. Producto con margen alto y baja fricción operativa.`,
      impact: uplift6 > 0 ? `+${eur.format(uplift6)}/mes` : "+6% cubiertos entre semana",
    },
    {
      tag: "Redes sociales",
      title: "Publicación semanal firmada por el chef",
      description: "Una foto real, un texto breve y una llamada a reservar. El Comité genera el guion cada lunes usando los platos con mejor comportamiento.",
      impact: "+120 impresiones/semana",
    },
  ];
  return promos;
}
