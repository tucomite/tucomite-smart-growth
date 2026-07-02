import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Package,
  Truck,
  TrendingUp,
  Sparkles,
  Megaphone,
  Settings,
  LogOut,
  Command,
  MessageSquare,
  ChevronsUpDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SecurityCard } from "./SecurityCard";
import { AIAssistantPanel } from "./AIAssistantPanel";

export type NavKey =
  | "resumen"
  | "carta"
  | "inventario"
  | "proveedores"
  | "rentabilidad"
  | "comite"
  | "marketing"
  | "ajustes";

const NAV: Array<{ key: NavKey; label: string; to: string; icon: typeof BookOpen }> = [
  { key: "resumen", label: "Centro de mando", to: "/dashboard", icon: LayoutDashboard },
  { key: "carta", label: "Carta", to: "/carta", icon: BookOpen },
  { key: "inventario", label: "Inventario", to: "/inventario", icon: Package },
  { key: "proveedores", label: "Proveedores", to: "/compras", icon: Truck },
  { key: "rentabilidad", label: "Rentabilidad", to: "/rentabilidad", icon: TrendingUp },
  { key: "comite", label: "Comité IA", to: "/comite", icon: Sparkles },
  { key: "marketing", label: "Marketing", to: "/marketing", icon: Megaphone },
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
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [aiOpen, setAiOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia?.("(min-width: 1280px)").matches ?? true;
  });

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setUserEmail(userData.user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id, full_name")
        .eq("id", userData.user.id)
        .maybeSingle();
      setUserName(profile?.full_name ?? "");
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

  const initials = (userName || userEmail || "TC")
    .split(/\s+|@/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[color:var(--tc-ink)] text-[color:var(--tc-text)] flex antialiased selection:bg-[color:var(--tc-gold)]/30">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-[248px] shrink-0 flex-col border-r border-[color:var(--tc-line)] bg-[color:var(--tc-surface)]">
        <div className="px-4 pt-5 pb-4 flex items-center gap-3">
          <Logo size={36} glow />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium tracking-tight text-white leading-none">TuComité</p>
            <p className="text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--tc-gold)] mt-1.5 leading-none">
              Beta · v1.0
            </p>
          </div>
        </div>

        {restaurantName && (
          <div className="mx-3 mt-2 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[12px] text-white/75 truncate flex-1">{restaurantName}</span>
            <ChevronsUpDown className="w-3 h-3 text-white/30" />
          </div>
        )}

        <nav className="px-3 pt-1 pb-4 space-y-0.5 flex-1 overflow-y-auto">
          <p className="px-3 pt-1 pb-2 text-[10px] uppercase tracking-[0.18em] text-white/30">
            Plataforma
          </p>
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
                className={`group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                  active
                    ? "bg-white/[0.06] text-white"
                    : "text-white/55 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[color:var(--tc-gold)]" />
                )}
                <Icon className={`w-4 h-4 ${active ? "text-[color:var(--tc-gold)]" : "text-white/45 group-hover:text-white/70"} transition-colors`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 space-y-2.5">
          <SecurityCard />
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/10 flex items-center justify-center text-[11px] text-white/85 font-medium">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-white truncate leading-tight">
                {userName || userEmail || "Usuario"}
              </p>
              <p className="text-[10.5px] text-white/40 truncate leading-tight mt-0.5">
                Owner
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-white/40 hover:text-white p-1 rounded transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 flex items-center justify-between px-5 sm:px-8 border-b border-[color:var(--tc-line)] bg-[color:var(--tc-ink)]/85 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-3 text-xs text-white/50 min-w-0">
            {eyebrow ?? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Comité activo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="hidden sm:inline-flex items-center gap-2 h-8 px-2.5 rounded-md border border-white/[0.08] bg-white/[0.02] text-[12px] text-white/55 hover:text-white hover:border-white/[0.15] transition-all"
              type="button"
            >
              <Command className="w-3.5 h-3.5" />
              <span>Buscar</span>
              <kbd className="text-[10px] text-white/40 border border-white/10 rounded px-1 py-0.5 ml-2">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => setAiOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[color:var(--tc-gold)]/10 border border-[color:var(--tc-gold)]/20 text-[12px] text-[color:var(--tc-gold)] hover:bg-[color:var(--tc-gold)]/15 transition-all"
              type="button"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Comité AI</span>
            </button>
            <button
              onClick={handleLogout}
              className="md:hidden text-[12px] text-white/60 hover:text-white"
            >
              Salir
            </button>
          </div>
        </header>

        <div className="flex-1 min-w-0 flex">
          <div className="flex-1 min-w-0">{children}</div>
          <AIAssistantPanel open={aiOpen} onClose={() => setAiOpen(false)} />
        </div>
      </div>
    </div>
  );
}