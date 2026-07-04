import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import {
  getInvoice,
  getInvoiceValidationSummary,
  confirmInvoiceItem,
  ignoreInvoiceItem,
  matchInvoiceItemToIngredient,
  validateInvoiceForApply,
} from "@/lib/invoices.functions";
import {
  ArrowLeft,
  Check,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/facturas/$invoiceId")({
  head: () => ({ meta: [{ title: "Factura — TuComité" }] }),
  component: FacturaDetail,
});

const REVIEW_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  ignored: "Ignorada",
  needs_attention: "Requiere atención",
};
const REVIEW_CLASS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  ignored: "bg-charcoal/[0.06] text-charcoal/55",
  needs_attention: "bg-red-50 text-red-700",
};
const STATUS_LABEL: Record<string, string> = {
  uploaded: "Subida",
  processing: "Procesando",
  needs_review: "Revisar",
  ready_to_apply: "Lista para aplicar",
  applied: "Aplicada",
  failed: "Error",
  reversed: "Revertida",
};

const BLOCKING_LABEL: Record<string, string> = {
  no_confirmed_lines: "No hay líneas confirmadas",
  confirmed_missing_ingredient: "Línea confirmada sin ingrediente",
  base_quantity_invalid: "Cantidad base inválida",
  unit_price_negative: "Precio unitario negativo",
  net_amount_negative: "Importe neto negativo",
  total_amount_negative: "Importe total negativo",
  line_pending: "Línea pendiente sin resolver",
  line_needs_attention: "Línea requiere atención",
  totals_mismatch: "Los totales no cuadran",
};

function fmt(n: number | null | undefined, digits = 2) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(n));
}
function fmtEUR(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(v));
}

