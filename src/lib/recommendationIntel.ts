import type {
  Recommendation,
  Intelligence,
  Dish,
  Ingredient,
  Supplier,
} from "@/hooks/useRestaurantIntelligence";

export type Confidence = "alta" | "media" | "baja";
export type Difficulty = "baja" | "media" | "alta";
export type Area =
  | "Finanzas"
  | "Chef"
  | "Compras"
  | "Stock"
  | "Marketing"
  | "Operativa";

export type EnrichedRec = {
  rec: Recommendation;
  score: number; // 0-100 priority
  probability: number; // 0-100 success probability
  confidence: Confidence;
  difficulty: Difficulty;
  area: Area;
  roi: number; // multiplier
  timeHours: number;
  monthlyImpact: number;
};

const AREA_KEYWORDS: [Area, string[]][] = [
  ["Compras", ["proveedor", "compra", "precio", "coste", "insumo"]],
  ["Stock", ["stock", "caduc", "inventario", "merma", "desperdici"]],
  ["Marketing", ["promo", "carta", "menú", "ticket", "cliente", "maridaje"]],
  ["Chef", ["plato", "receta", "cocina", "ingrediente"]],
  ["Finanzas", ["margen", "precio", "pvp", "rentab", "coste"]],
];

function detectArea(rec: Recommendation): Area {
  const t = `${rec.title} ${rec.problem ?? ""} ${rec.solution ?? ""}`.toLowerCase();
  for (const [area, words] of AREA_KEYWORDS) {
    if (words.some((w) => t.includes(w))) return area;
  }
  return "Operativa";
}

function detectDifficulty(rec: Recommendation): Difficulty {
  const t = `${rec.solution ?? ""} ${rec.title}`.toLowerCase();
  if (t.includes("rediseñ") || t.includes("elimina") || t.includes("reestruct")) return "alta";
  if (t.includes("sustitu") || t.includes("cambia") || t.includes("negoci")) return "media";
  return "baja";
}

function detectTimeHours(rec: Recommendation, difficulty: Difficulty): number {
  if (rec.priority === "high") return difficulty === "alta" ? 6 : 2;
  if (rec.priority === "low") return difficulty === "alta" ? 4 : 1;
  return difficulty === "alta" ? 5 : 2;
}

/** Confidence based on data completeness for the affected area. */
function detectConfidence(area: Area, ctx: Intelligence): Confidence {
  const { dishes, ingredients, suppliers, snapshots } = ctx;
  const dishesOk = dishes.length >= 4 && dishes.filter((d) => d.cost != null).length >= 3;
  const ingOk = ingredients.length >= 4;
  const supOk = suppliers.length >= 2;
  const histOk = snapshots.length >= 7;
  const checks: boolean[] = [];
  if (area === "Chef" || area === "Marketing" || area === "Finanzas") checks.push(dishesOk);
  if (area === "Compras" || area === "Stock") checks.push(ingOk);
  if (area === "Compras") checks.push(supOk);
  checks.push(histOk);
  const ok = checks.filter(Boolean).length;
  if (ok === checks.length) return "alta";
  if (ok >= Math.ceil(checks.length / 2)) return "media";
  return "baja";
}

function detectProbability(
  rec: Recommendation,
  difficulty: Difficulty,
  confidence: Confidence,
): number {
  let p = 70;
  if (rec.priority === "high") p += 10;
  if (rec.priority === "low") p -= 5;
  if (difficulty === "alta") p -= 15;
  if (difficulty === "baja") p += 8;
  if (confidence === "alta") p += 8;
  if (confidence === "baja") p -= 15;
  return Math.max(30, Math.min(96, p));
}

function detectRoi(rec: Recommendation, timeHours: number): number {
  const impact = Number(rec.economic_impact) || 0;
  const cost = Math.max(30, timeHours * 25); // hourly opportunity cost
  return impact > 0 ? impact / cost : 0;
}

function computeScore(e: Omit<EnrichedRec, "score">, maxImpact: number): number {
  const impactPart = maxImpact > 0 ? (e.monthlyImpact / maxImpact) * 55 : 0;
  const probPart = (e.probability / 100) * 20;
  const diffPart = e.difficulty === "baja" ? 12 : e.difficulty === "media" ? 7 : 3;
  const confPart = e.confidence === "alta" ? 8 : e.confidence === "media" ? 5 : 2;
  const priorityBonus = e.rec.priority === "high" ? 5 : 0;
  return Math.round(Math.max(1, Math.min(100, impactPart + probPart + diffPart + confPart + priorityBonus)));
}

