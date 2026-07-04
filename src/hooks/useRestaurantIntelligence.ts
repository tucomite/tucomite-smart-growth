import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedRestaurantId, setCachedRestaurantId } from "@/lib/tenant-cache";

export type Dish = {
  id: string;
  name: string;
  category: string | null;
  sale_price: number | null;
  cost: number | null;
  margin: number | null;
  target_margin: number | null;
  monthly_sales: number | null;
  popularity: number | null;
  recommended_price: number | null;
  status: string | null;
};

export type Ingredient = {
  id: string;
  name: string;
  unit: string | null;
  current_price: number | null;
  alternative_price: number | null;
  stock_quantity: number | null;
  stock_minimum: number | null;
  expiration_date: string | null;
  supplier_id: string | null;
  alternative_supplier_id: string | null;
};

export type Supplier = {
  id: string;
  name: string;
  rating: number | null;
};

export type Recommendation = {
  id: string;
  title: string;
  problem: string | null;
  cause: string | null;
  solution: string | null;
  economic_impact: number | null;
  time_impact: string | null;
  priority: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

export type CommitteeActivity = {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  created_at: string;
};

export type DailySnapshot = {
  id: string;
  date: string;
  saved_detected: number;
  saved_applied: number;
  recs_applied: number;
  recs_pending: number;
  avg_margin: number;
  stock_value: number;
  waste_estimate: number;
};

export type Intelligence = {
  loading: boolean;
  restaurantId: string | null;
  restaurantName: string;
  userName: string;
  dishes: Dish[];
  ingredients: Ingredient[];
  suppliers: Supplier[];
  recommendations: Recommendation[];
  activity: CommitteeActivity[];
  snapshots: DailySnapshot[];
  kpis: {
    avgMargin: number;
    monthlyRevenue: number;
    monthlyProfit: number;
    savedDetected: number;
    savedApplied: number;
    pendingCount: number;
    appliedCount: number;
    expiringCount: number;
    expiringValue: number;
    stockValue: number;
    supplierSavings: number;
    lowMarginDishes: Dish[];
    topSellers: Dish[];
    healthScore: number;
    healthState: "Excelente" | "Bueno" | "Mejorable" | "Crítico";
    healthPillars: { key: string; label: string; score: number; delta: number }[];
  };
  refresh: () => Promise<void>;
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

export function useRestaurantIntelligence(): Intelligence {
  // P2: un único objeto de estado → un solo re-render por carga (evita 6-8 setState en cascada).
  type State = {
    loading: boolean;
    restaurantId: string | null;
    restaurantName: string;
    userName: string;
    dishes: Dish[];
    ingredients: Ingredient[];
    suppliers: Supplier[];
    recommendations: Recommendation[];
    activity: CommitteeActivity[];
    snapshots: DailySnapshot[];
  };
  const [state, setState] = useState<State>({
    loading: true,
    restaurantId: null,
    restaurantName: "",
    userName: "",
    dishes: [],
    ingredients: [],
    suppliers: [],
    recommendations: [],
    activity: [],
    snapshots: [],
  });

  // Refresh selectivo por tabla; evita recargar 8 queries cuando cambia sólo una.
  const ridRef = useRef<string | null>(null);

  const refetchDishes = useCallback(async (rid: string) => {
    const { data } = await supabase
      .from("dishes")
      .select(
        "id,name,category,sale_price,cost,margin,target_margin,monthly_sales,popularity,recommended_price,status",
      )
      .eq("restaurant_id", rid);
    setState((s) => (s.restaurantId === rid ? { ...s, dishes: (data ?? []) as Dish[] } : s));
  }, []);

  const refetchIngredients = useCallback(async (rid: string) => {
    const { data } = await supabase
      .from("ingredients")
      .select(
        "id,name,unit,current_price,alternative_price,stock_quantity,stock_minimum,expiration_date,supplier_id,alternative_supplier_id",
      )
      .eq("restaurant_id", rid);
    setState((s) =>
      s.restaurantId === rid ? { ...s, ingredients: (data ?? []) as Ingredient[] } : s,
    );
  }, []);

  const refetchSuppliers = useCallback(async (rid: string) => {
    const { data } = await supabase
      .from("suppliers")
      .select("id,name,rating")
      .eq("restaurant_id", rid);
    setState((s) => (s.restaurantId === rid ? { ...s, suppliers: (data ?? []) as Supplier[] } : s));
  }, []);

  const refetchRecommendations = useCallback(async (rid: string) => {
    const { data } = await supabase
      .from("recommendations")
      .select(
        "id,title,problem,cause,solution,economic_impact,time_impact,priority,status,created_at,updated_at",
      )
      .eq("restaurant_id", rid)
      .order("economic_impact", { ascending: false, nullsFirst: false });
    setState((s) =>
      s.restaurantId === rid
        ? { ...s, recommendations: (data ?? []) as Recommendation[] }
        : s,
    );
  }, []);

  const refetchActivity = useCallback(async (rid: string) => {
    const { data } = await supabase
      .from("committee_activity")
      .select("id,title,description,type,created_at")
      .eq("restaurant_id", rid)
      .order("created_at", { ascending: false })
      .limit(30);
    setState((s) =>
      s.restaurantId === rid ? { ...s, activity: (data ?? []) as CommitteeActivity[] } : s,
    );
  }, []);

  const refetchSnapshots = useCallback(async (rid: string) => {
    const { data } = await supabase
      .from("daily_snapshots")
      .select(
        "id,date,saved_detected,saved_applied,recs_applied,recs_pending,avg_margin,stock_value,waste_estimate",
      )
      .eq("restaurant_id", rid)
      .order("date", { ascending: true })
      .limit(60);
    setState((s) =>
      s.restaurantId === rid ? { ...s, snapshots: (data ?? []) as DailySnapshot[] } : s,
    );
  }, []);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    // Cache de tenant: si ya conocemos rid para este user, pedimos sólo full_name.
    const cachedRid = getCachedRestaurantId(user.id);
    const profileQuery = cachedRid
      ? supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      : supabase
          .from("profiles")
          .select("full_name, restaurant_id")
          .eq("id", user.id)
          .maybeSingle();
    const { data: profile } = await profileQuery;
    const rid =
      cachedRid ??
      ((profile as { restaurant_id?: string | null } | null)?.restaurant_id ?? null);
    const userName = profile?.full_name || user.email || "";
    if (rid && !cachedRid) setCachedRestaurantId(user.id, rid);
    ridRef.current = rid;
    if (!rid) {
      setState((s) => ({ ...s, loading: false, userName, restaurantId: null }));
      return;
    }
    const [r, d, i, s, rec, act, snap] = await Promise.all([
      supabase.from("restaurants").select("name").eq("id", rid).maybeSingle(),
      supabase
        .from("dishes")
        .select(
          "id,name,category,sale_price,cost,margin,target_margin,monthly_sales,popularity,recommended_price,status",
        )
        .eq("restaurant_id", rid),
      supabase
        .from("ingredients")
        .select(
          "id,name,unit,current_price,alternative_price,stock_quantity,stock_minimum,expiration_date,supplier_id,alternative_supplier_id",
        )
        .eq("restaurant_id", rid),
      supabase.from("suppliers").select("id,name,rating").eq("restaurant_id", rid),
      supabase
        .from("recommendations")
        .select(
          "id,title,problem,cause,solution,economic_impact,time_impact,priority,status,created_at,updated_at",
        )
        .eq("restaurant_id", rid)
        .order("economic_impact", { ascending: false, nullsFirst: false }),
      supabase
        .from("committee_activity")
        .select("id,title,description,type,created_at")
        .eq("restaurant_id", rid)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("daily_snapshots")
        .select(
          "id,date,saved_detected,saved_applied,recs_applied,recs_pending,avg_margin,stock_value,waste_estimate",
        )
        .eq("restaurant_id", rid)
        .order("date", { ascending: true })
        .limit(60),
    ]);
    setState({
      loading: false,
      restaurantId: rid,
      restaurantName: r.data?.name || "",
      userName,
      dishes: (d.data ?? []) as Dish[],
      ingredients: (i.data ?? []) as Ingredient[],
      suppliers: (s.data ?? []) as Supplier[],
      recommendations: (rec.data ?? []) as Recommendation[],
      activity: (act.data ?? []) as CommitteeActivity[],
      snapshots: (snap.data ?? []) as DailySnapshot[],
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime — refresh selectivo con debounce (250ms) para colapsar avalanchas
  // (p.ej. aplicar factura → N UPDATE ingredients → un solo refetch).
  const restaurantId = state.restaurantId;
  useEffect(() => {
    if (!restaurantId) return;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const schedule = (table: string, fn: () => void) => {
      const prev = timers.get(table);
      if (prev) clearTimeout(prev);
      timers.set(
        table,
        setTimeout(() => {
          timers.delete(table);
          fn();
        }, 250),
      );
    };
    const channel = supabase
      .channel(`rt-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recommendations", filter: `restaurant_id=eq.${restaurantId}` },
        () => schedule("recommendations", () => refetchRecommendations(restaurantId)),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dishes", filter: `restaurant_id=eq.${restaurantId}` },
        () => schedule("dishes", () => refetchDishes(restaurantId)),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ingredients", filter: `restaurant_id=eq.${restaurantId}` },
        () => schedule("ingredients", () => refetchIngredients(restaurantId)),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers", filter: `restaurant_id=eq.${restaurantId}` },
        () => schedule("suppliers", () => refetchSuppliers(restaurantId)),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "committee_activity", filter: `restaurant_id=eq.${restaurantId}` },
        () => schedule("committee_activity", () => refetchActivity(restaurantId)),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_snapshots", filter: `restaurant_id=eq.${restaurantId}` },
        () => schedule("daily_snapshots", () => refetchSnapshots(restaurantId)),
      )
      .subscribe();
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      supabase.removeChannel(channel);
    };
  }, [
    restaurantId,
    refetchDishes,
    refetchIngredients,
    refetchSuppliers,
    refetchRecommendations,
    refetchActivity,
    refetchSnapshots,
  ]);

  const { loading, restaurantName, userName, dishes, ingredients, suppliers, recommendations, activity, snapshots } = state;

  const kpis = useMemo(() => {
    const withMargin = dishes.filter((d) => d.margin != null);
    const avgMargin =
      withMargin.length > 0
        ? withMargin.reduce((s, d) => s + Number(d.margin ?? 0), 0) / withMargin.length
        : 0;
    const monthlyRevenue = dishes.reduce(
      (s, d) => s + Number(d.sale_price ?? 0) * Number(d.monthly_sales ?? 0),
      0,
    );
    const monthlyProfit = dishes.reduce(
      (s, d) =>
        s + (Number(d.sale_price ?? 0) - Number(d.cost ?? 0)) * Number(d.monthly_sales ?? 0),
      0,
    );
    const pending = recommendations.filter((r) => r.status !== "applied");
    const applied = recommendations.filter((r) => r.status === "applied");
    const savedDetected = pending.reduce((s, r) => s + Number(r.economic_impact ?? 0), 0);
    const savedApplied = applied.reduce((s, r) => s + Number(r.economic_impact ?? 0), 0);

    const now = Date.now();
    const expiring = ingredients.filter((i) => {
      if (!i.expiration_date) return false;
      const days = (new Date(i.expiration_date).getTime() - now) / 86400000;
      return days <= 3;
    });
    const expiringValue = expiring.reduce(
      (s, i) => s + Number(i.current_price ?? 0) * Number(i.stock_quantity ?? 0),
      0,
    );
    const stockValue = ingredients.reduce(
      (s, i) => s + Number(i.current_price ?? 0) * Number(i.stock_quantity ?? 0),
      0,
    );
    const supplierSavings = ingredients.reduce((s, i) => {
      const cur = Number(i.current_price ?? 0);
      const alt = Number(i.alternative_price ?? 0);
      if (alt > 0 && alt < cur) return s + (cur - alt) * Number(i.stock_quantity ?? 0);
      return s;
    }, 0);
    const lowMarginDishes = [...withMargin]
      .filter((d) => Number(d.margin ?? 0) < Number(d.target_margin ?? 55) - 10)
      .sort((a, b) => Number(a.margin ?? 0) - Number(b.margin ?? 0));
    const topSellers = [...dishes]
      .filter((d) => (d.monthly_sales ?? 0) > 0)
      .sort((a, b) => (b.monthly_sales ?? 0) - (a.monthly_sales ?? 0))
      .slice(0, 3);

    // Health calculation
    const avgRating =
      suppliers.length > 0
        ? suppliers.reduce((s, x) => s + Number(x.rating ?? 0), 0) / suppliers.length
        : 4;
    const withAlt = ingredients.filter((i) => i.alternative_price != null).length;
    const rentabilidad = clamp(Math.round((avgMargin / 70) * 100 - lowMarginDishes.length * 4));
    const compras = clamp(Math.round((avgRating / 5) * 60 + (withAlt / Math.max(1, ingredients.length)) * 40));
    const stock = clamp(Math.round(100 - expiring.length * 12));
    const marketing = clamp(Math.round(60 + Math.min(30, applied.length * 5)));
    const operativa = clamp(
      Math.round(100 - pending.length * 4 + Math.min(15, applied.length * 3)),
    );
    const healthScore = Math.round((rentabilidad + compras + stock + marketing + operativa) / 5);
    const healthState =
      healthScore >= 85 ? "Excelente" : healthScore >= 70 ? "Bueno" : healthScore >= 50 ? "Mejorable" : "Crítico";

    // Deltas from snapshots (last vs 7 days ago)
    const last = snapshots[snapshots.length - 1];
    const prior = snapshots.length > 7 ? snapshots[snapshots.length - 8] : snapshots[0];
    const marginDelta = last && prior ? Math.round(Number(last.avg_margin) - Number(prior.avg_margin)) : 0;
    const stockDelta = last && prior ? Math.round(((Number(last.stock_value) - Number(prior.stock_value)) / Math.max(1, Number(prior.stock_value))) * 100) : 0;

    return {
      avgMargin,
      monthlyRevenue,
      monthlyProfit,
      savedDetected,
      savedApplied,
      pendingCount: pending.length,
      appliedCount: applied.length,
      expiringCount: expiring.length,
      expiringValue,
      stockValue,
      supplierSavings,
      lowMarginDishes,
      topSellers,
      healthScore,
      healthState: healthState as Intelligence["kpis"]["healthState"],
      healthPillars: [
        { key: "rent", label: "Rentabilidad", score: rentabilidad, delta: marginDelta },
        { key: "com", label: "Compras", score: compras, delta: withAlt > 0 ? 2 : -1 },
        { key: "stk", label: "Stock", score: stock, delta: -stockDelta },
        { key: "mkt", label: "Marketing", score: marketing, delta: applied.length },
        { key: "op", label: "Operativa", score: operativa, delta: applied.length - Math.min(3, pending.length) },
      ],
    };
  }, [dishes, ingredients, recommendations, suppliers, snapshots]);

  return {
    loading,
    restaurantId,
    restaurantName,
    userName,
    dishes,
    ingredients,
    suppliers,
    recommendations,
    activity,
    snapshots,
    kpis,
    refresh: load,
  };
}