import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat,
  BarChart3,
  ShoppingBasket,
  Package,
  Megaphone,
  Sparkles,
  ArrowRight,
  Check,
  Loader2,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { toast } from "sonner";
import { AutomationCenter } from "@/components/app/AutomationCenter";

export const Route = createFileRoute("/_authenticated/comite")({
  head: () => ({ meta: [{ title: "Comité IA — TuComité" }] }),
  component: ComitePage,
});

type Dish = {
  id: string;
  name: string;
  category: string | null;
  sale_price: number | null;
  cost: number | null;
  margin: number | null;
  monthly_sales: number | null;
};
type Ingredient = {
  id: string;
  name: string;
  current_price: number | null;
  stock_quantity: number | null;
  expiration_date: string | null;
  alternative_price: number | null;
};
type Supplier = { id: string; name: string; rating: number | null };
type Ingredient2 = Ingredient & {
  unit: string | null;
  supplier_id: string | null;
  alternative_supplier_id: string | null;
};

type ExpertKey = "chef" | "finance" | "purchasing" | "stock" | "marketing";
type ExpertNote = {
  key: ExpertKey;
  name: string;
  role: string;
  icon: typeof ChefHat;
  observation: string;
  recommendation: string;
  impact: string;
};
type Decision = {
  objective: string;
  headline: string;
  economicImpact: number;
  timeImpact: string;
  steps: string[];
  notes: ExpertNote[];
};

const PRESET_OBJECTIVES = [
  "Reducir costes",
  "Mejorar margen",
  "Crear menú de verano",
  "Analizar mi carta",
  "Preparar compra semanal",
];

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const EXPERT_ORDER: Array<{ key: ExpertKey; name: string; role: string; icon: typeof ChefHat }> = [
  { key: "chef", name: "Chef IA", role: "Recetas, alérgenos y complejidad", icon: ChefHat },
  { key: "finance", name: "Finanzas", role: "Costes, márgenes y beneficio", icon: BarChart3 },
  { key: "purchasing", name: "Compras", role: "Proveedores y alternativas", icon: ShoppingBasket },
  { key: "stock", name: "Stock", role: "Inventario y desperdicio", icon: Package },
  { key: "marketing", name: "Marketing", role: "Popularidad y promociones", icon: Megaphone },
];

