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
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SecurityCard } from "./SecurityCard";
import { AIAssistantPanel } from "./AIAssistantPanel";
import { ThemeToggle } from "./ThemeToggle";
import { useAppTheme, themeScopeClass } from "@/lib/theme";

export type NavKey =
  | "resumen"
  | "carta"
  | "inventario"
  | "proveedores"
  | "facturas"
  | "rentabilidad"
  | "comite"
  | "marketing"
  | "ajustes";

const NAV: Array<{ key: NavKey; label: string; to: string; icon: typeof BookOpen }> = [
  { key: "resumen", label: "Centro de mando", to: "/dashboard", icon: LayoutDashboard },
  { key: "carta", label: "Carta", to: "/carta", icon: BookOpen },
  { key: "inventario", label: "Inventario", to: "/inventario", icon: Package },
  { key: "proveedores", label: "Proveedores", to: "/compras", icon: Truck },
  { key: "facturas", label: "Facturas", to: "/facturas", icon: FileText },
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

  const { theme } = useAppTheme();

  return (
    <div
      className={`${themeScopeClass(theme)} min-h-screen bg-[color:var(--tc-ink)] text-[color:var(--tc-text)] flex antialiased selection:bg-[color:var(--tc-gold)]/30`}
    >
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-[264px] shrink-0 flex-col border-r border-[color:var(--tc-line)] bg-[color:var(--tc-surface)]">
        <div className="px-6 pt-7 pb-6 flex items-center gap-3">
          <Logo size={30} glow />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium tracking-tight text-[color:var(--tc-text)] leading-none">TuComité</p>
            <p className="text-[9px] uppercase tracking-[0.24em] text-[color:var(--tc-gold)] mt-1.5 leading-none">
              Beta · v1.0
            </p>
          </div>
        </div>

        {restaurantName && (
          <div className="mx-4 mb-4 flex items-center gap-2 px-3 py-2 rounded-[10px] bg-[color:var(--tc-panel)] border border-[color:var(--tc-line)] cursor-default hover:bg-[color:var(--tc-panel-hover)] transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span className="text-[12px] text-[color:var(--tc-text-dim)] truncate flex-1 font-medium">{restaurantName}</span>
            <ChevronsUpDown className="w-3 h-3 text-[color:var(--tc-text-mute)]" strokeWidth={1.8} />
          </div>
        )}

        <nav className="px-4 pt-2 pb-4 space-y-[3px] flex-1 overflow-y-auto">
          <p className="px-3 pt-2 pb-3 text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--tc-text-mute)] font-medium">
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
                className={`group relative w-full flex items-center gap-3 px-3 h-9 rounded-[8px] text-[13px] transition-all duration-200 ${
                  active
                    ? "bg-[color:var(--tc-panel-strong)] text-[color:var(--tc-text)] font-medium"
                    : "text-[color:var(--tc-text-dim)] hover:text-[color:var(--tc-text)] hover:bg-[color:var(--tc-panel)]"
                }`}
              >
                {active && (
                  <span className="absolute -left-4 top-2 bottom-2 w-[2px] rounded-r-full bg-[color:var(--tc-gold)] shadow-[0_0_10px_rgba(201,169,114,0.5)]" />
                )}
                <Icon
                  strokeWidth={1.75}
                  className={`w-[15px] h-[15px] ${
                    active
                      ? "text-[color:var(--tc-gold)]"
                      : "text-[color:var(--tc-text-mute)] group-hover:text-[color:var(--tc-text-dim)]"
                  } transition-colors`}
                />
                <span className="truncate tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-3 border-t border-[color:var(--tc-line)]">
          <SecurityCard />
          <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-[10px] hover:bg-[color:var(--tc-panel)] transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[color:var(--tc-panel-strong)] to-[color:var(--tc-panel)] border border-[color:var(--tc-line-strong)] flex items-center justify-center text-[11px] text-[color:var(--tc-text)] font-semibold tracking-wide">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-[color:var(--tc-text)] truncate leading-tight font-medium">
                {userName || userEmail || "Usuario"}
              </p>
              <p className="text-[10.5px] text-[color:var(--tc-text-mute)] truncate leading-tight mt-0.5 uppercase tracking-[0.14em]">
                Owner
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-[color:var(--tc-text-mute)] hover:text-[color:var(--tc-text)] p-1.5 rounded-md hover:bg-[color:var(--tc-panel)] transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[56px] flex items-center justify-between px-6 sm:px-10 border-b border-[color:var(--tc-line)] tc-glass sticky top-0 z-20">
          <div className="flex items-center gap-3 text-[12px] text-[color:var(--tc-text-dim)] min-w-0">
            {eyebrow ?? (
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] animate-pulse" />
                Comité activo
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className="hidden sm:inline-flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-[8px] border border-[color:var(--tc-line)] bg-[color:var(--tc-panel)] text-[12px] text-[color:var(--tc-text-dim)] hover:text-[color:var(--tc-text)] hover:bg-[color:var(--tc-panel-hover)] hover:border-[color:var(--tc-line-strong)] transition-all"
              type="button"
            >
              <Command className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Buscar</span>
              <kbd className="text-[10px] text-[color:var(--tc-text-mute)] bg-[color:var(--tc-panel-strong)] border border-[color:var(--tc-line)] rounded px-1.5 py-0.5 ml-3 font-medium tracking-wide">
                ⌘K
              </kbd>
            </button>
            <ThemeToggle className="hidden sm:inline-flex" />
            <button
              onClick={() => setAiOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] bg-[color:var(--tc-gold)]/[0.10] border border-[color:var(--tc-gold)]/25 text-[12px] font-medium text-[color:var(--tc-gold)] hover:bg-[color:var(--tc-gold)]/[0.16] hover:border-[color:var(--tc-gold)]/40 transition-all shadow-[0_0_20px_-8px_rgba(201,169,114,0.35)]"
              type="button"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Comité AI</span>
            </button>
            <button
              onClick={handleLogout}
              className="md:hidden text-[12px] text-[color:var(--tc-text-dim)] hover:text-[color:var(--tc-text)]"
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