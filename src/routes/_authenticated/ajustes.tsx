import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes — TuComité" }] }),
  component: AjustesPage,
});

type Rest = {
  name: string | null;
  business_type: string | null;
  cuisine_type: string | null;
  city: string | null;
  country: string | null;
  employees_count: number | null;
  locations_count: number | null;
  plan: string | null;
};

function AjustesPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<{ full_name: string | null; role: string | null } | null>(null);
  const [restaurant, setRestaurant] = useState<Rest | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, role, restaurant_id")
        .eq("id", u.user.id)
        .maybeSingle();
      setProfile({ full_name: p?.full_name ?? null, role: p?.role ?? null });
      if (p?.restaurant_id) {
        const { data: r } = await supabase
          .from("restaurants")
          .select("name,business_type,cuisine_type,city,country,employees_count,locations_count,plan")
          .eq("id", p.restaurant_id)
          .maybeSingle();
        setRestaurant(r as Rest);
      }
    })();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/" });
  }

  return (
    <AppShell>
      <div className="px-6 sm:px-10 lg:px-16 py-12 sm:py-16 max-w-3xl mx-auto">
        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">Módulo · Ajustes</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-charcoal mt-3 tracking-tight leading-[1.05]">Ajustes</h1>
          <p className="text-charcoal/60 text-lg mt-3 max-w-xl">Datos de tu cuenta y de tu restaurante.</p>
        </motion.header>

        <section className="mt-10 rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8">
          <h2 className="font-heading text-xl text-charcoal tracking-tight mb-4">Cuenta</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Row label="Nombre" value={profile?.full_name || "—"} />
            <Row label="Email" value={email || "—"} />
            <Row label="Rol" value={profile?.role || "Propietario"} />
          </dl>
        </section>

        <section className="mt-6 rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8">
          <h2 className="font-heading text-xl text-charcoal tracking-tight mb-4">Restaurante</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Row label="Nombre" value={restaurant?.name || "—"} />
            <Row label="Tipo" value={restaurant?.business_type || "—"} />
            <Row label="Cocina" value={restaurant?.cuisine_type || "—"} />
            <Row
              label="Ciudad"
              value={
                (restaurant?.city ?? "") +
                  (restaurant?.country ? ", " + restaurant.country : "") || "—"
              }
            />
            <Row label="Empleados" value={restaurant?.employees_count?.toString() || "—"} />
            <Row label="Locales" value={restaurant?.locations_count?.toString() || "—"} />
            <Row label="Plan" value={restaurant?.plan || "Beta"} />
          </dl>
        </section>

        <div className="mt-10">
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 border border-charcoal/15 text-charcoal px-5 h-11 rounded-lg text-sm hover:bg-charcoal/[0.04] transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45">{label}</dt>
      <dd className="text-charcoal mt-1">{value}</dd>
    </div>
  );
}