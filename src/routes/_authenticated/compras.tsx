import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { Star } from "lucide-react";
import { useRestaurantIntelligence } from "@/hooks/useRestaurantIntelligence";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({ meta: [{ title: "Compras — TuComité" }] }),
  component: ComprasPage,
});

function ComprasPage() {
  const intel = useRestaurantIntelligence();
  const rows = useMemo(() => [...intel.suppliers].sort((a, b) => a.name.localeCompare(b.name)), [intel.suppliers]);
  const loading = intel.loading;
  return (
    <AppShell>
      <div className="px-6 sm:px-10 lg:px-16 py-12 sm:py-16 max-w-6xl mx-auto">
        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">Módulo · Compras</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-charcoal mt-3 tracking-tight leading-[1.05]">Compras</h1>
          <p className="text-charcoal/60 text-lg mt-3 max-w-xl">
            Tus proveedores activos y las alternativas que recomienda el Comité.
          </p>
        </motion.header>
        <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {loading &&
            [0, 1, 2].map((i) => (
              <div key={i} className="h-40 rounded-2xl border border-charcoal/10 bg-white/60 animate-pulse" />
            ))}
          {!loading &&
            rows.map((s) => (
              <div key={s.id} className="rounded-2xl border border-charcoal/10 bg-white p-6 hover:border-charcoal/25 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-xl text-charcoal tracking-tight">{s.name}</h3>
                    <p className="text-sm text-charcoal/60 mt-1">Proveedor activo</p>
                  </div>
                  {s.rating != null && (
                    <span className="inline-flex items-center gap-1 text-sm text-charcoal">
                      <Star className="w-3.5 h-3.5 fill-[color:var(--gold)] text-[color:var(--gold)]" />
                      {Number(s.rating).toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="mt-5 text-xs uppercase tracking-[0.15em] text-charcoal/40">Valoración del Comité</p>
                <div className="mt-2 h-1.5 rounded-full bg-charcoal/[0.06] overflow-hidden">
                  <div className="h-full bg-[color:var(--gold)]" style={{ width: `${((Number(s.rating ?? 0)) / 5) * 100}%` }} />
                </div>
              </div>
            ))}
        </section>
      </div>
    </AppShell>
  );
}