function FacturaDetail() {
  const { invoiceId } = Route.useParams();
  const qc = useQueryClient();

  const getFn = useServerFn(getInvoice);
  const summaryFn = useServerFn(getInvoiceValidationSummary);
  const confirmFn = useServerFn(confirmInvoiceItem);
  const ignoreFn = useServerFn(ignoreInvoiceItem);
  const matchFn = useServerFn(matchInvoiceItemToIngredient);
  const validateFn = useServerFn(validateInvoiceForApply);

  const invoiceQ = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getFn({ data: { id: invoiceId } }),
  });
  const summaryQ = useQuery({
    queryKey: ["invoice-summary", invoiceId],
    queryFn: () => summaryFn({ data: { invoice_id: invoiceId } }),
  });
  const ingredientsQ = useQuery({
    queryKey: ["ingredients-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredients")
        .select("id, name, unit")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refreshAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] }),
      qc.invalidateQueries({ queryKey: ["invoice-summary", invoiceId] }),
      qc.invalidateQueries({ queryKey: ["invoices"] }),
    ]);
  };

  const confirmM = useMutation({
    mutationFn: (id: string) => confirmFn({ data: { invoice_item_id: id } }),
    onSuccess: async () => { toast.success("Línea confirmada"); await refreshAll(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const ignoreM = useMutation({
    mutationFn: (v: { id: string; reason: string }) => ignoreFn({ data: { invoice_item_id: v.id, ignored_reason: v.reason } }),
    onSuccess: async () => { toast.success("Línea ignorada"); await refreshAll(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const matchM = useMutation({
    mutationFn: (v: { id: string; ingredient_id: string }) =>
      matchFn({ data: { invoice_item_id: v.id, ingredient_id: v.ingredient_id } }),
    onSuccess: async () => { toast.success("Ingrediente actualizado"); await refreshAll(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const validateM = useMutation({
    mutationFn: () => validateFn({ data: { invoice_id: invoiceId } }),
    onSuccess: async (res) => {
      if (res.promoted) toast.success("Factura preparada para aplicar");
      else toast.error("La factura no puede aplicarse todavía");
      await refreshAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const invoice = invoiceQ.data?.invoice;
  const items = invoiceQ.data?.items ?? [];
  const summary = summaryQ.data;

  const editable = invoice?.status === "needs_review";
  const readOnlyReason = useMemo(() => {
    if (!invoice) return null;
    if (invoice.status === "ready_to_apply") return "La factura está lista para aplicar.";
    if (invoice.status === "applied") return "Factura ya aplicada. No se puede editar.";
    if (invoice.status === "reversed") return "Factura revertida. No se puede editar.";
    if (invoice.status === "processing") return "Factura procesándose.";
    if (invoice.status === "failed") return "Falló el procesamiento.";
    return null;
  }, [invoice]);

  return (
    <AppShell>
      <div className="px-6 sm:px-10 lg:px-16 py-10 max-w-[1400px] mx-auto">
        <Link to="/facturas" className="inline-flex items-center gap-1.5 text-sm text-charcoal/60 hover:text-charcoal transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Facturas
        </Link>

        {invoiceQ.isLoading && (
          <div className="mt-6 h-40 rounded-2xl border border-charcoal/10 bg-white/60 animate-pulse" />
        )}
        {invoiceQ.isError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            No se pudo cargar la factura.
          </div>
        )}

        {invoice && (
          <>
            <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-heading text-3xl text-charcoal tracking-tight leading-tight">
                  {invoice.invoice_number || "Factura sin número"}
                </h1>
                <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-charcoal/[0.06] text-charcoal/70">
                    {STATUS_LABEL[invoice.status] ?? invoice.status}
                  </span>
                  {invoice.ocr_mode === "demo" && (
                    <span className="text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      OCR demo
                    </span>
                  )}
                  {invoice.confidence_score != null && (
                    <span className="text-charcoal/55">Confianza {Number(invoice.confidence_score).toFixed(0)}%</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-charcoal/55 text-xs uppercase tracking-[0.14em]">Total</div>
                <div className="text-3xl font-heading text-charcoal">{fmtEUR(Number(invoice.total))}</div>
                <div className="text-xs text-charcoal/55 mt-1">
                  Base {fmtEUR(Number(invoice.subtotal))} · IVA {fmtEUR(Number(invoice.tax_total))}
                </div>
              </div>
            </header>

            {readOnlyReason && (
              <div className="mt-6 rounded-2xl border border-charcoal/10 bg-charcoal/[0.03] p-4 text-sm text-charcoal/70">
                {readOnlyReason}
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,340px)] gap-6">
              {/* Left: document placeholder */}
              <aside className="rounded-2xl border border-charcoal/10 bg-white p-6 h-fit">
                <div className="aspect-[3/4] rounded-xl bg-charcoal/[0.04] border border-dashed border-charcoal/15 flex flex-col items-center justify-center text-center p-4">
                  <FileText className="w-8 h-8 text-charcoal/40" />
                  <p className="mt-3 text-xs text-charcoal/55 leading-snug">
                    Vista previa del documento no disponible en OCR demo.
                  </p>
                </div>
              </aside>

              {/* Center: lines */}
              <section className="min-w-0">
                <h2 className="text-xs uppercase tracking-[0.18em] text-charcoal/55 font-medium mb-3">Líneas</h2>
                <ul className="space-y-3">
                  {items.map((it) => (
                    <LineRow
                      key={it.id}
                      item={it}
                      editable={editable}
                      ingredients={ingredientsQ.data ?? []}
                      onConfirm={() => confirmM.mutate(it.id)}
                      onIgnore={(reason) => ignoreM.mutate({ id: it.id, reason })}
                      onMatch={(ingredient_id) => matchM.mutate({ id: it.id, ingredient_id })}
                    />
                  ))}
                  {items.length === 0 && (
                    <li className="rounded-2xl border border-dashed border-charcoal/15 p-8 text-center text-sm text-charcoal/60">
                      Esta factura no tiene líneas detectadas.
                    </li>
                  )}
                </ul>
              </section>

              {/* Right: validation panel */}
              <aside className="rounded-2xl border border-charcoal/10 bg-white p-5 h-fit lg:sticky lg:top-20">
                <h2 className="text-xs uppercase tracking-[0.18em] text-charcoal/55 font-medium">Validación</h2>

                {summary && (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <Stat label="Confirmadas" value={summary.confirmed_count} tone="ok" />
                      <Stat label="Pendientes" value={summary.pending_count} tone={summary.pending_count > 0 ? "warn" : "muted"} />
                      <Stat label="Ignoradas" value={summary.ignored_count} tone="muted" />
                      <Stat label="Requieren atención" value={summary.needs_attention_count} tone={summary.needs_attention_count > 0 ? "bad" : "muted"} />
                    </div>

                    <div className="mt-4 text-xs text-charcoal/60">
                      Movimientos previstos: <span className="text-charcoal font-medium">{summary.expected_movements_count}</span>
                      <br />
                      Ingredientes afectados: <span className="text-charcoal font-medium">{summary.affected_ingredient_ids.length}</span>
                    </div>

                    {summary.blocking_errors.length > 0 && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 uppercase tracking-[0.12em]">
                          <AlertTriangle className="w-3.5 h-3.5" /> Bloqueos
                        </div>
                        <ul className="mt-2 space-y-1 text-xs text-red-700">
                          {summary.blocking_errors.map((e, i) => (
                            <li key={i}>• {BLOCKING_LABEL[e.code] ?? e.code}{e.detail ? ` (${e.detail})` : ""}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summary.warnings.length > 0 && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 uppercase tracking-[0.12em]">
                          <AlertTriangle className="w-3.5 h-3.5" /> Avisos
                        </div>
                        <ul className="mt-2 space-y-1 text-xs text-amber-800">
                          {summary.warnings.map((w, i) => (
                            <li key={i}>• {BLOCKING_LABEL[w.code] ?? w.code}{w.detail ? ` (${w.detail})` : ""}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {invoice.status === "ready_to_apply" ? (
                      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Lista para aplicar. La aplicación al inventario requiere un paso adicional.
                      </div>
                    ) : (
                      <button
                        onClick={() => validateM.mutate()}
                        disabled={!editable || validateM.isPending}
                        className="mt-5 w-full inline-flex items-center justify-center gap-2 h-10 rounded-full bg-charcoal text-white text-sm font-medium hover:bg-charcoal/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Validar y preparar
                      </button>
                    )}
                  </>
                )}
                {!summary && summaryQ.isLoading && (
                  <div className="mt-4 h-32 rounded-xl bg-charcoal/[0.04] animate-pulse" />
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "bad" | "muted" }) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
      ? "text-amber-700"
      : tone === "bad"
      ? "text-red-700"
      : "text-charcoal/70";
  return (
    <div className="rounded-xl border border-charcoal/10 p-2.5">
      <div className={`text-lg font-heading ${toneCls}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-charcoal/50">{label}</div>
    </div>
  );
}

type Item = {
  id: string;
  line_number: number | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  base_quantity: number | null;
  base_unit: string | null;
  unit_price: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  matched_ingredient_id: string | null;
  confidence_score: number | null;
  review_status: "pending" | "confirmed" | "ignored" | "needs_attention";
  ignored_reason: string | null;
};

function LineRow({
  item,
  editable,
  ingredients,
  onConfirm,
  onIgnore,
  onMatch,
}: {
  item: Item;
  editable: boolean;
  ingredients: Array<{ id: string; name: string; unit: string | null }>;
  onConfirm: () => void;
  onIgnore: (reason: string) => void;
  onMatch: (ingredient_id: string) => void;
}) {
  const [ignoring, setIgnoring] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <li className="rounded-2xl border border-charcoal/10 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-charcoal/40">#{item.line_number ?? "—"}</span>
            <span className="text-charcoal font-medium truncate">{item.description ?? "Sin descripción"}</span>
            <span className={`text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full ${REVIEW_CLASS[item.review_status]}`}>
              {REVIEW_LABEL[item.review_status]}
            </span>
            {item.confidence_score != null && (
              <span className="text-[10px] text-charcoal/50">{Number(item.confidence_score).toFixed(0)}%</span>
            )}
          </div>
          <div className="mt-1 text-xs text-charcoal/60 flex items-center gap-3 flex-wrap">
            <span>Cant.: {fmt(item.quantity, 2)} {item.unit ?? ""}</span>
            <span>Base: {fmt(item.base_quantity, 2)} {item.base_unit ?? ""}</span>
            <span>Precio: {fmtEUR(item.unit_price)}</span>
            <span>IVA: {fmtEUR(item.tax_amount)}</span>
            <span className="text-charcoal font-medium">Total: {fmtEUR(item.total_amount)}</span>
          </div>
          {item.ignored_reason && (
            <div className="mt-1 text-xs text-charcoal/50 italic">Motivo: {item.ignored_reason}</div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={item.matched_ingredient_id ?? ""}
          disabled={!editable}
          onChange={(e) => {
            const v = e.target.value;
            if (v && v !== item.matched_ingredient_id) onMatch(v);
          }}
          className="text-xs h-8 rounded-lg border border-charcoal/15 bg-white px-2 min-w-[220px] disabled:opacity-60"
        >
          <option value="">Sin ingrediente vinculado</option>
          {ingredients.map((ing) => (
            <option key={ing.id} value={ing.id}>
              {ing.name}{ing.unit ? ` (${ing.unit})` : ""}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {!ignoring ? (
            <>
              <button
                type="button"
                disabled={!editable}
                onClick={onConfirm}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Check className="w-3.5 h-3.5" /> Confirmar
              </button>
              <button
                type="button"
                disabled={!editable}
                onClick={() => setIgnoring(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-charcoal/15 text-charcoal/70 text-xs font-medium hover:bg-charcoal/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <X className="w-3.5 h-3.5" /> Ignorar
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo (≥3 caracteres)"
                className="text-xs h-8 rounded-lg border border-charcoal/15 bg-white px-2 min-w-[200px]"
              />
              <button
                type="button"
                onClick={() => {
                  if (reason.trim().length < 3) return;
                  onIgnore(reason.trim());
                  setIgnoring(false);
                  setReason("");
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-charcoal text-white text-xs font-medium hover:bg-charcoal/90 transition"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => { setIgnoring(false); setReason(""); }}
                className="text-xs text-charcoal/60 hover:text-charcoal"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
