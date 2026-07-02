import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Zap,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Bell,
  History,
  Plus,
  Trash2,
  Loader2,
  Wand2,
} from "lucide-react";
import {
  ACTION_LABELS,
  STATE_LABELS,
  TRIGGER_LABELS,
  approveTask,
  duplicateTask,
  markNotificationRead,
  revertTask,
  runAutomations,
  scheduleTask,
  updateTask,
  type AutomationRule,
  type AutomationTask,
  type CommitteeLog,
  type Notification,
  type RuleAction,
  type RuleTrigger,
} from "@/lib/automation";

type Tab = "tasks" | "rules" | "history" | "notifications";

type Data = {
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

export function AutomationCenter({ data }: { data: Data }) {
  const [tab, setTab] = useState<Tab>("tasks");
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [log, setLog] = useState<CommitteeLog[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const [t, r, l, n] = await Promise.all([
      supabase.from("automation_tasks").select("*").eq("restaurant_id", data.restaurantId).order("created_at", { ascending: false }),
      supabase.from("automation_rules").select("*").eq("restaurant_id", data.restaurantId).order("created_at", { ascending: true }),
      supabase.from("committee_log").select("*").eq("restaurant_id", data.restaurantId).order("created_at", { ascending: false }).limit(50),
      supabase.from("notifications").select("*").eq("restaurant_id", data.restaurantId).order("created_at", { ascending: false }).limit(50),
    ]);
    setTasks((t.data ?? []) as AutomationTask[]);
    setRules((r.data ?? []) as AutomationRule[]);
    setLog((l.data ?? []) as CommitteeLog[]);
    setNotifs((n.data ?? []) as Notification[]);
  }, [data.restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  const runNow = useCallback(async () => {
    setRunning(true);
    const res = await runAutomations(data);
    setRunning(false);
    toast.success(`El Comité ejecutó las reglas · ${res.created} nueva(s), ${res.skipped} ya activa(s).`);
    await load();
  }, [data, load]);

  // Auto-run once on mount
  useEffect(() => {
    if (!data.restaurantId) return;
    runAutomations(data).then(load).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.restaurantId]);

  const unread = useMemo(() => notifs.filter((n) => !n.read_at).length, [notifs]);
  const openTasks = useMemo(
    () => tasks.filter((t) => t.state !== "applied" && t.state !== "discarded"),
    [tasks],
  );

  return (
    <section className="mt-14 rounded-3xl border border-charcoal/10 bg-white p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">
            <Zap className="w-3.5 h-3.5" /> Centro de Automatizaciones
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl text-charcoal mt-2 tracking-tight">
            El Comité trabaja solo
          </h2>
          <p className="text-sm text-charcoal/60 mt-1">
            {openTasks.length} tarea(s) pendientes · {rules.filter((r) => r.enabled).length} regla(s) activas · {unread} notificación(es) sin leer.
          </p>
        </div>
        <button
          onClick={runNow}
          disabled={running}
          className="inline-flex items-center gap-2 bg-charcoal text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-charcoal/90 disabled:opacity-60"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Ejecutar ahora
        </button>
      </div>

      <div className="mt-6 flex gap-2 border-b border-charcoal/10">
        {(
          [
            ["tasks", `Tareas · ${openTasks.length}`],
            ["rules", `Reglas · ${rules.length}`],
            ["notifications", `Notificaciones · ${unread}`],
            ["history", `Historial · ${log.length}`],
          ] as Array<[Tab, string]>
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition ${
              tab === k
                ? "border-charcoal text-charcoal"
                : "border-transparent text-charcoal/50 hover:text-charcoal/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "tasks" && <TasksList tasks={tasks} onChange={load} />}
        {tab === "rules" && <RulesEditor rules={rules} restaurantId={data.restaurantId} onChange={load} />}
        {tab === "notifications" && <NotificationsList notifs={notifs} onChange={load} />}
        {tab === "history" && <HistoryList log={log} />}
      </div>
    </section>
  );
}

// ------------------ Tasks ------------------

const STATE_TONE: Record<string, string> = {
  detected: "bg-charcoal/[0.06] text-charcoal/70",
  analyzing: "bg-charcoal/[0.06] text-charcoal/70",
  ready: "bg-[color:var(--gold)]/15 text-[color:var(--gold)]",
  scheduled: "bg-blue-500/10 text-blue-600",
  applying: "bg-amber-500/10 text-amber-600",
  applied: "bg-emerald-500/10 text-emerald-600",
  discarded: "bg-red-500/10 text-red-600",
};

function TasksList({ tasks, onChange }: { tasks: AutomationTask[]; onChange: () => void }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-charcoal/50">El Comité aún no ha detectado tareas automáticas.</p>;
  }
  return (
    <ul className="space-y-3">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} onChange={onChange} />
      ))}
    </ul>
  );
}

