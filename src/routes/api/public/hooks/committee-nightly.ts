import { createFileRoute } from "@tanstack/react-router";
import { verifyHmacRequest } from "@/lib/security/hmac";
import { recordAuditEvent, auditContextFromRequest } from "@/lib/security/audit";

// Nightly job: run automations for every restaurant + build morning/night briefs.
// Called by pg_cron with an apikey header. No user auth — service role.

type DBIng = {
  id: string;
  name: string;
  current_price: number | null;
  alternative_price: number | null;
  stock_quantity: number | null;
  unit: string | null;
  expiration_date: string | null;
  supplier_id: string | null;
  alternative_supplier_id: string | null;
};

export const Route = createFileRoute("/api/public/hooks/committee-nightly")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        const ctx = auditContextFromRequest(request);
        // --- HMAC auth (anti-replay, anti-tamper) ---
        const secret = process.env.HOOK_HMAC_SECRET;
        const { result, rawBody: _rawBody } = await verifyHmacRequest(request, secret);
        if (!result.ok) {
          console.warn("[committee-nightly] hmac_denied", { code: result.code });
          await recordAuditEvent({
            event_type: "hmac_denied",
            severity: "warning",
            source: "committee_nightly",
            actor: "anonymous",
            result: "denied",
            status_code: result.status,
            method: ctx.method,
            endpoint: ctx.endpoint,
            ip: ctx.ip,
            user_agent: ctx.user_agent,
            request_id: ctx.request_id,
            correlation_id: ctx.correlation_id,
            metadata: { code: result.code },
          });
          return new Response(JSON.stringify({ error: result.code }), {
            status: result.status,
            headers: { "content-type": "application/json" },
          });
        }
        void _rawBody;

        const url = new URL(request.url);
        const mode = url.searchParams.get("mode") ?? "nightly"; // nightly | morning | weekly
        await recordAuditEvent({
          event_type: "committee_nightly_started",
          severity: "info",
          source: "committee_nightly",
          actor: "cron",
          result: "success",
          method: ctx.method,
          endpoint: ctx.endpoint,
          ip: ctx.ip,
          request_id: ctx.request_id,
          correlation_id: ctx.correlation_id,
          metadata: { mode },
        });
        try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: restaurants } = await supabaseAdmin
          .from("restaurants")
          .select("id,name");
        if (!restaurants) return Response.json({ ok: true, restaurants: 0 });

        let totalTasks = 0;
        let totalBriefs = 0;

        for (const r of restaurants) {
          const [rules, dishes, ingredients, suppliers, recs, existing] = await Promise.all([
            supabaseAdmin.from("automation_rules").select("*").eq("restaurant_id", r.id).eq("enabled", true),
            supabaseAdmin.from("dishes").select("id,name,margin,monthly_sales,sale_price,cost").eq("restaurant_id", r.id),
            supabaseAdmin
              .from("ingredients")
              .select("id,name,current_price,alternative_price,stock_quantity,unit,expiration_date,supplier_id,alternative_supplier_id")
              .eq("restaurant_id", r.id),
            supabaseAdmin.from("suppliers").select("id,name,rating").eq("restaurant_id", r.id),
            supabaseAdmin.from("recommendations").select("id,status,economic_impact").eq("restaurant_id", r.id),
            supabaseAdmin.from("automation_tasks").select("dedupe_key,state").eq("restaurant_id", r.id),
          ]);

          const openKeys = new Set(
            (existing.data ?? [])
              .filter((t) => t.state !== "applied" && t.state !== "discarded")
              .map((t) => t.dedupe_key),
          );

          for (const rule of rules.data ?? []) {
            const drafts = buildDrafts(
              rule as never,
              (dishes.data ?? []) as never,
              (ingredients.data ?? []) as DBIng[],
              (suppliers.data ?? []) as never,
            );
            for (const d of drafts) {
              if (openKeys.has(d.dedupe)) continue;
              const isAuto = rule.action_type === "auto_apply";
              let recId: string | null = null;
              if (rule.action_type !== "notify") {
                const { data: rec } = await supabaseAdmin
                  .from("recommendations")
                  .insert({
                    restaurant_id: r.id,
                    title: d.title,
                    problem: d.detail,
                    cause: d.reason,
                    solution: d.detail,
                    economic_impact: d.economicImpact ?? null,
                    priority: d.priority,
                    status: isAuto ? "applied" : "pending",
                    automation_state: isAuto ? "applied" : "ready",
                    automation_mode: isAuto ? "auto" : "approval",
                  })
                  .select("id")
                  .maybeSingle();
                recId = rec?.id ?? null;
              }
              if (rule.action_type === "notify" || isAuto) {
                await supabaseAdmin.from("notifications").insert({
                  restaurant_id: r.id,
                  kind: rule.trigger_type,
                  severity: d.priority === "high" ? "critical" : d.priority === "medium" ? "warning" : "info",
                  title: d.title,
                  body: d.detail,
                });
              }
              await supabaseAdmin.from("automation_tasks").insert({
                restaurant_id: r.id,
                rule_id: rule.id,
                recommendation_id: recId,
                state: isAuto ? "applied" : "ready",
                mode: isAuto ? "auto" : "approval",
                title: d.title,
                detail: d.detail,
                reason: d.reason,
                payload: d.payload as never,
                dedupe_key: d.dedupe,
                applied_at: isAuto ? new Date().toISOString() : null,
              });
              await supabaseAdmin.from("committee_log").insert({
                restaurant_id: r.id,
                actor: "comite",
                action: isAuto ? "auto_apply" : "detect",
                target_type: "automation_task",
                reason: d.reason,
                result: { title: d.title, mode: isAuto ? "auto" : "approval" },
              });
              totalTasks += 1;
            }
            await supabaseAdmin
              .from("automation_rules")
              .update({ last_run_at: new Date().toISOString(), runs_count: (rule.runs_count ?? 0) + 1 })
              .eq("id", rule.id);
          }

          // Build brief
          const pending = (recs.data ?? []).filter((x) => x.status !== "applied");
          const applied = (recs.data ?? []).filter((x) => x.status === "applied");
          const savedDetected = pending.reduce((s, x) => s + Number(x.economic_impact ?? 0), 0);
          const savedApplied = applied.reduce((s, x) => s + Number(x.economic_impact ?? 0), 0);
          const today = new Date().toISOString().slice(0, 10);
          const headlines: Record<string, string> = {
            morning: `Buenos días. ${pending.length} decisión(es) esperan tu revisión hoy.`,
            nightly: `Mientras dormías: ${totalTasks} tarea(s) nuevas detectadas.`,
            weekly: `Semana cerrada: ${applied.length} acciones aplicadas · ${Math.round(savedApplied)} € generados.`,
          };
          await supabaseAdmin
            .from("committee_briefs")
            .upsert(
              {
                restaurant_id: r.id,
                period: mode,
                brief_date: today,
                headline: headlines[mode] ?? headlines.nightly,
                body: `Pendientes: ${pending.length} · Aplicadas: ${applied.length} · Ahorro detectado: ${Math.round(savedDetected)} €`,
                metrics: {
                  pending: pending.length,
                  applied: applied.length,
                  saved_detected: savedDetected,
                  saved_applied: savedApplied,
                  new_tasks: totalTasks,
                },
              },
              { onConflict: "restaurant_id,period,brief_date" },
            );
          totalBriefs += 1;
        }

        return Response.json({ ok: true, mode, restaurants: restaurants.length, tasks: totalTasks, briefs: totalBriefs });
      },
    },
  },
});

