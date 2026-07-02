import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rentabilidad")({
  head: () => ({ meta: [{ title: "Rentabilidad — TuComité" }] }),
  component: RentabilidadPage,
});

type D = {
  id: string;
  name: string;
  category: string | null;
  sale_price: number | null;
  cost: number | null;
  margin: number | null;
  monthly_sales: number | null;
  labor_cost: number | null;
};

const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function RentabilidadPage() {
  const [rows, setRows] = useState<D[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("dishes")
        .select("id,name,category,sale_price,cost,margin,monthly_sales,labor_cost")
        .order("margin", { ascending: false });
      setRows((data ?? []) as D[]);
      setLoading(false);
    })();
  }, []);

  const totals = useMemo(() => {
    let revenue = 0, profit = 0;
    for (const d of rows) {
      const sales = Number(d.monthly_sales ?? 0);
      revenue += Number(d.sale_price ?? 0) * sales;
      profit += (Number(d.sale_price ?? 0) - Number(d.cost ?? 0) - Number(d.labor_cost ?? 0)) * sales;
    }
    return { revenue, profit };
  }, [rows]);

  return (
    <AppShell>
      <div className="px-6 sm:px-10 lg:px-16 py-12 sm:py-16 max-w-6xl mx-auto">
        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">Módulo · Rentabilidad</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-charcoal mt-3 tracking-tight leading-[1.05]">Rentabilidad</h1>
          <p className="text-charcoal/60 text-lg mt-3 max-w-xl">
            Cada plato ordenado por margen para que veas dónde ganas y dónde no.
          </p>
        </motion.header>

        <section className="mt-10 rounded-2xl border border-charcoal/10 bg-white overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-charcoal/10">
            <div className="px-6 py-6">
              <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40">Facturación mensual estimada</p>
              <p className="font-heading text-3xl text-charcoal tracking-tight mt-2">{currency.format(totals.revenue)}</p>
            </div>
            <div className="px-6 py-6">
              <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40">Beneficio estimado</p>
              <p className="font-heading text-3xl text-charcoal tracking-tight mt-2">{currency.format(totals.profit)}</p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-charcoal/10 bg-white overflow-hidden">
          {loading ? (
            <div className="h-64 animate-pulse" />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-charcoal/[0.03] text-[11px] uppercase tracking-[0.12em] text-charcoal/50">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Plato</th>
                  <th className="text-right font-medium px-5 py-3">PVP</th>
                  <th className="text-right font-medium px-5 py-3">Coste</th>
                  <th className="text-right font-medium px-5 py-3">Margen</th>
                  <th className="text-right font-medium px-5 py-3">Ventas/mes</th>
                  <th className="text-right font-medium px-5 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/10">
                {rows.map((d) => (
                  <tr key={d.id} className="hover:bg-charcoal/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-charcoal">{d.name}</p>
                      <p className="text-xs text-charcoal/50">{d.category}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-charcoal">{currency.format(Number(d.sale_price ?? 0))}</td>
                    <td className="px-5 py-3 text-right text-charcoal/70">{currency.format(Number(d.cost ?? 0))}</td>
                    <td className={`px-5 py-3 text-right font-medium ${Number(d.margin ?? 0) < 40 ? "text-red-600" : "text-charcoal"}`}>
                      {Number(d.margin ?? 0).toFixed(0)}%
                    </td>
                    <td className="px-5 py-3 text-right text-charcoal/70">{d.monthly_sales ?? 0}</td>
                    <td className="px-5 py-3 text-right">
                      <Link to="/carta/$dishId" params={{ dishId: d.id }} className="text-charcoal/50 hover:text-charcoal">
                        <ArrowUpRight className="w-4 h-4 inline" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}