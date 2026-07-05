import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/app/AppShell";
import {
  getInvoice,
  getInvoiceDocumentUrl,
  confirmInvoiceItem,
  ignoreInvoiceItem,
  matchInvoiceItemToIngredient,
  validateInvoiceForApply,
  applyInvoice,
  reverseInvoice,
  retryOcr,
  parseInvoiceDemo,
  getInvoiceValidationSummary,
} from "@/lib/invoices.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Play,
  Undo2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/facturas/$invoiceId")({
  head: () => ({ meta: [{ title: "Detalle de factura — TuComité" }] }),
  component: InvoiceDetail,
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <div className="max-w-2xl mx-auto py-20 px-6">
        <h1 className="font-heading text-2xl text-charcoal">No se pudo cargar la factura</h1>
        <p className="text-sm text-charcoal/60 mt-2">{error.message}</p>
        <button
          onClick={() => reset()}
          className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-charcoal text-white text-sm"
        >
          Reintentar
        </button>
      </div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <div className="max-w-2xl mx-auto py-20 px-6">
        <h1 className="font-heading text-2xl text-charcoal">Factura no encontrada</h1>
        <Link to="/facturas" className="mt-4 inline-flex items-center gap-2 text-sm text-charcoal/70 underline">
          Volver a Facturas
        </Link>
      </div>
    </AppShell>
  ),
});

const STATUS_LABEL: Record<string, string> = {
  uploaded: "Subida",
  processing: "Procesando",
  needs_review: "Pendiente de revisión",
  ready_to_apply: "Lista para aplicar",
  applied: "Aplicada",
  failed: "Con error",
  reversed: "Revertida",
};
const REVIEW_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  ignored: "Ignorada",
  needs_attention: "Revisar",
};

function fmtEUR(v: number | string | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(v));
}

type IngredientLite = { id: string; name: string; unit: string | null };

