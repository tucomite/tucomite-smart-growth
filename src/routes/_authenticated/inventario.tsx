import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { useRestaurantIntelligence } from "@/hooks/useRestaurantIntelligence";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({ meta: [{ title: "Inventario — TuComité" }] }),
  component: InventarioPage,
});

type Row = {
  id: string;
  name: string;
  unit: string | null;
  current_price: number | null;
  stock_quantity: number | null;
  stock_minimum: number | null;
  expiration_date: string | null;
};

const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const dateFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

function InventarioPage() {
  const { ingredients, loading } = useRestaurantIntelligence();
  const rows = useMemo(
    () =>
      [...ingredients].sort((a, b) => {
        if (!a.expiration_date) return 1;
        if (!b.expiration_date) return -1;
        return a.expiration_date.localeCompare(b.expiration_date);
      }),
    [ingredients],
  );
  return (
    <AppShell>
      <div className="px-6 sm:px-10 lg:px-16 py-12 sm:py-16 max-w-6xl mx-auto">
        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">Módulo · Inventario</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-charcoal mt-3 tracking-tight leading-[1.05]">Inventario</h1>
          <p className="text-charcoal/60 text-lg mt-3 max-w-xl">
            Controla stock, caducidades y costes de tus ingredientes.
          </p>
        </motion.header>
        <section className="mt-10 rounded-2xl border border-charcoal/10 bg-white overflow-hidden">
          {loading ? (
            <div className="h-64 animate-pulse" />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-charcoal/[0.03] text-[11px] uppercase tracking-[0.12em] text-charcoal/50">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Ingrediente</th>
                  <th className="text-right font-medium px-5 py-3">Stock</th>
                  <th className="text-right font-medium px-5 py-3">Mínimo</th>
                  <th className="text-right font-medium px-5 py-3">Precio</th>
                  <th className="text-right font-medium px-5 py-3">Caduca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/10">
                {rows.map((r) => {
                  const low = Number(r.stock_quantity ?? 0) <= Number(r.stock_minimum ?? 0);
                  const soon = r.expiration_date
                    ? new Date(r.expiration_date).getTime() - Date.now() < 3 * 86400000
                    : false;
                  return (
                    <tr key={r.id}>
                      <td className="px-5 py-3 text-charcoal">{r.name}</td>
                      <td className={`px-5 py-3 text-right ${low ? "text-amber-700 font-medium" : "text-charcoal"}`}>
                        {r.stock_quantity} {r.unit}
                      </td>
                      <td className="px-5 py-3 text-right text-charcoal/50">{r.stock_minimum} {r.unit}</td>
                      <td className="px-5 py-3 text-right text-charcoal">
                        {r.current_price != null ? `${currency.format(Number(r.current_price))}/${r.unit}` : "—"}
                      </td>
                      <td className={`px-5 py-3 text-right ${soon ? "text-red-600 font-medium" : "text-charcoal/60"}`}>
                        {r.expiration_date ? dateFmt.format(new Date(r.expiration_date)) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}