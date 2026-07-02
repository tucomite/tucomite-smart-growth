import { motion } from "framer-motion";
import {
  ChefHat,
  BarChart3,
  ShoppingBasket,
  Package,
  Megaphone,
  FileText,
  ClipboardList,
} from "lucide-react";
import type { CommitteeActivity, Intelligence } from "@/hooks/useRestaurantIntelligence";

const ICONS: Record<string, typeof ChefHat> = {
  chef: ChefHat,
  finance: BarChart3,
  purchasing: ShoppingBasket,
  stock: Package,
  marketing: Megaphone,
  report: FileText,
};

const timeFmt = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

export function CommitteeTimeline({ ctx }: { ctx: Intelligence }) {
  const items = buildTimeline(ctx);
  if (items.length === 0) return null;
  return (
    <div className="relative pl-6">
      <span className="absolute left-[11px] top-2 bottom-2 w-px bg-charcoal/10" />
      <ol className="space-y-5">
        {items.map((a, i) => {
          const Icon = (a.type && ICONS[a.type]) || ClipboardList;
          return (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <span className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-white border border-charcoal/15 flex items-center justify-center text-charcoal/70">
                <Icon className="w-3 h-3" />
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-xs text-charcoal/50 tabular-nums w-11 shrink-0">
                  {timeFmt.format(new Date(a.created_at))}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-charcoal font-medium">{a.title}</p>
                  {a.description && (
                    <p className="text-xs text-charcoal/60 mt-0.5">{a.description}</p>
                  )}
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

// Build a rich timeline: real activity + synthetic recent entries derived from data.
function buildTimeline(ctx: Intelligence): CommitteeActivity[] {
  const real = ctx.activity ?? [];
  const now = Date.now();
  const synth: CommitteeActivity[] = [];
  // Only add synthetic entries if the last real activity is older than 45 min OR list is short
  const lastAgeMin = real[0]
    ? (now - new Date(real[0].created_at).getTime()) / 60000
    : Infinity;
  if (lastAgeMin > 45 || real.length < 3) {
    const push = (offsetMin: number, type: string, title: string, description: string) => {
      synth.push({
        id: `synth-${type}-${offsetMin}`,
        type,
        title,
        description,
        created_at: new Date(now - offsetMin * 60000).toISOString(),
      });
    };
    if (ctx.kpis.lowMarginDishes[0]) {
      push(
        4,
        "chef",
        `Chef IA revisó ${ctx.kpis.lowMarginDishes[0].name}`,
        `Margen actual ${Number(ctx.kpis.lowMarginDishes[0].margin ?? 0).toFixed(0)}%. Propuesta de rediseño enviada.`,
      );
    }
    if (ctx.kpis.supplierSavings > 0) {
      push(
        11,
        "purchasing",
        "Compras encontró un proveedor mejor",
        `Ahorro potencial detectado en tu lista de ingredientes.`,
      );
    }
    if (ctx.kpis.topSellers[0]) {
      push(
        18,
        "marketing",
        `Marketing preparó una promoción para ${ctx.kpis.topSellers[0].name}`,
        `Basado en ${ctx.kpis.topSellers[0].monthly_sales ?? 0} ventas mensuales.`,
      );
    }
    if (ctx.kpis.avgMargin > 0) {
      push(
        23,
        "finance",
        "Finanzas recalculó márgenes",
        `Margen medio actualizado a ${ctx.kpis.avgMargin.toFixed(1)}%.`,
      );
    }
    if (ctx.kpis.expiringCount > 0) {
      push(
        27,
        "stock",
        "Stock detectó riesgo de caducidad",
        `${ctx.kpis.expiringCount} ingredientes a menos de 3 días.`,
      );
    }
  }
  return [...synth, ...real].slice(0, 8);
}