export function enrichRecommendations(
  recs: Recommendation[],
  ctx: Intelligence,
): EnrichedRec[] {
  const maxImpact = Math.max(
    1,
    ...recs.map((r) => Number(r.economic_impact) || 0),
  );
  return recs.map((rec) => {
    const area = detectArea(rec);
    const difficulty = detectDifficulty(rec);
    const confidence = detectConfidence(area, ctx);
    const probability = detectProbability(rec, difficulty, confidence);
    const timeHours = detectTimeHours(rec, difficulty);
    const monthlyImpact = Number(rec.economic_impact) || 0;
    const roi = detectRoi(rec, timeHours);
    const partial = { rec, area, difficulty, confidence, probability, timeHours, monthlyImpact, roi };
    const score = computeScore(partial, maxImpact);
    return { ...partial, score };
  });
}

// ---------- Risks ----------

export type Risk = {
  id: string;
  severity: "alta" | "media" | "baja";
  area: Area;
  title: string;
  detail: string;
  impact?: number; // monthly euros at risk
};

export function detectRisks(
  dishes: Dish[],
  ingredients: Ingredient[],
  suppliers: Supplier[],
): Risk[] {
  const now = Date.now();
  const risks: Risk[] = [];

  ingredients.forEach((i) => {
    if (!i.expiration_date) return;
    const days = (new Date(i.expiration_date).getTime() - now) / 86400000;
    if (days <= 3) {
      const value = Number(i.current_price ?? 0) * Number(i.stock_quantity ?? 0);
      risks.push({
        id: `exp-${i.id}`,
        severity: days <= 1 ? "alta" : "media",
        area: "Stock",
        title: `${i.name} caduca en ${Math.max(0, Math.round(days))} d`,
        detail: `${(i.stock_quantity ?? 0)} ${i.unit ?? "u"} en riesgo · valor ${Math.round(value)} €`,
        impact: value,
      });
    }
  });

  ingredients.forEach((i) => {
    const stock = Number(i.stock_quantity ?? 0);
    const min = Number(i.stock_minimum ?? 0);
    if (min > 0 && stock <= min) {
      risks.push({
        id: `low-${i.id}`,
        severity: stock < min * 0.5 ? "alta" : "media",
        area: "Stock",
        title: `Stock bajo de ${i.name}`,
        detail: `${stock} ${i.unit ?? "u"} · mínimo ${min}`,
      });
    }
  });

  dishes.forEach((d) => {
    const m = Number(d.margin ?? 0);
    if (m > 0 && m < 20) {
      const monthly = (Number(d.sale_price ?? 0) - Number(d.cost ?? 0)) * Number(d.monthly_sales ?? 0);
      risks.push({
        id: `dish-${d.id}`,
        severity: m < 10 ? "alta" : "media",
        area: "Chef",
        title: `${d.name} con margen crítico`,
        detail: `Margen ${m.toFixed(0)}% · ${Number(d.monthly_sales ?? 0)} ventas/mes`,
        impact: Math.abs(monthly),
      });
    }
  });

  ingredients.forEach((i) => {
    const cur = Number(i.current_price ?? 0);
    const alt = Number(i.alternative_price ?? 0);
    if (alt > 0 && cur > 0 && (cur - alt) / cur > 0.12) {
      const saving = (cur - alt) * Number(i.stock_quantity ?? 0);
      const sup = suppliers.find((s) => s.id === i.supplier_id);
      risks.push({
        id: `sup-${i.id}`,
        severity: (cur - alt) / cur > 0.2 ? "alta" : "media",
        area: "Compras",
        title: `Proveedor caro para ${i.name}`,
        detail: `${sup?.name ?? "Actual"} cobra ${Math.round(((cur - alt) / cur) * 100)}% más que la alternativa`,
        impact: saving,
      });
    }
  });

  return risks.sort((a, b) => {
    const sev = { alta: 3, media: 2, baja: 1 };
    return sev[b.severity] - sev[a.severity] || (b.impact ?? 0) - (a.impact ?? 0);
  });
}

// ---------- Goals ----------

export type Goal = {
  id: string;
  title: string;
  detail: string;
  progress: number; // 0-100
  current: string;
  target: string;
};

