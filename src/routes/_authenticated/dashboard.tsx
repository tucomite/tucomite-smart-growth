import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, LayoutDashboard, BookOpen, ChefHat, TrendingUp, Users, Settings } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Panel — TuComité" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const [{ data: profile }, { data: restaurant }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", userData.user.id).maybeSingle(),
        supabase.from("restaurants").select("name").eq("owner_id", userData.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
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

  const nav = [
    { label: "Panel", icon: LayoutDashboard, active: true },
    { label: "Carta", icon: BookOpen },
    { label: "Recetas", icon: ChefHat },
    { label: "Rentabilidad", icon: TrendingUp },
    { label: "Equipo", icon: Users },
    { label: "Ajustes", icon: Settings },
  ];

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
                {!item.active && <span className="ml-auto text-[10px] uppercase tracking-wider text-charcoal/40">Pronto</span>}
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
        <header className="border-b border-charcoal/10 px-6 sm:px-10 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-charcoal/40">{restaurantName || "Tu restaurante"}</p>
            <h1 className="font-heading text-2xl text-charcoal mt-0.5">Hola{userName ? `, ${userName.split(" ")[0]}` : ""}.</h1>
          </div>
          <button
            onClick={handleLogout}
            className="md:hidden text-sm text-charcoal/60 hover:text-charcoal"
          >
            Salir
          </button>
        </header>

        <div className="px-6 sm:px-10 py-12 sm:py-16 max-w-3xl mx-auto">
          <div className="rounded-2xl border border-charcoal/10 bg-white p-10 sm:p-14 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-[color:var(--gold)]/15 flex items-center justify-center mb-6">
              <ChefHat className="w-6 h-6 text-charcoal" />
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl text-charcoal tracking-tight">
              Tu comité está reunido.
            </h2>
            <p className="text-charcoal/60 mt-3 max-w-md mx-auto leading-relaxed">
              Estamos preparando los expertos IA para analizar tu carta. Muy pronto verás aquí las primeras decisiones para aumentar tu margen.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-charcoal/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--gold)] animate-pulse" />
              Próximamente
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}