function TaskRow({ task, onChange }: { task: AutomationTask; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [detail, setDetail] = useState(task.detail ?? "");
  const [busy, setBusy] = useState(false);

  async function wrap(fn: () => Promise<void>, msg: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      onChange();
    } catch {
      toast.error("No se pudo completar la acción.");
    } finally {
      setBusy(false);
    }
  }

  const closed = task.state === "applied" || task.state === "discarded";

  return (
    <li className="rounded-2xl border border-charcoal/10 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] uppercase tracking-[0.15em] px-2 py-0.5 rounded ${STATE_TONE[task.state] ?? ""}`}>
              {STATE_LABELS[task.state]}
            </span>
            <span className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40">
              Modo {task.mode === "auto" ? "automático" : task.mode === "scheduled" ? "programado" : "aprobación"}
            </span>
          </div>
          {editing ? (
            <div className="mt-3 space-y-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-charcoal/15 px-3 py-2 text-sm"
              />
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-charcoal/15 px-3 py-2 text-sm"
              />
            </div>
          ) : (
            <>
              <p className="font-heading text-lg text-charcoal tracking-tight mt-2">{task.title}</p>
              {task.detail && <p className="text-sm text-charcoal/70 mt-1">{task.detail}</p>}
              {task.reason && <p className="text-xs text-charcoal/45 mt-2 italic">{task.reason}</p>}
              {task.scheduled_for && (
                <p className="text-xs text-blue-600 mt-1">
                  Programada para {new Date(task.scheduled_for).toLocaleString("es-ES")}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!closed && !editing && (
          <>
            <button
              disabled={busy}
              onClick={() => wrap(() => approveTask(task), "Aprobada")}
              className="inline-flex items-center gap-1.5 bg-charcoal text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-charcoal/90 disabled:opacity-60"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
            </button>
            <button
              disabled={busy}
              onClick={() => {
                const when = window.prompt("Programar para (YYYY-MM-DD HH:mm)");
                if (!when) return;
                const iso = new Date(when).toISOString();
                wrap(() => scheduleTask(task, iso), "Programada");
              }}
              className="inline-flex items-center gap-1.5 border border-charcoal/15 text-charcoal/80 px-3 py-1.5 rounded-lg text-xs font-medium hover:border-charcoal/40"
            >
              <Clock className="w-3.5 h-3.5" /> Programar
            </button>
            <button
              disabled={busy}
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 border border-charcoal/15 text-charcoal/80 px-3 py-1.5 rounded-lg text-xs font-medium hover:border-charcoal/40"
            >
              Editar
            </button>
          </>
        )}
        {editing && (
          <>
            <button
              disabled={busy}
              onClick={() =>
                wrap(async () => {
                  await updateTask(task, { title, detail });
                  setEditing(false);
                }, "Guardado")
              }
              className="inline-flex items-center gap-1.5 bg-charcoal text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-charcoal/90 disabled:opacity-60"
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setTitle(task.title);
                setDetail(task.detail ?? "");
                setEditing(false);
              }}
              className="inline-flex items-center gap-1.5 border border-charcoal/15 text-charcoal/80 px-3 py-1.5 rounded-lg text-xs font-medium"
            >
              Cancelar
            </button>
          </>
        )}
        <button
          disabled={busy}
          onClick={() => wrap(() => duplicateTask(task), "Duplicada")}
          className="inline-flex items-center gap-1.5 border border-charcoal/15 text-charcoal/80 px-3 py-1.5 rounded-lg text-xs font-medium hover:border-charcoal/40"
        >
          <Copy className="w-3.5 h-3.5" /> Duplicar
        </button>
        {!closed && !editing && (
          <button
            disabled={busy}
            onClick={() => wrap(() => revertTask(task), "Descartada")}
            className="inline-flex items-center gap-1.5 border border-red-500/20 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-500/[0.05]"
          >
            <XCircle className="w-3.5 h-3.5" /> Descartar
          </button>
        )}
        {task.state === "applied" && (
          <button
            disabled={busy}
            onClick={() => wrap(() => revertTask(task), "Revertida")}
            className="inline-flex items-center gap-1.5 border border-charcoal/15 text-charcoal/80 px-3 py-1.5 rounded-lg text-xs font-medium hover:border-charcoal/40"
          >
            Revertir
          </button>
        )}
      </div>
    </li>
  );
}

// ------------------ Rules ------------------

function RulesEditor({
  rules,
  restaurantId,
  onChange,
}: {
  rules: AutomationRule[];
  restaurantId: string;
  onChange: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<RuleTrigger>("supplier_price_up");
  const [action, setAction] = useState<RuleAction>("create_recommendation");

  async function toggle(r: AutomationRule) {
    await supabase.from("automation_rules").update({ enabled: !r.enabled }).eq("id", r.id);
    onChange();
  }
  async function remove(r: AutomationRule) {
    if (!window.confirm(`¿Eliminar la regla "${r.name}"?`)) return;
    await supabase.from("automation_rules").delete().eq("id", r.id);
    toast.success("Regla eliminada");
    onChange();
  }
  async function create() {
    if (!name.trim()) {
      toast.error("Ponle un nombre a la regla.");
      return;
    }
    await supabase.from("automation_rules").insert({
      restaurant_id: restaurantId,
      name: name.trim(),
      description: null,
      trigger_type: trigger,
      trigger_config: {},
      action_type: action,
      action_config: {},
      enabled: true,
    });
    setName("");
    setCreating(false);
    toast.success("Regla creada");
    onChange();
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {rules.map((r) => (
          <li key={r.id} className="rounded-2xl border border-charcoal/10 p-5 flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${r.enabled ? "bg-emerald-500" : "bg-charcoal/25"}`}
                />
                <p className="font-heading text-lg text-charcoal tracking-tight">{r.name}</p>
              </div>
              <p className="text-sm text-charcoal/60 mt-1">
                <strong>SI</strong> {TRIGGER_LABELS[r.trigger_type as RuleTrigger] ?? r.trigger_type} · <strong>ENTONCES</strong> {ACTION_LABELS[r.action_type as RuleAction] ?? r.action_type}
              </p>
              {r.description && <p className="text-xs text-charcoal/45 mt-1">{r.description}</p>}
              <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40 mt-2">
                Ejecuciones: {r.runs_count}
                {r.last_run_at ? ` · última ${new Date(r.last_run_at).toLocaleString("es-ES")}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggle(r)}
                className="inline-flex items-center gap-1.5 border border-charcoal/15 text-charcoal/80 px-3 py-1.5 rounded-lg text-xs font-medium hover:border-charcoal/40"
              >
                {r.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {r.enabled ? "Pausar" : "Activar"}
              </button>
              <button
                onClick={() => remove(r)}
                className="inline-flex items-center gap-1.5 border border-red-500/20 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-500/[0.05]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {creating ? (
        <div className="rounded-2xl border border-dashed border-charcoal/25 p-5 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la regla"
            className="w-full rounded-lg border border-charcoal/15 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-charcoal/60">
              SI
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value as RuleTrigger)}
                className="mt-1 w-full rounded-lg border border-charcoal/15 px-3 py-2 text-sm"
              >
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-charcoal/60">
              ENTONCES
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as RuleAction)}
                className="mt-1 w-full rounded-lg border border-charcoal/15 px-3 py-2 text-sm"
              >
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={create}
              className="inline-flex items-center gap-1.5 bg-charcoal text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-charcoal/90"
            >
              Guardar regla
            </button>
            <button
              onClick={() => setCreating(false)}
              className="inline-flex items-center gap-1.5 border border-charcoal/15 text-charcoal/80 px-3 py-1.5 rounded-lg text-xs font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 border border-dashed border-charcoal/25 text-charcoal/70 px-4 py-2.5 rounded-xl text-sm font-medium hover:border-charcoal/40"
        >
          <Plus className="w-4 h-4" /> Nueva regla
        </button>
      )}
    </div>
  );
}

// ------------------ Notifications ------------------

function NotificationsList({ notifs, onChange }: { notifs: Notification[]; onChange: () => void }) {
  if (notifs.length === 0) {
    return <p className="text-sm text-charcoal/50">Sin notificaciones. El Comité solo avisa cuando pasa algo importante.</p>;
  }
  const tone: Record<string, string> = {
    critical: "border-red-500/30 bg-red-500/[0.03]",
    warning: "border-amber-500/30 bg-amber-500/[0.03]",
    info: "border-charcoal/10",
  };
  return (
    <ul className="space-y-2">
      {notifs.map((n) => (
        <li
          key={n.id}
          className={`rounded-xl border p-4 flex items-start justify-between gap-3 ${tone[n.severity] ?? ""} ${
            n.read_at ? "opacity-60" : ""
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-charcoal/50" />
              <p className="font-medium text-sm text-charcoal">{n.title}</p>
            </div>
            {n.body && <p className="text-sm text-charcoal/60 mt-0.5">{n.body}</p>}
            <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40 mt-1">
              {new Date(n.created_at).toLocaleString("es-ES")}
            </p>
          </div>
          {!n.read_at && (
            <button
              onClick={async () => {
                await markNotificationRead(n.id);
                onChange();
              }}
              className="text-xs text-charcoal/60 hover:text-charcoal shrink-0"
            >
              Marcar leído
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

// ------------------ History ------------------

function HistoryList({ log }: { log: CommitteeLog[] }) {
  if (log.length === 0) {
    return <p className="text-sm text-charcoal/50">Aún no hay historial. Ejecuta las automatizaciones o aprueba una tarea.</p>;
  }
  const actionLabel: Record<string, string> = {
    detect: "Detectó",
    auto_apply: "Aplicó automáticamente",
    approve: "Aprobaste",
    revert: "Revertiste",
    schedule: "Programaste",
  };
  return (
    <ol className="relative border-l border-charcoal/10 pl-5 space-y-4">
      {log.map((l) => {
        const result = (l.result ?? {}) as { title?: string; mode?: string };
        return (
          <li key={l.id} className="relative">
            <span className="absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full bg-[color:var(--gold)]" />
            <div className="flex items-baseline gap-2 flex-wrap">
              <History className="w-3.5 h-3.5 text-charcoal/40" />
              <p className="text-sm text-charcoal">
                <strong>{l.actor === "user" ? "Tú" : "El Comité"}</strong> · {actionLabel[l.action] ?? l.action}
                {result.title ? ` "${result.title}"` : ""}
              </p>
            </div>
            {l.reason && <p className="text-xs text-charcoal/50 mt-1">{l.reason}</p>}
            <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40 mt-1">
              {new Date(l.created_at).toLocaleString("es-ES")}
            </p>
          </li>
        );
      })}
    </ol>
  );
}