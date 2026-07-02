import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { ChefHat, BarChart3, ShoppingBasket, Package, Megaphone, FileText, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_authenticated/comite")({
  head: () => ({ meta: [{ title: "Comité IA — TuComité" }] }),
  component: ComitePage,
});

const ICONS: Record<string, typeof ChefHat> = {
  chef: ChefHat,
  finance: BarChart3,
  purchasing: ShoppingBasket,
  stock: Package,
  marketing: Megaphone,
  report: FileText,
};

const EXPERTS = [
  { key: "chef", name: "Chef IA", role: "Recetas, alérgenos y complejidad." },
  { key: "finance", name: "Finanzas", role: "Costes, márgenes y beneficio." },
  { key: "purchasing", name: "Compras", role: "Proveedores y alternativas." },
  { key: "stock", name: "Stock", role: "Inventario y desperdicio." },
  { key: "marketing", name: "Marketing", role: "Popularidad y promociones." },
];

type A = { id: string; title: string; description: string | null; type: string | null; created_at: string };

function ComitePage() {
  const [acts, setActs] = useState<A[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("committee_activity")
        .select("id,title,description,type,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      setActs((data ?? []) as A[]);
      setLoading(false);
    })();
  }, []);
  return (
    <AppShell>
      <div className="px-6 sm:px-10 lg:px-16 py-12 sm:py-16 max-w-5xl mx-auto">
        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">Módulo · Comité IA</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-charcoal mt-3 tracking-tight leading-[1.05]">Comité IA</h1>
          <p className="text-charcoal/60 text-lg mt-3 max-w-xl">
            Cinco expertos trabajando en segundo plano para tu restaurante.
          </p>
        </motion.header>

        <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPERTS.map((e) => {
            const Icon = ICONS[e.key] ?? ClipboardList;
            return (
              <div key={e.key} className="rounded-2xl border border-charcoal/10 bg-white p-6">
                <div className="w-10 h-10 rounded-lg bg-charcoal/[0.06] text-charcoal/70 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-heading text-xl text-charcoal tracking-tight">{e.name}</h3>
                <p className="text-sm text-charcoal/60 mt-1">{e.role}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-14">
          <h2 className="font-heading text-2xl text-charcoal tracking-tight mb-6">Historial de intervenciones</h2>
          <ol className="rounded-2xl border border-charcoal/10 bg-white divide-y divide-charcoal/10 overflow-hidden">
            {loading && [0, 1, 2].map((i) => <li key={i} className="h-16 animate-pulse" />)}
            {!loading &&
              acts.map((a) => {
                const Icon = (a.type && ICONS[a.type]) || ClipboardList;
                return (
                  <li key={a.id} className="flex items-start gap-4 px-5 sm:px-6 py-4">
                    <div className="w-9 h-9 rounded-lg bg-charcoal/[0.06] text-charcoal/70 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-charcoal font-medium">{a.title}</p>
                      {a.description && <p className="text-sm text-charcoal/60 mt-0.5">{a.description}</p>}
                    </div>
                  </li>
                );
              })}
          </ol>
        </section>
      </div>
    </AppShell>
  );
}