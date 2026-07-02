import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Package,
  ShoppingBasket,
  TrendingUp,
  Sparkles,
  Settings,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type NavKey =
  | "resumen"
  | "carta"
  | "inventario"
  | "compras"
  | "rentabilidad"
  | "comite"
  | "ajustes";

const NAV: Array<{ key: NavKey; label: string; to: string; icon: typeof BookOpen }> = [
  { key: "resumen", label: "Resumen", to: "/dashboard", icon: LayoutDashboard },
  { key: "carta", label: "Carta", to: "/carta", icon: BookOpen },
  { key: "inventario", label: "Inventario", to: "/inventario", icon: Package },
  { key: "compras", label: "Compras", to: "/compras", icon: ShoppingBasket },
  { key: "rentabilidad", label: "Rentabilidad", to: "/rentabilidad", icon: TrendingUp },
  { key: "comite", label: "Comité IA", to: "/comite", icon: Sparkles },
  { key: "ajustes", label: "Ajustes", to: "/ajustes", icon: Settings },
];

export function AppShell({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow?: ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [restaurantName, setRestaurantName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (!profile?.restaurant_id) return;
      const { data: r } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", profile.restaurant_id)
        .maybeSingle();
      setRestaurantName(r?.name ?? "");
    })();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-[color:var(--cream)] flex">
      <aside className="hidden md:flex md:w-60 flex-col border-r border-charcoal/10 bg-white/40 p-5">
        <div className="flex items-center gap-2.5 mb-10 px-2">
          <div className="w-7 h-7 rounded bg-[color:var(--gold)] flex items-center justify-center">
            <span className="font-heading text-charcoal text-sm font-semibold">T</span>
          </div>
          <span className="font-heading text-charcoal text-sm">TuComité</span>
        </div>
        <nav className="space-y-0.5 flex-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-charcoal/[0.06] text-charcoal font-medium"
                    : "text-charcoal/60 hover:bg-charcoal/[0.04] hover:text-charcoal"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="pt-4 border-t border-charcoal/10 mt-4">
          {restaurantName && (
            <p className="px-3 text-[11px] uppercase tracking-[0.15em] text-charcoal/40 mb-2">
              {restaurantName}
            </p>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-charcoal/60 hover:text-charcoal hover:bg-charcoal/[0.04] transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="border-b border-charcoal/10 px-6 sm:px-10 py-4 flex items-center justify-between bg-[color:var(--cream)]/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3 text-xs text-charcoal/50">
            {eyebrow ?? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Comité activo
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="md:hidden text-sm text-charcoal/60 hover:text-charcoal"
          >
            Salir
          </button>
        </header>
        {children}
      </main>
    </div>
  );
}