export function computeGoals(ctx: Intelligence): Goal[] {
  const { kpis, ingredients, dishes } = ctx;
  const stockValue = kpis.stockValue;
  const targetPurchases = stockValue * 0.92;
  const purchaseProgress = stockValue > 0
    ? Math.min(100, Math.max(0, ((stockValue - targetPurchases) / (stockValue * 0.08)) * 20))
    : 0;

  const wasteRatio = kpis.expiringValue / Math.max(1, kpis.stockValue);
  const wasteProgress = Math.max(0, Math.min(100, (1 - wasteRatio * 4) * 100));

  const marginTarget = 65;
  const marginProgress = Math.max(0, Math.min(100, (kpis.avgMargin / marginTarget) * 100));

  const avgTicket = dishes.length > 0
    ? dishes.reduce((s, d) => s + Number(d.sale_price ?? 0), 0) / dishes.length
    : 0;
  const ticketTarget = Math.max(18, avgTicket * 1.08);
  const ticketProgress = Math.min(100, (avgTicket / ticketTarget) * 100);

  return [
    {
      id: "purchases",
      title: "Reducir coste de compras un 8%",
      detail: `${ingredients.length} ingredientes · alternativa disponible en ${ingredients.filter((i) => i.alternative_price != null).length}`,
      progress: Math.round(purchaseProgress),
      current: `${Math.round(stockValue)} €`,
      target: `${Math.round(targetPurchases)} €`,
    },
    {
      id: "waste",
      title: "Reducir desperdicio",
      detail: `${kpis.expiringCount} ingredientes en riesgo esta semana`,
      progress: Math.round(wasteProgress),
      current: `${Math.round(kpis.expiringValue)} € en riesgo`,
      target: `< ${Math.round(kpis.stockValue * 0.02)} €`,
    },
    {
      id: "margin",
      title: "Mejorar margen medio a 65%",
      detail: `${dishes.filter((d) => d.margin != null).length} platos con datos`,
      progress: Math.round(marginProgress),
      current: `${kpis.avgMargin.toFixed(1)}%`,
      target: `${marginTarget}%`,
    },
    {
      id: "ticket",
      title: "Aumentar ticket medio",
      detail: "Basado en PVP medio de tu carta",
      progress: Math.round(ticketProgress),
      current: `${avgTicket.toFixed(2)} €`,
      target: `${ticketTarget.toFixed(2)} €`,
    },
  ];
}

// ---------- Missing data ----------

export type MissingItem = { area: string; detail: string };

export function detectMissingData(ctx: Intelligence): MissingItem[] {
  const items: MissingItem[] = [];
  if (ctx.dishes.length < 5) items.push({ area: "Carta", detail: `Solo ${ctx.dishes.length} platos registrados. Añade tu carta completa.` });
  const dishesWithoutCost = ctx.dishes.filter((d) => d.cost == null).length;
  if (dishesWithoutCost > 0) items.push({ area: "Finanzas", detail: `${dishesWithoutCost} platos sin coste. El cálculo de margen es aproximado.` });
  const dishesWithoutSales = ctx.dishes.filter((d) => (d.monthly_sales ?? 0) === 0).length;
  if (dishesWithoutSales > 0) items.push({ area: "Ventas", detail: `${dishesWithoutSales} platos sin ventas mensuales. Conecta tu TPV o rellena manualmente.` });
  if (ctx.suppliers.length < 2) items.push({ area: "Compras", detail: "Añade al menos 2 proveedores para comparar precios." });
  const ingWithoutExp = ctx.ingredients.filter((i) => !i.expiration_date).length;
  if (ingWithoutExp > 0) items.push({ area: "Stock", detail: `${ingWithoutExp} ingredientes sin caducidad. El Comité no puede prever desperdicio.` });
  if (ctx.snapshots.length < 14) items.push({ area: "Histórico", detail: "Necesitas 14 días de operación para tendencias fiables." });
  return items;
}

// ---------- Simulation ----------

export function simulateOutcome(enriched: EnrichedRec[], ctx: Intelligence) {
  const relevant = enriched.filter((e) => e.rec.status === "pending" && e.monthlyImpact > 0);
  const gainMonthly = relevant.reduce((s, e) => s + e.monthlyImpact * (e.probability / 100), 0);
  const currentMonthly = ctx.kpis.monthlyProfit;
  const estimatedMonthly = currentMonthly + gainMonthly;
  const totalHours = relevant.reduce((s, e) => s + e.timeHours, 0);
  const paybackDays = gainMonthly > 0 ? Math.max(1, Math.round((totalHours * 25) / (gainMonthly / 30))) : 0;
  const annualImpact = gainMonthly * 12;
  return {
    currentMonthly,
    estimatedMonthly,
    gainMonthly,
    annualImpact,
    paybackDays,
    totalHours,
    recCount: relevant.length,
  };
}