// --- Draft builders (mirror of client-side automation.ts) ---

type Draft = {
  dedupe: string;
  title: string;
  detail: string;
  reason: string;
  payload: Record<string, unknown>;
  economicImpact?: number;
  priority: "high" | "medium" | "low";
};

function buildDrafts(
  rule: { trigger_type: string; trigger_config: Record<string, unknown>; name: string },
  dishes: Array<{ id: string; name: string; margin: number | null; monthly_sales: number | null; sale_price: number | null; cost: number | null }>,
  ingredients: DBIng[],
  suppliers: Array<{ id: string; name: string; rating: number | null }>,
): Draft[] {
  const cfg = rule.trigger_config ?? {};
  const out: Draft[] = [];
  const now = Date.now();
  switch (rule.trigger_type) {
    case "supplier_price_up": {
      const thr = Number((cfg as { threshold_pct?: number }).threshold_pct ?? 8) / 100;
      for (const i of ingredients) {
        const cur = Number(i.current_price ?? 0);
        const alt = Number(i.alternative_price ?? 0);
        if (cur > 0 && alt > 0 && (cur - alt) / cur >= thr) {
          const saving = (cur - alt) * Number(i.stock_quantity ?? 0);
          out.push({
            dedupe: `sup_up:${i.id}`,
            title: `Cambia proveedor de ${i.name}`,
            detail: `Precio actual ${cur.toFixed(2)} €, alternativa ${alt.toFixed(2)} €.`,
            reason: `Regla "${rule.name}".`,
            payload: { ingredient_id: i.id },
            economicImpact: Math.max(50, Math.round(saving)),
            priority: saving > 250 ? "high" : "medium",
          });
        }
      }
      break;
    }
    case "ingredient_expiring": {
      const days = Number((cfg as { days?: number }).days ?? 3);
      for (const i of ingredients) {
        if (!i.expiration_date) continue;
        const d = (new Date(i.expiration_date).getTime() - now) / 86400000;
        if (d <= days) {
          const value = Number(i.current_price ?? 0) * Number(i.stock_quantity ?? 0);
          out.push({
            dedupe: `exp:${i.id}:${i.expiration_date}`,
            title: `Promo urgente con ${i.name}`,
            detail: `Caduca en ${Math.max(0, Math.round(d))} días.`,
            reason: `Regla "${rule.name}".`,
            payload: { ingredient_id: i.id },
            economicImpact: Math.max(30, Math.round(value)),
            priority: d <= 1 ? "high" : "medium",
          });
        }
      }
      break;
    }
    case "dish_low_margin": {
      const min = Number((cfg as { min_margin?: number }).min_margin ?? 30);
      for (const d of dishes) {
        const m = Number(d.margin ?? -1);
        if (m >= 0 && m < min) {
          const price = Number(d.sale_price ?? 0);
          const suggested = price > 0 ? +(price * (1 + (min - m) / 100)).toFixed(2) : 0;
          out.push({
            dedupe: `margin:${d.id}`,
            title: `Nuevo precio para ${d.name}`,
            detail: `Margen ${m.toFixed(0)}% < mínimo ${min}%. PVP sugerido ${suggested.toFixed(2)} €.`,
            reason: `Regla "${rule.name}".`,
            payload: { dish_id: d.id },
            economicImpact: 120,
            priority: m < 15 ? "high" : "medium",
          });
        }
      }
      break;
    }
    case "supplier_better_rating": {
      const delta = Number((cfg as { delta?: number }).delta ?? 0.5);
      for (const i of ingredients) {
        if (!i.supplier_id || !i.alternative_supplier_id) continue;
        const cur = suppliers.find((s) => s.id === i.supplier_id);
        const alt = suppliers.find((s) => s.id === i.alternative_supplier_id);
        if (!cur || !alt) continue;
        if (Number(alt.rating ?? 0) - Number(cur.rating ?? 0) >= delta) {
          out.push({
            dedupe: `rating:${i.id}`,
            title: `${alt.name} tiene mejor valoración para ${i.name}`,
            detail: `${alt.name} ${Number(alt.rating).toFixed(1)}★ vs ${cur.name} ${Number(cur.rating).toFixed(1)}★.`,
            reason: `Regla "${rule.name}".`,
            payload: { ingredient_id: i.id },
            priority: "low",
          });
        }
      }
      break;
    }
    case "product_stale": {
      const minSales = Number((cfg as { min_monthly_sales?: number }).min_monthly_sales ?? 5);
      for (const d of dishes) {
        const sales = Number(d.monthly_sales ?? 0);
        if (sales <= minSales) {
          out.push({
            dedupe: `stale:${d.id}`,
            title: `${d.name} apenas se vende`,
            detail: `${sales} ventas/mes.`,
            reason: `Regla "${rule.name}".`,
            payload: { dish_id: d.id },
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