function InvoiceDetail() {
  const { invoiceId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();

  const getInvoiceFn = useServerFn(getInvoice);
  const getDocFn = useServerFn(getInvoiceDocumentUrl);
  const confirmFn = useServerFn(confirmInvoiceItem);
  const ignoreFn = useServerFn(ignoreInvoiceItem);
  const matchFn = useServerFn(matchInvoiceItemToIngredient);
  const validateFn = useServerFn(validateInvoiceForApply);
  const summaryFn = useServerFn(getInvoiceValidationSummary);
  const applyFn = useServerFn(applyInvoice);
  const reverseFn = useServerFn(reverseInvoice);
  const retryFn = useServerFn(retryOcr);
  const parseFn = useServerFn(parseInvoiceDemo);

  const invoiceQ = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvoiceFn({ data: { id: invoiceId } }),
  });

  const docQ = useQuery({
    queryKey: ["invoice-doc", invoiceId],
    queryFn: () => getDocFn({ data: { invoice_id: invoiceId } }),
    staleTime: 60_000,
    enabled: !!invoiceQ.data,
  });

  const summaryQ = useQuery({
    queryKey: ["invoice-summary", invoiceId],
    queryFn: () => summaryFn({ data: { invoice_id: invoiceId } }),
    enabled: !!invoiceQ.data,
  });

  const inv = invoiceQ.data?.invoice;
  const items = invoiceQ.data?.items ?? [];
  const restaurantId = inv?.restaurant_id as string | undefined;
  const isLocked = inv?.status === "applied" || inv?.status === "reversed";

  const ingredientsQ = useQuery({
    queryKey: ["ingredients-lite", restaurantId],
    queryFn: async (): Promise<IngredientLite[]> => {
      const { data, error } = await supabase
        .from("ingredients")
        .select("id, name, unit")
        .eq("restaurant_id", restaurantId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as IngredientLite[];
    },
    enabled: !!restaurantId,
  });
  const ingredientIndex = useMemo(() => {
    const m = new Map<string, IngredientLite>();
    (ingredientsQ.data ?? []).forEach((i) => m.set(i.id, i));
    return m;
  }, [ingredientsQ.data]);

  async function refetchAll() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] }),
      qc.invalidateQueries({ queryKey: ["invoice-summary", invoiceId] }),
      qc.invalidateQueries({ queryKey: ["invoices"] }),
    ]);
  }

  const confirmM = useMutation({
    mutationFn: (item_id: string) => confirmFn({ data: { invoice_item_id: item_id } }),
    onSuccess: () => { toast.success("Línea confirmada"); return refetchAll(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const ignoreM = useMutation({
    mutationFn: (v: { item_id: string; reason: string }) =>
      ignoreFn({ data: { invoice_item_id: v.item_id, ignored_reason: v.reason } }),
    onSuccess: () => { toast.success("Línea ignorada"); return refetchAll(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const matchM = useMutation({
    mutationFn: (v: { item_id: string; ingredient_id: string }) =>
      matchFn({ data: { invoice_item_id: v.item_id, ingredient_id: v.ingredient_id } }),
    onSuccess: () => { toast.success("Ingrediente vinculado"); return refetchAll(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const validateM = useMutation({
    mutationFn: () => validateFn({ data: { invoice_id: invoiceId } }),
    onSuccess: (res) => {
      if (res.promoted) toast.success("Factura lista para aplicar");
      else toast.error(`No se puede aplicar: ${res.blocking_errors[0]?.code ?? "revisar"}`);
      return refetchAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const applyM = useMutation({
    mutationFn: () => applyFn({ data: { invoice_id: invoiceId } }),
    onSuccess: (run) => {
      if (run.status === "success") toast.success("Factura aplicada al inventario");
      else toast.error(`Fallo al aplicar: ${run.error_message ?? "desconocido"}`);
      return refetchAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reverseM = useMutation({
    mutationFn: () => reverseFn({ data: { invoice_id: invoiceId } }),
    onSuccess: (run) => {
      if (run.status === "success") toast.success("Factura revertida");
      else toast.error(`Fallo al revertir: ${run.error_message ?? "desconocido"}`);
      return refetchAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const retryM = useMutation({
    mutationFn: async () => {
      await retryFn({ data: { invoice_id: invoiceId } });
      await parseFn({ data: { invoice_id: invoiceId } });
    },
    onSuccess: () => { toast.success("OCR relanzado"); return refetchAll(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (invoiceQ.isLoading) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto py-16 px-6 flex items-center gap-3 text-charcoal/60">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando factura…
        </div>
      </AppShell>
    );
  }
  if (!inv) return null;

  const summary = summaryQ.data;
  const canValidate = inv.status === "needs_review";
  const canApply = inv.status === "ready_to_apply";
  const canReverse = inv.status === "applied";
  const canRetry = inv.status === "failed" || inv.status === "uploaded";

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto py-10 px-6 sm:px-10">
        <Link to="/facturas" className="inline-flex items-center gap-2 text-sm text-charcoal/60 hover:text-charcoal">
          <ArrowLeft className="w-4 h-4" /> Facturas
        </Link>

        <header className="mt-4 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="font-heading text-3xl text-charcoal tracking-tight">
              {inv.invoice_number || "Sin número"}
            </h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-charcoal/60">
              <span className="px-2 py-0.5 rounded-full bg-charcoal/[0.06] uppercase tracking-[0.14em]">
                {STATUS_LABEL[inv.status] ?? inv.status}
              </span>
              {inv.ocr_mode === "demo" && (
                <span className="px-2 py-0.5 rounded-full bg-charcoal/[0.06] uppercase tracking-[0.14em]">
                  OCR demo
                </span>
              )}
              {inv.error_message && (
                <span className="inline-flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-3 h-3" /> {inv.error_message}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)] gap-6">
          {/* Columna 1: Documento */}
          <aside className="rounded-2xl border border-charcoal/10 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-charcoal/10 text-xs uppercase tracking-[0.14em] text-charcoal/60 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Documento
            </div>
            <div className="aspect-[3/4] bg-charcoal/[0.03] flex items-center justify-center">
              {docQ.isLoading && <Loader2 className="w-5 h-5 animate-spin text-charcoal/40" />}
              {docQ.data?.url ? (
                <iframe
                  title="Documento factura"
                  src={docQ.data.url}
                  className="w-full h-full"
                />
              ) : (
                !docQ.isLoading && (
                  <div className="text-center text-xs text-charcoal/50 px-4">
                    Documento no disponible
                  </div>
                )
              )}
            </div>
            {docQ.data?.url && (
              <div className="p-3 text-xs text-charcoal/50">
                Enlace firmado, expira en {Math.round((docQ.data.expires_in ?? 0) / 60)} min ·{" "}
                <a href={docQ.data.url} target="_blank" rel="noreferrer" className="underline">
                  Abrir en nueva pestaña
                </a>
              </div>
            )}
          </aside>

          {/* Columna 2: Líneas */}
          <section className="rounded-2xl border border-charcoal/10 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-charcoal/10 text-xs uppercase tracking-[0.14em] text-charcoal/60">
              Líneas detectadas ({items.length})
            </div>
            {items.length === 0 ? (
              <div className="p-8 text-center text-sm text-charcoal/50">
                No hay líneas. {canRetry && "Puedes relanzar el OCR."}
              </div>
            ) : (
              <ul className="divide-y divide-charcoal/10">
                {items.map((it) => {
                  const ing = it.matched_ingredient_id ? ingredientIndex.get(it.matched_ingredient_id) : null;
                  return (
                    <li key={it.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-charcoal truncate">
                            {it.description || `Línea ${it.line_number ?? ""}`}
                          </div>
                          <div className="mt-1 text-xs text-charcoal/55 flex items-center gap-3 flex-wrap">
                            <span>{Number(it.base_quantity ?? it.quantity ?? 0)} {it.base_unit ?? it.unit ?? ""}</span>
                            <span>{fmtEUR(it.unit_price)} / ud</span>
                            <span>Total: {fmtEUR(it.total_amount)}</span>
                            <span className="px-1.5 py-0.5 rounded bg-charcoal/[0.06] uppercase tracking-[0.12em]">
                              {REVIEW_LABEL[it.review_status] ?? it.review_status}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <select
                              disabled={isLocked || matchM.isPending}
                              value={it.matched_ingredient_id ?? ""}
                              onChange={(e) =>
                                matchM.mutate({ item_id: it.id, ingredient_id: e.target.value })
                              }
                              className="text-xs h-8 rounded-lg border border-charcoal/15 bg-white px-2 max-w-xs"
                            >
                              <option value="" disabled>
                                Vincular ingrediente…
                              </option>
                              {(ingredientsQ.data ?? []).map((ig) => (
                                <option key={ig.id} value={ig.id}>
                                  {ig.name}
                                </option>
                              ))}
                            </select>
                            {ing && (
                              <span className="text-[11px] text-charcoal/50">
                                → {ing.name} ({ing.unit ?? "—"})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <button
                            disabled={isLocked || confirmM.isPending || it.review_status === "confirmed"}
                            onClick={() => confirmM.mutate(it.id)}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-emerald-600 text-white text-xs disabled:opacity-40"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
                          </button>
                          <button
                            disabled={isLocked || ignoreM.isPending || it.review_status === "ignored"}
                            onClick={() => {
                              const reason = window.prompt("Motivo para ignorar (mínimo 3 caracteres):");
                              if (reason && reason.trim().length >= 3) {
                                ignoreM.mutate({ item_id: it.id, reason: reason.trim() });
                              }
                            }}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-white border border-charcoal/15 text-charcoal text-xs disabled:opacity-40"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Ignorar
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Columna 3: Validación e impacto */}
          <aside className="rounded-2xl border border-charcoal/10 bg-white p-4 space-y-4 self-start sticky top-4">
            <div className="text-xs uppercase tracking-[0.14em] text-charcoal/60">Totales</div>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between"><dt className="text-charcoal/60">Subtotal</dt><dd>{fmtEUR(inv.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-charcoal/60">Impuestos</dt><dd>{fmtEUR(inv.tax_total)}</dd></div>
              <div className="flex justify-between font-medium"><dt>Total</dt><dd>{fmtEUR(inv.total)}</dd></div>
            </dl>

            {summary && (
              <>
                <div className="text-xs uppercase tracking-[0.14em] text-charcoal/60 pt-2 border-t border-charcoal/10">
                  Validación
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-emerald-50 text-emerald-700 px-2 py-1.5">
                    Confirmadas: {summary.confirmed_count}
                  </div>
                  <div className="rounded-lg bg-charcoal/[0.06] text-charcoal/70 px-2 py-1.5">
                    Ignoradas: {summary.ignored_count}
                  </div>
                  <div className="rounded-lg bg-amber-50 text-amber-700 px-2 py-1.5">
                    Pendientes: {summary.pending_count}
                  </div>
                  <div className="rounded-lg bg-orange-50 text-orange-700 px-2 py-1.5">
                    Revisar: {summary.needs_attention_count}
                  </div>
                </div>
                {summary.blocking_errors.length > 0 && (
                  <ul className="text-xs text-red-600 space-y-1">
                    {summary.blocking_errors.slice(0, 5).map((e, i) => (
                      <li key={i}>• {e.code}</li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <div className="pt-2 border-t border-charcoal/10 space-y-2">
              {canRetry && (
                <button
                  disabled={retryM.isPending}
                  onClick={() => retryM.mutate()}
                  className="w-full inline-flex justify-center items-center gap-2 h-9 px-4 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm disabled:opacity-40"
                >
                  {retryM.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Relanzar OCR
                </button>
              )}
              {canValidate && (
                <button
                  disabled={validateM.isPending || (summary != null && !summary.can_apply)}
                  onClick={() => validateM.mutate()}
                  className="w-full inline-flex justify-center items-center gap-2 h-9 px-4 rounded-full bg-charcoal text-white text-sm disabled:opacity-40"
                >
                  {validateM.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Validar y preparar
                </button>
              )}
              {canApply && (
                <button
                  disabled={applyM.isPending}
                  onClick={() => {
                    if (window.confirm("¿Aplicar esta factura al inventario? Se actualizará el stock.")) {
                      applyM.mutate();
                    }
                  }}
                  className="w-full inline-flex justify-center items-center gap-2 h-9 px-4 rounded-full bg-emerald-600 text-white text-sm disabled:opacity-40"
                >
                  {applyM.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Aplicar
                </button>
              )}
              {canReverse && (
                <button
                  disabled={reverseM.isPending}
                  onClick={() => {
                    if (window.confirm("¿Revertir esta factura? Se descontará el stock añadido.")) {
                      reverseM.mutate();
                    }
                  }}
                  className="w-full inline-flex justify-center items-center gap-2 h-9 px-4 rounded-full bg-white border border-red-200 text-red-700 text-sm disabled:opacity-40"
                >
                  {reverseM.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                  Revertir
                </button>
              )}
              {isLocked && (
                <p className="text-[11px] text-charcoal/50 text-center">
                  Edición bloqueada — factura {inv.status === "applied" ? "aplicada" : "revertida"}.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}