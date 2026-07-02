import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChefHat,
  ShoppingBasket,
  Megaphone,
  BarChart3,
  Check,
  Sparkles,
  TrendingUp,
  ArrowRight,
  GitCompare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/carta/$dishId")({
  head: () => ({ meta: [{ title: "Análisis de plato — TuComité" }] }),
  component: DishDetailPage,
});

type Dish = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  chef_notes: string | null;
  sale_price: number | null;
  cost: number | null;
  margin: number | null;
  labor_cost: number | null;
  target_margin: number | null;
  popularity: number | null;
  monthly_sales: number | null;
  recommended_price: number | null;
  allergens: string[] | null;
  status: string | null;
};

type IngRow = {
  ingredient_id: string;
  quantity: number;
  ingredients: {
    id: string;
    name: string;
    unit: string | null;
    current_price: number | null;
    alternative_price: number | null;
    supplier_id: string | null;
    alternative_supplier_id: string | null;
  } | null;
};

type Supplier = { id: string; name: string };

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function DishDetailPage() {
  const { dishId } = Route.useParams();
  const navigate = useNavigate();
  const [dish, setDish] = useState<Dish | null>(null);
  const [ings, setIngs] = useState<IngRow[]>([]);
  const [suppliers, setSuppliers] = useState<Map<string, Supplier>>(new Map());
  const [recIds, setRecIds] = useState<string[]>([]);
  const [recApplied, setRecApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: d } = await supabase
        .from("dishes")
        .select(
          "id,name,category,description,chef_notes,sale_price,cost,margin,labor_cost,target_margin,popularity,monthly_sales,recommended_price,allergens,status",
        )
        .eq("id", dishId)
        .maybeSingle();
      if (!d) {
        setLoading(false);
        return;
      }
      setDish(d as Dish);

      const [{ data: di }, { data: sup }, { data: rec }] = await Promise.all([
        supabase
          .from("dish_ingredients")
          .select(
            "ingredient_id, quantity, ingredients(id,name,unit,current_price,alternative_price,supplier_id,alternative_supplier_id)",
          )
          .eq("dish_id", dishId),
        supabase.from("suppliers").select("id,name"),
        supabase
          .from("recommendations")
          .select("id,status")
          .ilike("title", `%${(d as Dish).name}%`),
      ]);
      setIngs((di ?? []) as unknown as IngRow[]);
      const map = new Map<string, Supplier>();
      for (const s of sup ?? []) map.set(s.id, s as Supplier);
      setSuppliers(map);
      const recs = (rec ?? []) as { id: string; status: string | null }[];
      setRecIds(recs.map((r) => r.id));
      setRecApplied(recs.length > 0 && recs.every((r) => r.status === "applied"));
      setLoading(false);
    })();
  }, [dishId]);

  const ingredientCost = useMemo(
    () =>
      ings.reduce(
        (sum, r) =>
          sum + Number(r.quantity ?? 0) * Number(r.ingredients?.current_price ?? 0),
        0,
      ),
    [ings],
  );

  const potentialSavings = useMemo(
    () =>
      ings.reduce((sum, r) => {
        const cur = Number(r.ingredients?.current_price ?? 0);
        const alt = Number(r.ingredients?.alternative_price ?? 0);
        if (alt > 0 && alt < cur) return sum + (cur - alt) * Number(r.quantity ?? 0);
        return sum;
      }, 0),
    [ings],
  );

  const monthlySales = Number(dish?.monthly_sales ?? 0);
  const monthlyProfit = useMemo(() => {
    if (!dish) return 0;
    const perUnit =
      Number(dish.sale_price ?? 0) -
      Number(dish.cost ?? 0) -
      Number(dish.labor_cost ?? 0);
    return perUnit * monthlySales;
  }, [dish, monthlySales]);

  const impactPerMonth = useMemo(() => {
    if (!dish) return 0;
    const rec = Number(dish.recommended_price ?? 0);
    const cur = Number(dish.sale_price ?? 0);
    const priceGain = rec > cur ? (rec - cur) * monthlySales : 0;
    return priceGain + potentialSavings * monthlySales;
  }, [dish, monthlySales, potentialSavings]);

  async function apply() {
    setCelebrating(true);
    if (recIds.length > 0) {
      const { error } = await supabase
        .from("recommendations")
        .update({ status: "applied" })
        .in("id", recIds);
      if (error) {
        setCelebrating(false);
        toast.error("No se pudo aplicar");
        return;
      }
    }
    setRecApplied(true);
    if (dish && Number(dish.recommended_price ?? 0) > 0) {
      await supabase
        .from("dishes")
        .update({ sale_price: dish.recommended_price })
        .eq("id", dish.id);
      setDish({ ...dish, sale_price: dish.recommended_price });
    }
    toast.success("Recomendaciones aplicadas", {
      description: "El Comité actualizará su próximo informe.",
    });
    setTimeout(() => setCelebrating(false), 1400);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="px-6 sm:px-10 lg:px-16 py-16 max-w-5xl mx-auto">
          <div className="h-8 w-40 rounded bg-white/60 animate-pulse" />
          <div className="h-16 w-2/3 rounded bg-white/60 animate-pulse mt-6" />
          <div className="h-64 rounded-2xl bg-white/60 animate-pulse mt-10" />
        </div>
      </AppShell>
    );
  }

  if (!dish) {
    return (
      <AppShell>
        <div className="px-6 sm:px-10 lg:px-16 py-16 max-w-5xl mx-auto">
          <p className="text-charcoal/60">Plato no encontrado.</p>
          <button
            onClick={() => navigate({ to: "/carta" })}
            className="mt-4 text-sm text-charcoal underline"
          >
            Volver a la carta
          </button>
        </div>
      </AppShell>
    );
  }

  const targetM = Number(dish.target_margin ?? 65);
  const currentM = Number(dish.margin ?? 0);
  const status =
    currentM >= targetM - 3
      ? { label: "Excelente", dot: "bg-emerald-500" }
      : currentM >= targetM - 15
        ? { label: "Aceptable", dot: "bg-amber-500" }
        : { label: "Riesgo", dot: "bg-red-500" };

  const alternatives = ings
    .filter((r) => {
      const cur = Number(r.ingredients?.current_price ?? 0);
      const alt = Number(r.ingredients?.alternative_price ?? 0);
      return alt > 0 && alt < cur;
    })
    .map((r) => ({
      name: r.ingredients?.name ?? "",
      currentSupplier:
        suppliers.get(r.ingredients?.supplier_id ?? "")?.name ?? "Sin proveedor",
      recommendedSupplier:
        suppliers.get(r.ingredients?.alternative_supplier_id ?? "")?.name ??
        "Alternativa disponible",
      currentPrice: Number(r.ingredients?.current_price ?? 0),
      alternativePrice: Number(r.ingredients?.alternative_price ?? 0),
      savingPerUnit:
        Number(r.ingredients?.current_price ?? 0) -
        Number(r.ingredients?.alternative_price ?? 0),
      unit: r.ingredients?.unit ?? "",
    }));

  const ingredientRows = ings.map((r) => {
    const q = Number(r.quantity ?? 0);
    const price = Number(r.ingredients?.current_price ?? 0);
    return {
      name: r.ingredients?.name ?? "—",
      quantity: q,
      unit: r.ingredients?.unit ?? "",
      unitPrice: price,
      total: q * price,
      supplier:
        suppliers.get(r.ingredients?.supplier_id ?? "")?.name ?? "Sin proveedor",
    };
  });

  // Impacto total esperado
  const currentRevenue = Number(dish.sale_price ?? 0) * monthlySales;
  const estimatedPrice = Math.max(
    Number(dish.recommended_price ?? 0),
    Number(dish.sale_price ?? 0),
  );
  const estimatedRevenue = estimatedPrice * monthlySales;
  const monthlyIncrease = Math.max(0, estimatedRevenue - currentRevenue) + potentialSavings * monthlySales;
  const investment = 49; // coste único auditoría
  const roiMonths = monthlyIncrease > 0 ? investment / monthlyIncrease : null;

  // Marketing insights derivados de datos
  const popularity = Number(dish.popularity ?? 0);
  const avgTicket = Number(dish.sale_price ?? 0);
  const bestSlot =
    popularity >= 75 ? "Cenas 20:30 – 22:30" : popularity >= 45 ? "Comidas 13:30 – 15:00" : "Fines de semana";
  const repeatProb = Math.min(95, Math.round(40 + popularity * 0.5));
  const marketingRecommendation =
    currentM < targetM - 10
      ? `Reposicionar como producto premium: subir ${currency.format(Math.max(1, estimatedPrice - Number(dish.sale_price ?? 0)))} y destacar procedencia del producto.`
      : popularity >= 70
        ? `Alta demanda: crear maridaje sugerido (+${currency.format(4.5)} ticket medio) y visibilizar en primera página de la carta.`
        : `Empujar en franja ${bestSlot.toLowerCase()} con oferta cruzada de entrante para elevar ticket medio.`;

  return (
    <AppShell
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Informe del Comité
        </span>
      }
    >
      <div className="px-6 sm:px-10 lg:px-16 py-12 sm:py-14 max-w-5xl mx-auto pb-32">
        <Link
          to="/carta"
          className="inline-flex items-center gap-1.5 text-sm text-charcoal/50 hover:text-charcoal transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Carta
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6"
        >
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">
            {dish.category || "Plato"} · Análisis
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-charcoal mt-3 tracking-tight leading-[1.05]">
            {dish.name}
          </h1>
          {dish.description && (
            <p className="text-charcoal/60 text-lg mt-4 max-w-2xl leading-relaxed">
              {dish.description}
            </p>
          )}
        </motion.header>

        {/* Summary strip */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 rounded-2xl border border-charcoal/10 bg-white overflow-hidden"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-charcoal/10">
            <StatCell label="Estado">
              <span className="inline-flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                <span className="font-heading text-2xl text-charcoal">{status.label}</span>
              </span>
            </StatCell>
            <StatCell label="Margen actual" value={`${currentM.toFixed(0)}%`} />
            <StatCell label="Objetivo" value={`${targetM.toFixed(0)}%`} muted />
            <StatCell
              label="Impacto potencial"
              value={impactPerMonth > 0 ? `+${currency.format(impactPerMonth)}/mes` : "—"}
              emphasis
            />
          </div>
        </motion.section>

        {/* Blocks */}
        <div className="mt-14 space-y-12">
          <Block
            icon={BarChart3}
            eyebrow="Finanzas"
            title="Descomposición económica"
          >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
              <Field label="Precio de venta" value={currency.format(Number(dish.sale_price ?? 0))} />
              <Field label="Coste de ingredientes" value={currency.format(ingredientCost || Number(dish.cost ?? 0))} />
              <Field label="Coste de mano de obra" value={currency.format(Number(dish.labor_cost ?? 0))} />
              <Field label="Margen bruto" value={`${currentM.toFixed(1)}%`} />
              <Field
                label="Beneficio mensual estimado"
                value={currency.format(monthlyProfit)}
                sub={`Basado en ${monthlySales} ventas/mes`}
                emphasis
              />
            </dl>
          </Block>

          <Block icon={ChefHat} eyebrow="Chef IA" title="Análisis de receta">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
              <Field label="Ingredientes en receta" value={`${ings.length}`} />
              <Field
                label="Complejidad"
                value={ings.length <= 3 ? "Baja" : ings.length <= 6 ? "Media" : "Alta"}
              />
              <Field
                label="Alérgenos"
                value={(dish.allergens ?? []).length ? (dish.allergens ?? []).join(", ") : "Ninguno"}
              />
              <Field
                label="Ingredientes alternativos sugeridos"
                value={alternatives.length ? `${alternatives.length} disponibles` : "Sin sugerencias"}
              />
            </dl>
            {dish.chef_notes && (
              <p className="mt-6 text-sm text-charcoal/70 leading-relaxed border-l-2 border-[color:var(--gold)] pl-4">
                {dish.chef_notes}
              </p>
            )}
          </Block>

          <Block icon={ShoppingBasket} eyebrow="Compras" title="Proveedores y costes">
            {ingredientRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-charcoal/15 bg-[color:var(--cream)] p-8 text-center">
                <p className="text-sm text-charcoal/70">
                  El Chef IA aún no ha desglosado la receta de este plato.
                </p>
                <Link
                  to="/inventario"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-charcoal font-medium hover:underline"
                >
                  Vincular ingredientes desde Inventario
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
            <div className="rounded-xl border border-charcoal/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-charcoal/[0.03] text-[11px] uppercase tracking-[0.12em] text-charcoal/50">
                  <tr>
                    <th className="text-left font-medium px-5 py-3">Ingrediente</th>
                    <th className="text-right font-medium px-5 py-3">Cantidad</th>
                    <th className="text-right font-medium px-5 py-3">Coste unitario</th>
                    <th className="text-right font-medium px-5 py-3">Coste total</th>
                    <th className="text-left font-medium px-5 py-3">Proveedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/10 bg-white">
                  {ingredientRows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3 text-charcoal">{r.name}</td>
                      <td className="px-5 py-3 text-right text-charcoal/80 tabular-nums">
                        {r.quantity} {r.unit}
                      </td>
                      <td className="px-5 py-3 text-right text-charcoal/80 tabular-nums">
                        {currency.format(r.unitPrice)}/{r.unit}
                      </td>
                      <td className="px-5 py-3 text-right text-charcoal font-medium tabular-nums">
                        {currency.format(r.total)}
                      </td>
                      <td className="px-5 py-3 text-charcoal/70">{r.supplier}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-charcoal/[0.03] border-t border-charcoal/10">
                    <td className="px-5 py-3 text-[11px] uppercase tracking-[0.12em] text-charcoal/50" colSpan={3}>
                      Coste total de ingredientes
                    </td>
                    <td className="px-5 py-3 text-right font-heading text-lg text-charcoal tabular-nums">
                      {currency.format(ingredientRows.reduce((s, r) => s + r.total, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            )}
            <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-charcoal/50">
                {alternatives.length > 0
                  ? `${alternatives.length} ingredientes tienen proveedor alternativo con mejor precio.`
                  : "Todos los ingredientes usan el proveedor con mejor precio disponible."}
              </p>
              <Link
                to="/compras"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-charcoal/15 text-sm text-charcoal hover:border-charcoal/40 hover:bg-charcoal/[0.03] transition-colors"
              >
                <GitCompare className="w-4 h-4" />
                Comparar proveedores
              </Link>
            </div>
          </Block>

          <Block icon={Megaphone} eyebrow="Marketing" title="Posicionamiento en carta">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
              <Field
                label="Franja de venta óptima"
                value={bestSlot}
                sub={`Basado en popularidad ${popularity}/100 y patrón semanal`}
              />
              <Field
                label="Popularidad"
                value={`${popularity}/100`}
                sub={
                  popularity >= 70
                    ? "En el 25% superior de la carta"
                    : popularity >= 40
                      ? "Rendimiento medio"
                      : "Rotación baja — candidato a revisión"
                }
              />
              <Field
                label="Ticket medio del plato"
                value={currency.format(avgTicket)}
                sub={`${monthlySales} ventas/mes × PVP actual`}
              />
              <Field
                label="Probabilidad de repetición"
                value={`${repeatProb}%`}
                sub="Estimación a partir de popularidad y margen"
              />
            </dl>
            <p className="mt-6 text-sm text-charcoal/75 leading-relaxed border-l-2 border-[color:var(--gold)] pl-4">
              <span className="uppercase tracking-[0.15em] text-[11px] text-charcoal/45 block mb-1">
                Recomendación
              </span>
              {marketingRecommendation}
            </p>
          </Block>

          <Block icon={TrendingUp} eyebrow="Proyección" title="Impacto total esperado">
            <div className="space-y-4">
              <ImpactRow
                label="Ingresos actuales"
                value={currency.format(currentRevenue)}
                sub={`${monthlySales} ventas × ${currency.format(Number(dish.sale_price ?? 0))}`}
              />
              <ImpactArrow />
              <ImpactRow
                label="Ingresos estimados"
                value={currency.format(estimatedRevenue)}
                sub={
                  estimatedPrice > Number(dish.sale_price ?? 0)
                    ? `Con PVP recomendado de ${currency.format(estimatedPrice)}`
                    : "Manteniendo PVP actual, aplicando mejoras de coste"
                }
              />
              <ImpactArrow />
              <ImpactRow
                label="Incremento mensual esperado"
                value={`+${currency.format(monthlyIncrease)}`}
                sub="Suma de subida de precio y ahorro en ingredientes"
                emphasis
              />
              <ImpactArrow />
              <ImpactRow
                label="Recuperación de la inversión"
                value={
                  roiMonths == null
                    ? "—"
                    : roiMonths < 1
                      ? "Menos de 1 mes"
                      : `${Math.ceil(roiMonths)} ${Math.ceil(roiMonths) === 1 ? "mes" : "meses"}`
                }
                sub={`Sobre una auditoría única de ${currency.format(investment)}`}
              />
            </div>
          </Block>
        </div>

        {/* Apply */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16"
        >
          <button
            onClick={apply}
            disabled={recApplied || celebrating}
            className="w-full h-16 rounded-2xl bg-charcoal text-cream font-medium text-base inline-flex items-center justify-center gap-3 hover:bg-charcoal/90 transition-colors disabled:opacity-70 relative overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {recApplied ? (
                <motion.span
                  key="applied"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="inline-flex items-center gap-2"
                >
                  <Check className="w-5 h-5 text-[color:var(--gold)]" />
                  Recomendaciones aplicadas
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="inline-flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-[color:var(--gold)]" />
                  Aplicar recomendaciones
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <AnimatePresence>
            {celebrating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none fixed inset-0 flex items-center justify-center z-40"
              >
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="w-40 h-40 rounded-full bg-[color:var(--gold)]/25 blur-2xl"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AppShell>
  );
}

function StatCell({
  label,
  value,
  sub,
  emphasis,
  muted,
  children,
}: {
  label: string;
  value?: string;
  sub?: string;
  emphasis?: boolean;
  muted?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="px-6 py-6 sm:py-7">
      <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40">{label}</p>
      {children ?? (
        <p
          className={`font-heading tracking-tight mt-2 ${
            emphasis
              ? "text-3xl text-charcoal"
              : muted
                ? "text-2xl text-charcoal/50"
                : "text-2xl text-charcoal"
          }`}
        >
          {value}
        </p>
      )}
      {sub && <p className="text-xs text-charcoal/50 mt-1.5">{sub}</p>}
    </div>
  );
}

function Block({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: typeof ChefHat;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-charcoal/[0.06] text-charcoal/70 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45 font-medium">
            {eyebrow}
          </p>
          <h2 className="font-heading text-2xl text-charcoal tracking-tight leading-tight">
            {title}
          </h2>
        </div>
      </div>
      <div className="rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45">{label}</dt>
      <dd
        className={`font-heading tracking-tight mt-1.5 ${
          emphasis ? "text-2xl text-charcoal" : "text-xl text-charcoal"
        }`}
      >
        {value}
      </dd>
      {sub && <p className="text-xs text-charcoal/50 mt-1">{sub}</p>}
    </div>
  );
}

function ImpactRow({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-6 rounded-xl px-5 py-4 border ${
        emphasis
          ? "bg-[color:var(--gold)]/10 border-[color:var(--gold)]/30"
          : "bg-white border-charcoal/10"
      }`}
    >
      <div>
        <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45">{label}</p>
        {sub && <p className="text-xs text-charcoal/55 mt-1">{sub}</p>}
      </div>
      <p
        className={`font-heading tracking-tight tabular-nums ${
          emphasis ? "text-3xl text-charcoal" : "text-2xl text-charcoal"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ImpactArrow() {
  return (
    <div className="flex justify-center">
      <ArrowRight className="w-4 h-4 text-charcoal/25 rotate-90" />
    </div>
  );
}