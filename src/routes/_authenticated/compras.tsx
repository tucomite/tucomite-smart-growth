import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({ meta: [{ title: "Compras — TuComité" }] }),
  component: ComprasPage,
});

type Sup = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  delivery_time: string | null;
  rating: number | null;
};

function ComprasPage() {
  const [rows, setRows] = useState<Sup[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id,name,contact_name,phone,email,delivery_time,rating")
        .order("name");
      setRows((data ?? []) as Sup[]);
      setLoading(false);
    })();
  }, []);
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
              <div key={s.id} className="rounded-2xl border border-charcoal/10 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-xl text-charcoal tracking-tight">{s.name}</h3>
                    <p className="text-sm text-charcoal/60 mt-1">{s.contact_name}</p>
                  </div>
                  {s.rating != null && (
                    <span className="inline-flex items-center gap-1 text-sm text-charcoal">
                      <Star className="w-3.5 h-3.5 fill-[color:var(--gold)] text-[color:var(--gold)]" />
                      {Number(s.rating).toFixed(1)}
                    </span>
                  )}
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-y-3 text-sm">
                  <dt className="text-charcoal/50">Teléfono</dt>
                  <dd className="text-charcoal text-right">{s.phone ?? "—"}</dd>
                  <dt className="text-charcoal/50">Email</dt>
                  <dd className="text-charcoal text-right truncate">{s.email ?? "—"}</dd>
                  <dt className="text-charcoal/50">Entrega</dt>
                  <dd className="text-charcoal text-right">{s.delivery_time ?? "—"}</dd>
                </dl>
              </div>
            ))}
        </section>
      </div>
    </AppShell>
  );
}