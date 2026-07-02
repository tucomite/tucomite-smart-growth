import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, ArrowUpRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/carta/")({
  head: () => ({ meta: [{ title: "Carta — TuComité" }] }),
  component: CartaPage,
});

type DishRow = {
  id: string;
  name: string;
  category: string | null;
  sale_price: number | null;
  cost: number | null;
  margin: number | null;
  target_margin: number | null;
  status: string | null;
};

type Ing = { dish_id: string; ingredients: { name: string } | null };

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function statusFor(margin: number | null, target: number | null) {
  const m = Number(margin ?? 0);
  const t = Number(target ?? 65);
  if (m >= t - 3) return { label: "Excelente", tone: "green" as const };
  if (m >= t - 15) return { label: "Aceptable", tone: "amber" as const };
  return { label: "Riesgo", tone: "red" as const };
}

function categoryEmoji(name: string) {
  const n = name.toLowerCase();
  if (n.includes("gamba") || n.includes("marisco")) return "🍤";
  if (n.includes("entrecot") || n.includes("carne") || n.includes("solomillo")) return "🥩";
  if (n.includes("merluza") || n.includes("pescado") || n.includes("bacalao")) return "🐟";
  if (n.includes("ensalada") || n.includes("tomate")) return "🥗";
  if (n.includes("croqueta") || n.includes("tapa")) return "🥟";
  if (n.includes("tarta") || n.includes("postre") || n.includes("queso al horno")) return "🍰";
  if (n.includes("pasta")) return "🍝";
  if (n.includes("pizza")) return "🍕";
  return "🍽";
}

function CartaPage() {
  const [dishes, setDishes] = useState<DishRow[]>([]);
  const [ings, setIngs] = useState<Ing[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", userData.user.id)
        .maybeSingle();
      const rid = profile?.restaurant_id ?? null;
      setRestaurantId(rid);
      if (!rid) {
        setLoading(false);
        return;
      }
      const [{ data: d }, { data: di }] = await Promise.all([
        supabase
          .from("dishes")
          .select("id,name,category,sale_price,cost,margin,target_margin,status")
          .eq("restaurant_id", rid)
          .order("name"),
        supabase
          .from("dish_ingredients")
          .select("dish_id, ingredients(name)")
          .eq("restaurant_id", rid),
      ]);
      setDishes((d ?? []) as DishRow[]);
      setIngs((di ?? []) as unknown as Ing[]);
      setLoading(false);
    })();
  }, []);

  const ingByDish = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of ings) {
      const name = row.ingredients?.name;
      if (!name) continue;
      const arr = map.get(row.dish_id) ?? [];
      arr.push(name);
      map.set(row.dish_id, arr);
    }
    return map;
  }, [ings]);

  const filtered = useMemo(
    () =>
      dishes.filter((d) =>
        q.trim() ? d.name.toLowerCase().includes(q.toLowerCase()) : true,
      ),
    [dishes, q],
  );

  async function createDish() {
    if (!restaurantId) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("dishes")
      .insert({
        restaurant_id: restaurantId,
        name: "Nuevo plato",
        category: "Sin categoría",
        sale_price: 0,
        cost: 0,
        margin: 0,
        status: "draft",
      })
      .select("id,name,category,sale_price,cost,margin,target_margin,status")
      .maybeSingle();
    setCreating(false);
    if (error || !data) {
      toast.error("No se pudo crear el plato");
      return;
    }
    setDishes((prev) => [data as DishRow, ...prev]);
    toast.success("Plato creado");
  }

  return (
    <AppShell
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Carta viva
        </span>
      }
    >
      <div className="px-6 sm:px-10 lg:px-16 py-12 sm:py-16 max-w-6xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">
              Módulo · Carta
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl text-charcoal mt-3 tracking-tight leading-[1.05]">
              Carta
            </h1>
            <p className="text-charcoal/60 text-lg mt-3 max-w-xl">
              Gestiona todos los platos de tu restaurante.
            </p>
          </div>
          <button
            onClick={createDish}
            disabled={creating || !restaurantId}
            className="inline-flex items-center gap-2 bg-charcoal text-cream px-5 h-11 rounded-lg text-sm font-medium hover:bg-charcoal/90 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Añadir plato
          </button>
        </motion.header>

        <div className="mt-10 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar en la carta…"
              className="w-full h-11 pl-9 pr-3 rounded-lg bg-white border border-charcoal/10 text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:border-charcoal/30 transition-colors"
            />
          </div>
          <span className="text-xs uppercase tracking-[0.15em] text-charcoal/40 ml-auto">
            {filtered.length} platos
          </span>
        </div>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {loading &&
            [0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl border border-charcoal/10 bg-white/60 animate-pulse"
              />
            ))}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-charcoal/15 bg-white/60 p-12 text-center">
              <p className="text-charcoal/60">
                Aún no hay platos en tu carta. Añade el primero para que el Comité empiece a analizarlo.
              </p>
            </div>
          )}
          {!loading &&
            filtered.map((d, i) => (
              <DishCard
                key={d.id}
                dish={d}
                ingredients={ingByDish.get(d.id) ?? []}
                index={i}
              />
            ))}
        </section>
      </div>
    </AppShell>
  );
}

function DishCard({
  dish,
  ingredients,
  index,
}: {
  dish: DishRow;
  ingredients: string[];
  index: number;
}) {
  const s = statusFor(dish.margin, dish.target_margin);
  const dot =
    s.tone === "green"
      ? "bg-emerald-500"
      : s.tone === "amber"
        ? "bg-amber-500"
        : "bg-red-500";
  const emoji = categoryEmoji(dish.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to="/carta/$dishId"
        params={{ dishId: dish.id }}
        className="group block rounded-2xl border border-charcoal/10 bg-white hover:border-charcoal/25 hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.15)] transition-all overflow-hidden"
      >
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl leading-none">{emoji}</span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40 font-medium">
                  {dish.category || "Plato"}
                </p>
                <h3 className="font-heading text-xl text-charcoal tracking-tight mt-0.5 truncate">
                  {dish.name}
                </h3>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-charcoal/30 group-hover:text-charcoal transition-colors shrink-0" />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Metric label="PVP" value={dish.sale_price != null ? currency.format(Number(dish.sale_price)) : "—"} />
            <Metric label="Coste" value={dish.cost != null ? currency.format(Number(dish.cost)) : "—"} />
            <Metric
              label="Margen"
              value={dish.margin != null ? `${Number(dish.margin).toFixed(0)}%` : "—"}
            />
          </div>

          <div className="mt-5 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs text-charcoal/70`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              {s.label}
            </span>
          </div>

          {ingredients.length > 0 && (
            <div className="mt-5 pt-5 border-t border-charcoal/10">
              <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40 mb-2">
                Ingredientes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ingredients.slice(0, 5).map((n) => (
                  <span
                    key={n}
                    className="text-xs text-charcoal/70 bg-charcoal/[0.05] rounded-full px-2.5 py-1"
                  >
                    {n}
                  </span>
                ))}
                {ingredients.length > 5 && (
                  <span className="text-xs text-charcoal/50 px-1">+{ingredients.length - 5}</span>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 text-sm text-charcoal group-hover:text-charcoal font-medium inline-flex items-center gap-1.5">
            Ver análisis
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-charcoal/40">{label}</p>
      <p className="font-heading text-lg text-charcoal tracking-tight mt-0.5">{value}</p>
    </div>
  );
}