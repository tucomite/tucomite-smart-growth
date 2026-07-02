import { supabase } from "@/integrations/supabase/client";

export type RuleTrigger =
  | "supplier_price_up"
  | "ingredient_expiring"
  | "dish_low_margin"
  | "supplier_better_rating"
  | "product_stale";

export type RuleAction = "auto_apply" | "create_recommendation" | "notify";

export type AutomationRule = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  trigger_type: RuleTrigger;
  trigger_config: Record<string, unknown>;
  action_type: RuleAction;
  action_config: Record<string, unknown>;
  enabled: boolean;
  last_run_at: string | null;
  runs_count: number;
};

export type TaskState =
  | "detected"
  | "analyzing"
  | "ready"
  | "scheduled"
  | "applying"
  | "applied"
  | "discarded";

export type AutomationTask = {
  id: string;
  restaurant_id: string;
  rule_id: string | null;
  recommendation_id: string | null;
  state: TaskState;
  mode: "auto" | "approval" | "scheduled";
  title: string;
  detail: string | null;
  reason: string | null;
  payload: Record<string, unknown>;
  scheduled_for: string | null;
  applied_at: string | null;
  reverted_at: string | null;
  dedupe_key: string | null;
  created_at: string;
  updated_at: string;
};

export type CommitteeLog = {
  id: string;
  restaurant_id: string;
  actor: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  result: Record<string, unknown>;
  created_at: string;
};