function ComitePage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [ingredientsExt, setIngredientsExt] = useState<Ingredient2[]>([]);
  const [objective, setObjective] = useState("");
  const [deliberating, setDeliberating] = useState(false);
  const [revealed, setRevealed] = useState<number>(0);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [created, setCreated] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", uid)
        .maybeSingle();
      const rid = profile?.restaurant_id ?? null;
      setRestaurantId(rid);
      if (!rid) return;
      const [d, i, s] = await Promise.all([
        supabase
          .from("dishes")
          .select("id,name,category,sale_price,cost,margin,monthly_sales")
          .eq("restaurant_id", rid),
        supabase
          .from("ingredients")
          .select("id,name,current_price,stock_quantity,expiration_date,alternative_price,unit,supplier_id,alternative_supplier_id")
          .eq("restaurant_id", rid),
        supabase.from("suppliers").select("id,name,rating").eq("restaurant_id", rid),
      ]);
      setDishes((d.data ?? []) as Dish[]);
      setIngredients((i.data ?? []) as Ingredient[]);
      setIngredientsExt((i.data ?? []) as Ingredient2[]);
      setSuppliers((s.data ?? []) as Supplier[]);
    })();
  }, []);

  const insights = useMemo(() => computeInsights(dishes, ingredients, suppliers), [dishes, ingredients, suppliers]);

  function runDeliberation(obj: string) {
    const trimmed = obj.trim();
    if (!trimmed) {
      toast.error("Escribe un objetivo o elige uno de los sugeridos.");
      return;
    }
    const dec = buildDecision(trimmed, insights);
    setDecision(dec);
    setCreated(false);
    setDeliberating(true);
    setRevealed(0);
    dec.notes.forEach((_, idx) => {
      setTimeout(() => setRevealed((r) => Math.max(r, idx + 1)), 650 + idx * 700);
    });
    setTimeout(() => setDeliberating(false), 650 + dec.notes.length * 700 + 500);
  }

  async function createRecommendation() {
    if (!decision || !restaurantId) return;
    setCreating(true);
    const { error } = await supabase.from("recommendations").insert({
      restaurant_id: restaurantId,
      title: decision.headline,
      problem: `Objetivo del Comité: ${decision.objective}`,
      cause: decision.notes.map((n) => `${n.name}: ${n.observation}`).join(" · "),
      solution: decision.steps.join("\n"),
      economic_impact: decision.economicImpact || null,
      time_impact: decision.timeImpact || null,
      priority: decision.economicImpact >= 400 ? "high" : decision.economicImpact >= 150 ? "medium" : "low",
      status: "pending",
    });
    setCreating(false);
    if (error) {
      toast.error("No se pudo guardar la recomendación.");
      return;
    }
    setCreated(true);
    toast.success("Recomendación guardada en tu Resumen.");
  }

  return (
    <AppShell>
      <div className="px-6 sm:px-10 lg:px-16 py-12 sm:py-16 max-w-5xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">
            Módulo · Comité IA
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl text-charcoal mt-3 tracking-tight leading-[1.05]">
            Sala de decisiones
          </h1>
          <p className="text-charcoal/60 text-lg mt-3 max-w-xl">
            Plantea un objetivo. Cinco especialistas deliberan sobre los datos reales de tu restaurante
            y firman una decisión conjunta.
          </p>
        </motion.header>

        {/* Objective input */}
        <section className="mt-10 rounded-3xl border border-charcoal/10 bg-white p-6 sm:p-8 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-charcoal text-white flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45 font-medium">
                Objetivo
              </p>
              <h2 className="font-heading text-xl text-charcoal tracking-tight">
                ¿Qué quieres decidir hoy?
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {PRESET_OBJECTIVES.map((p) => (
              <button
                key={p}
                onClick={() => setObjective(p)}
                className={`text-sm px-4 py-2 rounded-full border transition ${
                  objective === p
                    ? "bg-charcoal text-white border-charcoal"
                    : "border-charcoal/15 text-charcoal/70 hover:border-charcoal/40 hover:text-charcoal"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runDeliberation(objective);
              }}
              placeholder="Ej: reducir un 10% el coste del menú"
              className="flex-1 rounded-xl border border-charcoal/15 bg-white px-4 py-3 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:border-charcoal/40 transition"
            />
            <button
              onClick={() => runDeliberation(objective)}
              disabled={deliberating}
              className="inline-flex items-center justify-center gap-2 bg-charcoal text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-charcoal/90 transition disabled:opacity-60"
            >
              {deliberating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Deliberando…
                </>
              ) : (
                <>
                  Reunir al Comité <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </section>

        {/* Deliberation */}
        <AnimatePresence mode="wait">
          {decision && (
            <motion.section
              key={decision.objective + decision.notes.length}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-14"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-charcoal/50 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-[color:var(--gold)]" />
                Deliberación · {decision.objective}
              </div>

              <ol className="space-y-4">
                {decision.notes.map((note, idx) => {
                  const visible = idx < revealed;
                  const Icon = note.icon;
                  return (
                    <motion.li
                      key={note.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0.15, y: 0 }}
                      transition={{ duration: 0.45 }}
                      className="rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-7"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-charcoal/[0.06] text-charcoal/75 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-4 flex-wrap">
                            <div>
                              <p className="font-heading text-lg text-charcoal tracking-tight">
                                {note.name}
                              </p>
                              <p className="text-xs text-charcoal/50">{note.role}</p>
                            </div>
                            {visible && (
                              <span className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--gold)]">
                                Firmado
                              </span>
                            )}
                          </div>
                          {visible ? (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                              <NoteField label="Observación" value={note.observation} />
                              <NoteField label="Recomendación" value={note.recommendation} />
                              <NoteField label="Impacto estimado" value={note.impact} emphasis />
                            </div>
                          ) : (
                            <div className="mt-4 flex items-center gap-2 text-sm text-charcoal/45">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Analizando datos…
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </ol>

              {/* Final decision */}
              <AnimatePresence>
                {revealed >= decision.notes.length && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="mt-8 rounded-3xl border border-charcoal bg-charcoal text-cream p-8 sm:p-10"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--gold)]">
                      Decisión del Comité
                    </p>
                    <h3 className="font-heading text-3xl sm:text-4xl tracking-tight mt-3 leading-[1.1]">
                      {decision.headline}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <p className="text-[11px] uppercase tracking-[0.15em] text-cream/55">
                          Impacto económico
                        </p>
                        <p className="font-heading text-3xl tracking-tight mt-2 tabular-nums">
                          {decision.economicImpact > 0
                            ? `+${currency.format(decision.economicImpact)}/mes`
                            : "Por definir"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <p className="text-[11px] uppercase tracking-[0.15em] text-cream/55">
                          Impacto de tiempo
                        </p>
                        <p className="font-heading text-3xl tracking-tight mt-2">
                          {decision.timeImpact || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-8">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-cream/55 mb-3">
                        Pasos sugeridos
                      </p>
                      <ol className="space-y-2.5">
                        {decision.steps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-sm text-cream/90 leading-relaxed">
                            <span className="w-6 h-6 rounded-full bg-[color:var(--gold)]/20 text-[color:var(--gold)] text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <button
                      onClick={createRecommendation}
                      disabled={created || creating}
                      className={`mt-10 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium transition ${
                        created
                          ? "bg-[color:var(--gold)] text-charcoal"
                          : "bg-cream text-charcoal hover:bg-white"
                      } disabled:opacity-80`}
                    >
                      {created ? (
                        <>
                          <Check className="w-4 h-4" /> Recomendación creada
                        </>
                      ) : creating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Guardando…
                        </>
                      ) : (
                        <>
                          Crear recomendación <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>

        {!decision && (
          <section className="mt-14">
            <h2 className="font-heading text-2xl text-charcoal tracking-tight mb-6">
              Tu Comité permanente
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {EXPERT_ORDER.map((e) => {
                const Icon = e.icon;
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
            </div>
          </section>
        )}

        {restaurantId && (
          <AutomationCenter
            data={{
              restaurantId,
              dishes,
              ingredients: ingredientsExt,
              suppliers,
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

function NoteField({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-charcoal/40">{label}</p>
      <p
        className={`mt-1.5 leading-snug ${
          emphasis
            ? "font-heading text-lg text-charcoal tracking-tight"
            : "text-sm text-charcoal/80"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ---------- Data-driven deliberation ----------

type Insights = ReturnType<typeof computeInsights>;

function computeInsights(dishes: Dish[], ingredients: Ingredient[], suppliers: Supplier[]) {
  const dishesWithMargin = dishes.filter((d) => d.margin != null);
  const avgMargin =
    dishesWithMargin.length > 0
      ? dishesWithMargin.reduce((s, d) => s + Number(d.margin ?? 0), 0) / dishesWithMargin.length
      : 0;
  const lowMargin = [...dishesWithMargin]
    .sort((a, b) => Number(a.margin ?? 0) - Number(b.margin ?? 0))
    .slice(0, 3);
  const topSelling = [...dishes]
    .filter((d) => (d.monthly_sales ?? 0) > 0)
    .sort((a, b) => (b.monthly_sales ?? 0) - (a.monthly_sales ?? 0))
    .slice(0, 3);
  const now = Date.now();
  const expiring = ingredients
    .filter((i) => i.expiration_date)
    .map((i) => ({
      ...i,
      days: Math.round((new Date(i.expiration_date as string).getTime() - now) / 86400000),
    }))
    .filter((i) => i.days <= 3)
    .sort((a, b) => a.days - b.days);
  const savingsAlt = ingredients
    .filter((i) => i.alternative_price != null && i.current_price != null)
    .map((i) => ({
      ...i,
      saving: (Number(i.current_price) - Number(i.alternative_price ?? 0)) * Number(i.stock_quantity ?? 0),
    }))
    .filter((i) => i.saving > 0)
    .sort((a, b) => b.saving - a.saving);
  const monthlyRevenue = dishes.reduce(
    (s, d) => s + Number(d.sale_price ?? 0) * Number(d.monthly_sales ?? 0),
    0,
  );
  const topSupplier = [...suppliers].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
  return {
    avgMargin,
    lowMargin,
    topSelling,
    expiring,
    savingsAlt,
    monthlyRevenue,
    dishCount: dishes.length,
    ingredientCount: ingredients.length,
    supplierCount: suppliers.length,
    topSupplier,
  };
}

function buildDecision(objective: string, ins: Insights): Decision {
  const lower = objective.toLowerCase();
  const kind: "cost" | "margin" | "menu" | "carta" | "compra" | "generic" = lower.includes("coste")
    ? "cost"
    : lower.includes("margen")
      ? "margin"
      : lower.includes("verano") || lower.includes("menú") || lower.includes("menu")
        ? "menu"
        : lower.includes("carta")
          ? "carta"
          : lower.includes("compra")
            ? "compra"
            : "generic";

  const lowNames = ins.lowMargin.map((d) => d.name).join(", ") || "tus platos con menor margen";
  const topName = ins.topSelling[0]?.name ?? "tu plato estrella";
  const bestSaving = ins.savingsAlt[0];
  const expOne = ins.expiring[0];
  const altSupplier = ins.topSupplier?.name ?? "un proveedor alternativo";

  const notes: ExpertNote[] = EXPERT_ORDER.map((e) => {
    switch (e.key) {
      case "chef":
        return {
          ...e,
          observation:
            kind === "menu"
              ? `Tu carta tiene ${ins.dishCount} platos. ${topName} lidera en ventas.`
              : `${ins.dishCount} platos activos. Complejidad concentrada en ${lowNames}.`,
          recommendation:
            kind === "menu"
              ? "Diseñar 4 platos de temporada con producto local y baja mano de obra."
              : `Rediseñar ficha técnica de ${ins.lowMargin[0]?.name ?? "los platos débiles"} y simplificar guarniciones.`,
          impact: kind === "menu" ? "4 platos nuevos en 5 días" : "-15% tiempo de cocina",
        };
      case "finance":
        return {
          ...e,
          observation: `Margen medio actual: ${ins.avgMargin.toFixed(1)}%. Facturación estimada mensual: ${currency.format(ins.monthlyRevenue)}.`,
          recommendation:
            kind === "cost"
              ? "Recortar 3 puntos de coste vía proveedores + ajuste de raciones."
              : "Ajustar PVP de los 3 platos con margen más bajo (+1,20 € a +1,80 €).",
          impact:
            kind === "cost"
              ? `+${currency.format(Math.max(180, Math.round(ins.monthlyRevenue * 0.03)))}/mes`
              : `+${currency.format(320)}/mes`,
        };
      case "purchasing":
        return {
          ...e,
          observation: bestSaving
            ? `Puedes ahorrar en ${bestSaving.name} cambiando de proveedor.`
            : `${ins.supplierCount} proveedores activos. Sin alternativas comparadas aún.`,
          recommendation: bestSaving
            ? `Sustituir proveedor de ${bestSaving.name} por ${altSupplier}.`
            : "Solicitar 2 presupuestos comparativos para los 3 ingredientes clave.",
          impact: bestSaving ? `-${currency.format(Math.max(80, Math.round(bestSaving.saving)))}/mes` : "-8% coste medio",
        };
      case "stock":
        return {
          ...e,
          observation: expOne
            ? `${expOne.name} caduca en ${expOne.days} ${expOne.days === 1 ? "día" : "días"}.`
            : `${ins.ingredientCount} ingredientes bajo control. Sin caducidades críticas.`,
          recommendation: expOne
            ? `Priorizar ${expOne.name} en el pase de hoy o incluirlo en la sugerencia del chef.`
            : "Congelar el 10% del stock cárnico para amortiguar picos de fin de semana.",
          impact: expOne ? "0 € desperdicio evitado" : "-12% desperdicio semanal",
        };
      case "marketing":
        return {
          ...e,
          observation: `${topName} concentra la mayor tracción de tu carta.`,
          recommendation:
            kind === "menu"
              ? `Comunicar el menú de verano en redes con ${topName} como ancla visual.`
              : `Añadir maridaje sugerido junto a ${topName} para subir ticket medio.`,
          impact: "+9% ticket medio",
        };
    }
  });

  const headline =
    kind === "cost"
      ? "Reduce costes ajustando proveedores y raciones clave"
      : kind === "margin"
        ? "Sube margen con reajuste de PVP en 3 platos"
        : kind === "menu"
          ? "Lanza un menú de verano de 4 platos rentables"
          : kind === "carta"
            ? "Optimiza tu carta actual eliminando lo no rentable"
            : kind === "compra"
              ? "Prepara la compra semanal priorizando ahorro y caducidades"
              : `Plan de acción para: ${objective}`;

  const economic =
    Math.max(180, Math.round(ins.monthlyRevenue * (kind === "cost" ? 0.03 : 0.025))) +
    (bestSaving ? Math.round(bestSaving.saving) : 0);

  const timeImpact = kind === "menu" ? "5 días" : kind === "compra" ? "1 h esta semana" : "2 h esta semana";

  const steps =
    kind === "compra"
      ? [
          `Comprar ${expOne?.name ?? "los ingredientes con menor stock"} en primer pedido del lunes.`,
          bestSaving ? `Sustituir proveedor de ${bestSaving.name}.` : "Comparar 2 proveedores para los 3 ingredientes clave.",
          "Consolidar pedido semanal en un solo día para reducir mermas y logística.",
        ]
      : kind === "menu"
        ? [
            "Definir 4 platos de temporada con producto local.",
            "Cerrar fichas técnicas y calcular coste objetivo (<32%).",
            "Fotografiar y publicar en redes esta semana.",
          ]
        : [
            `Ajustar PVP de ${ins.lowMargin[0]?.name ?? "los platos débiles"} (+1,40 €).`,
            bestSaving ? `Cambiar proveedor de ${bestSaving.name}.` : "Renegociar precios con proveedor principal.",
            `Comunicar en sala el maridaje sugerido junto a ${topName}.`,
          ];

  return {
    objective,
    headline,
    economicImpact: economic,
    timeImpact,
    steps,
    notes,
  };
}
