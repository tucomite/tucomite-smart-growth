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
import type { TimelineRange } from "./Phase4Sections";

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
  return <CommitteeTimelineImpl ctx={ctx} range="semana" />;
}

export function CommitteeTimelineImpl({
  ctx,
  range,
}: {
  ctx: Intelligence;
  range: TimelineRange;
}) {
  const items = filterByRange(buildTimeline(ctx), range);
  if (items.length === 0) return null;
  const grouped = groupByDay(items);
  return (
    <div className="relative pl-6">
      <span className="absolute left-[11px] top-2 bottom-2 w-px bg-charcoal/10" />
      <div className="space-y-8">
        {grouped.map(([day, entries]) => (
          <div key={day}>
            <p className="text-[10.5px] uppercase tracking-[0.22em] text-charcoal/50 font-medium mb-3">
              {day}
            </p>
            <ol className="space-y-5">
              {entries.map((a, i) => {
                const Icon = (a.type && ICONS[a.type]) || ClipboardList;
                return (
                  <motion.li
                    key={a.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
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
        ))}
      </div>
    </div>
  );
}

function filterByRange(items: CommitteeActivity[], range: TimelineRange): CommitteeActivity[] {
  const now = Date.now();
  const day = 86400000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startTs = startOfToday.getTime();
  return items.filter((a) => {
    const t = new Date(a.created_at).getTime();
    if (range === "hoy") return t >= startTs;
    if (range === "ayer") return t >= startTs - day && t < startTs;
    if (range === "semana") return now - t <= 7 * day;
    return now - t <= 30 * day;
  });
}

const dayFmt = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
function groupByDay(items: CommitteeActivity[]): [string, CommitteeActivity[]][] {
  const map = new Map<string, CommitteeActivity[]>();
  const today = new Date(); today.setHours(0,0,0,0);
  const yest = new Date(today.getTime() - 86400000);
  items.forEach((a) => {
    const d = new Date(a.created_at); d.setHours(0,0,0,0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Hoy";
    else if (d.getTime() === yest.getTime()) label = "Ayer";
    else label = dayFmt.format(d);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(a);
  });
  return Array.from(map.entries());
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