export type Notification = {
  id: string;
  restaurant_id: string;
  kind: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

type Ctx = {
  restaurantId: string;
  dishes: Array<{
    id: string;
    name: string;
    margin: number | null;
    monthly_sales: number | null;
    sale_price: number | null;
    cost: number | null;
  }>;
  ingredients: Array<{
    id: string;
    name: string;
    current_price: number | null;
    alternative_price: number | null;
    stock_quantity: number | null;
    unit: string | null;
    expiration_date: string | null;
    supplier_id: string | null;
    alternative_supplier_id: string | null;
  }>;
  suppliers: Array<{ id: string; name: string; rating: number | null }>;
};

type Draft = {
  dedupe: string;
  title: string;
  detail: string;
  reason: string;
  payload: Record<string, unknown>;
  economicImpact?: number;
  priority: "high" | "medium" | "low";
};

function draftsForRule(rule: AutomationRule, ctx: Ctx): Draft[] {
  const cfg = rule.trigger_config ?? {};
  const out: Draft[] = [];
  switch (rule.trigger_type) {
    case "supplier_price_up": {
      const threshold = Number((cfg as { threshold_pct?: number }).threshold_pct ?? 8) / 100;
      for (const i of ctx.ingredients) {
        const cur = Number(i.current_price ?? 0);
        const alt = Number(i.alternative_price ?? 0);
        if (cur > 0 && alt > 0 && (cur - alt) / cur >= threshold) {
          const saving = (cur - alt) * Number(i.stock_quantity ?? 0);
          out.push({
            dedupe: `sup_up:${i.id}`,
            title: `Cambia proveedor de ${i.name}`,
            detail: `Precio actual ${cur.toFixed(2)} €, alternativa ${alt.toFixed(2)} € (-${Math.round(((cur - alt) / cur) * 100)}%).`,
            reason: `Regla "${rule.name}" — diferencia supera el ${(threshold * 100).toFixed(0)}%.`,
            payload: { ingredient_id: i.id, current: cur, alternative: alt },
            economicImpact: Math.max(50, Math.round(saving)),
            priority: saving > 250 ? "high" : "medium",
          });
        }
      }
      break;
    }
    case "ingredient_expiring": {
      const days = Number((cfg as { days?: number }).days ?? 3);
      const now = Date.now();
      for (const i of ctx.ingredients) {
        if (!i.expiration_date) continue;
        const d = (new Date(i.expiration_date).getTime() - now) / 86400000;
        if (d <= days) {
          const value = Number(i.current_price ?? 0) * Number(i.stock_quantity ?? 0);
          out.push({
            dedupe: `exp:${i.id}:${i.expiration_date}`,
            title: `Promo urgente con ${i.name}`,
            detail: `Caduca en ${Math.max(0, Math.round(d))} días · ${Number(i.stock_quantity ?? 0)} ${i.unit ?? "u"} en riesgo.`,
            reason: `Regla "${rule.name}" — ventana de ${days} días.`,
            payload: { ingredient_id: i.id, days: Math.round(d), value },
            economicImpact: Math.max(30, Math.round(value)),
            priority: d <= 1 ? "high" : "medium",
          });
        }
      }
      break;
    }
    case "dish_low_margin": {
      const min = Number((cfg as { min_margin?: number }).min_margin ?? 30);
      for (const d of ctx.dishes) {
        const m = Number(d.margin ?? -1);
        if (m >= 0 && m < min) {
          const price = Number(d.sale_price ?? 0);
          const suggested = price > 0 ? +(price * (1 + (min - m) / 100)).toFixed(2) : 0;
          const monthly = (Number(d.sale_price ?? 0) - Number(d.cost ?? 0)) * Number(d.monthly_sales ?? 0);
          out.push({
            dedupe: `margin:${d.id}`,
            title: `Nuevo precio para ${d.name}`,
            detail: `Margen actual ${m.toFixed(0)}% < mínimo ${min}%. PVP sugerido ${suggested.toFixed(2)} €.`,
            reason: `Regla "${rule.name}" — margen por debajo del umbral.`,
            payload: { dish_id: d.id, current_price: price, suggested_price: suggested, current_margin: m },
            economicImpact: Math.max(80, Math.abs(Math.round(monthly * 0.15))),
            priority: m < 15 ? "high" : "medium",
          });
        }
      }
      break;
    }
    case "supplier_better_rating": {
      const delta = Number((cfg as { delta?: number }).delta ?? 0.5);
      for (const i of ctx.ingredients) {
        if (!i.supplier_id || !i.alternative_supplier_id) continue;
        const cur = ctx.suppliers.find((s) => s.id === i.supplier_id);
        const alt = ctx.suppliers.find((s) => s.id === i.alternative_supplier_id);
        if (!cur || !alt) continue;
        const diff = Number(alt.rating ?? 0) - Number(cur.rating ?? 0);
        if (diff >= delta) {
          out.push({
            dedupe: `rating:${i.id}`,
            title: `${alt.name} tiene mejor valoración para ${i.name}`,
            detail: `${alt.name} ${Number(alt.rating).toFixed(1)}★ vs ${cur.name} ${Number(cur.rating).toFixed(1)}★.`,
            reason: `Regla "${rule.name}" — diferencia ≥ ${delta} estrellas.`,
            payload: { ingredient_id: i.id, alt_supplier_id: alt.id },
            priority: "low",
          });
        }
      }
      break;
    }
    case "product_stale": {
      const minSales = Number((cfg as { min_monthly_sales?: number }).min_monthly_sales ?? 5);
      for (const d of ctx.dishes) {
        const sales = Number(d.monthly_sales ?? 0);
        if (sales <= minSales) {
          out.push({
            dedupe: `stale:${d.id}`,
            title: `${d.name} apenas se vende`,
            detail: `${sales} ventas/mes. Considera relanzarlo, moverlo de sección o retirarlo.`,
            reason: `Regla "${rule.name}" — ventas mensuales ≤ ${minSales}.`,
            payload: { dish_id: d.id, monthly_sales: sales },
            economicImpact: 60,
            priority: "low",
          });
        }
      }
      break;
    }
  }
  return out;
}

/** Evaluate all enabled rules and materialize new tasks (+ recommendations + notifications). */
export async function runAutomations(ctx: Ctx): Promise<{ created: number; skipped: number }> {
  const { data: rules } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("restaurant_id", ctx.restaurantId)
    .eq("enabled", true);
  if (!rules || rules.length === 0) return { created: 0, skipped: 0 };

  const { data: existing } = await supabase
    .from("automation_tasks")
    .select("dedupe_key,state")
    .eq("restaurant_id", ctx.restaurantId);
  const openKeys = new Set(
    (existing ?? [])
      .filter((t) => t.state !== "discarded" && t.state !== "applied")
      .map((t) => t.dedupe_key),
  );

  let created = 0;
  let skipped = 0;
  for (const rule of rules as AutomationRule[]) {
    const drafts = draftsForRule(rule, ctx);
    for (const d of drafts) {
      if (openKeys.has(d.dedupe)) {
        skipped += 1;
        continue;
      }
      const mode: AutomationTask["mode"] =
        rule.action_type === "auto_apply" ? "auto" : "approval";
      const initialState: TaskState = mode === "auto" ? "applying" : "ready";

      let recommendation_id: string | null = null;
      if (rule.action_type === "create_recommendation" || rule.action_type === "auto_apply") {
        const { data: rec } = await supabase
          .from("recommendations")
          .insert({
            restaurant_id: ctx.restaurantId,
            title: d.title,
            problem: d.detail,
            cause: d.reason,
            solution: d.detail,
            economic_impact: d.economicImpact ?? null,
            priority: d.priority,
            status: mode === "auto" ? "applied" : "pending",
            automation_state: initialState,
            automation_mode: mode,
          })
          .select("id")
          .maybeSingle();
        recommendation_id = rec?.id ?? null;
      }
      if (rule.action_type === "notify" || rule.action_type === "auto_apply") {
        await supabase.from("notifications").insert({
          restaurant_id: ctx.restaurantId,
          kind: rule.trigger_type,
          severity: d.priority === "high" ? "critical" : d.priority === "medium" ? "warning" : "info",
          title: d.title,
          body: d.detail,
          link: recommendation_id ? `/comite?rec=${recommendation_id}` : null,
        });
      }
      const { error } = await supabase.from("automation_tasks").insert({
        restaurant_id: ctx.restaurantId,
        rule_id: rule.id,
        recommendation_id,
        state: mode === "auto" ? "applied" : "ready",
        mode,
        title: d.title,
        detail: d.detail,
        reason: d.reason,
        payload: d.payload as never,
        dedupe_key: d.dedupe,
        applied_at: mode === "auto" ? new Date().toISOString() : null,
      });
      if (!error) {
        created += 1;
        await supabase.from("committee_log").insert({
          restaurant_id: ctx.restaurantId,
          actor: "comite",
          action: mode === "auto" ? "auto_apply" : "detect",
          target_type: "automation_task",
          reason: d.reason,
          result: { title: d.title, mode, priority: d.priority },
        });
      }
    }
    await supabase
      .from("automation_rules")
      .update({ last_run_at: new Date().toISOString(), runs_count: rule.runs_count + 1 })
      .eq("id", rule.id);
  }
  return { created, skipped };
}

export async function approveTask(task: AutomationTask) {
  await supabase
    .from("automation_tasks")
    .update({ state: "applied", applied_at: new Date().toISOString() })
    .eq("id", task.id);
  if (task.recommendation_id) {
    await supabase
      .from("recommendations")
      .update({ status: "applied", automation_state: "applied" })
      .eq("id", task.recommendation_id);
  }
  await supabase.from("committee_log").insert({
    restaurant_id: task.restaurant_id,
    actor: "user",
    action: "approve",
    target_type: "automation_task",
    target_id: task.id,
    reason: task.reason,
    result: { title: task.title },
  });
}

export async function revertTask(task: AutomationTask) {
  await supabase
    .from("automation_tasks")
    .update({ state: "discarded", reverted_at: new Date().toISOString() })
    .eq("id", task.id);
  if (task.recommendation_id) {
    await supabase
      .from("recommendations")
      .update({ status: "pending", automation_state: "discarded" })
      .eq("id", task.recommendation_id);
  }
  await supabase.from("committee_log").insert({
    restaurant_id: task.restaurant_id,
    actor: "user",
    action: "revert",
    target_type: "automation_task",
    target_id: task.id,
    reason: task.reason,
    result: { title: task.title },
  });
}

export async function scheduleTask(task: AutomationTask, whenISO: string) {
  await supabase
    .from("automation_tasks")
    .update({ state: "scheduled", scheduled_for: whenISO, mode: "scheduled" })
    .eq("id", task.id);
  await supabase.from("committee_log").insert({
    restaurant_id: task.restaurant_id,
    actor: "user",
    action: "schedule",
    target_type: "automation_task",
    target_id: task.id,
    result: { scheduled_for: whenISO },
  });
}

export async function duplicateTask(task: AutomationTask) {
  const stamp = Date.now();
  await supabase.from("automation_tasks").insert({
    restaurant_id: task.restaurant_id,
    rule_id: task.rule_id,
    recommendation_id: null,
    state: "ready",
    mode: "approval",
    title: `${task.title} (copia)`,
    detail: task.detail,
    reason: `Duplicada de tarea original`,
    payload: task.payload as never,
    dedupe_key: `${task.dedupe_key ?? task.id}:dup:${stamp}`,
  });
}

export async function updateTask(task: AutomationTask, patch: Partial<Pick<AutomationTask, "title" | "detail">>) {
  await supabase.from("automation_tasks").update(patch).eq("id", task.id);
}

export async function markNotificationRead(id: string) {
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}

export const TRIGGER_LABELS: Record<RuleTrigger, string> = {
  supplier_price_up: "Proveedor sube de precio",
  ingredient_expiring: "Ingrediente próximo a caducar",
  dish_low_margin: "Plato bajo margen mínimo",
  supplier_better_rating: "Proveedor con mejor valoración",
  product_stale: "Producto sin ventas",
};

export const ACTION_LABELS: Record<RuleAction, string> = {
  auto_apply: "Aplicar automáticamente",
  create_recommendation: "Crear recomendación (esperar aprobación)",
  notify: "Solo notificar",
};

export const STATE_LABELS: Record<TaskState, string> = {
  detected: "Detectada",
  analyzing: "Analizando",
  ready: "Lista",
  scheduled: "Programada",
  applying: "Aplicándose",
  applied: "Aplicada",
  discarded: "Descartada",
};