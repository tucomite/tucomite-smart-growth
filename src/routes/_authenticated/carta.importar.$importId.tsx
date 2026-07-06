import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { processMenuImport } from "@/lib/menu-import.functions";
import { ArrowLeft, Check, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/carta/importar/$importId")({
  head: () => ({ meta: [{ title: "Revisar carta importada — TuComité" }] }),
  component: ReviewImportPage,
});

type Status = "uploaded" | "processing" | "needs_review" | "confirmed" | "failed" | "cancelled";

type ImportRow = {
  id: string;
  restaurant_id: string;
  source: string;
  status: Status;
  original_filename: string | null;
  extracted_json: unknown;
  error_message: string | null;
};

type ReviewDish = {
  name: string;
  category: string;
  sale_price: string;
  description: string;
  confidence: number | null;
};

function toReviewDishes(json: unknown): ReviewDish[] {
  const arr = (json as { dishes?: unknown } | null)?.dishes;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((d): ReviewDish | null => {
      if (!d || typeof d !== "object") return null;
      const o = d as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name : "";
      if (!name.trim()) return null;
      const category = typeof o.category === "string" ? o.category : "";
      const description = typeof o.description === "string" ? o.description : "";
      const price =
        typeof o.sale_price === "number"
          ? o.sale_price.toFixed(2)
          : typeof o.sale_price === "string"
            ? o.sale_price
            : "";
      const confidence = typeof o.confidence === "number" ? o.confidence : null;
      return { name, category, sale_price: price, description, confidence };
    })
    .filter((x): x is ReviewDish => x !== null);
}

function ReviewImportPage() {
  const { importId } = Route.useParams();
  const navigate = useNavigate();
  const process = useServerFn(processMenuImport);

  const [row, setRow] = useState<ImportRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [dishes, setDishes] = useState<ReviewDish[]>([]);
  const [confirming, setConfirming] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("menu_imports")
      .select("id,restaurant_id,source,status,original_filename,extracted_json,error_message")
      .eq("id", importId)
      .maybeSingle();
    if (error) toast.error(error.message);
    if (data) {
      setRow(data as ImportRow);
      setDishes(toReviewDishes(data.extracted_json));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [importId]);

  // Auto-start OCR if uploaded (arrived here right after upload)
  useEffect(() => {
    if (!row) return;
    if (row.status === "uploaded") void runOcr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id, row?.status]);

  async function runOcr() {
    if (!row) return;
    setProcessing(true);
    try {
      const res = await process({ data: { importId: row.id } });
      toast.success(`Detectados ${res.dishesCount} platos. Revisa antes de confirmar.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falló el análisis.");
      await load();
    } finally {
      setProcessing(false);
    }
  }

  const validCount = useMemo(() => dishes.filter((d) => d.name.trim().length > 0).length, [dishes]);
  const lowConfidence = useMemo(
    () => dishes.some((d) => (d.confidence ?? 1) < 0.5),
    [dishes],
  );

  function update(i: number, patch: Partial<ReviewDish>) {
    setDishes((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }
  function remove(i: number) {
    setDishes((prev) => prev.filter((_, idx) => idx !== i));
  }
  function add() {
    setDishes((prev) => [
      ...prev,
      { name: "", category: "", sale_price: "", description: "", confidence: null },
    ]);
  }

  async function confirm() {
    if (!row) return;
    const valid = dishes.filter((d) => d.name.trim().length > 0);
    if (valid.length === 0) {
      toast.error("No hay platos válidos que confirmar.");
      return;
    }
    setConfirming(true);
    try {
      const payload = valid.map((d) => ({
        name: d.name.trim(),
        category: d.category.trim() || null,
        sale_price: d.sale_price.trim() === "" ? null : d.sale_price.trim(),
        description: d.description.trim() || null,
      }));
      const { error: upErr } = await supabase
        .from("menu_imports")
        .update({ extracted_json: { ...(row.extracted_json as object ?? {}), dishes: payload } })
        .eq("id", row.id);
      if (upErr) throw upErr;
      const { error: rpcErr } = await supabase.rpc("confirm_menu_import", { _import_id: row.id });
      if (rpcErr) throw rpcErr;
      toast.success(`Carta guardada: ${valid.length} platos reales.`);
      navigate({ to: "/carta" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo confirmar.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <AppShell
      eyebrow={
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Revisar carta detectada
        </span>
      }
    >
      <div className="px-6 sm:px-12 lg:px-16 py-14 sm:py-20 max-w-5xl mx-auto">
        <Link
          to="/carta/importar"
          className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a importar
        </Link>

        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--tc-gold)] font-medium">
          Importación · {row?.source?.toUpperCase() ?? "…"}
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl text-white mt-5 tracking-[-0.022em] leading-[1.05]">
          {row?.status === "needs_review"
            ? "Revisa los platos detectados."
            : row?.status === "failed"
              ? "No hemos podido leer la carta."
              : "Estamos leyendo tu carta…"}
        </h1>
        <p className="text-white/60 text-[15.5px] mt-5 max-w-2xl leading-relaxed">
          {row?.original_filename ? (
            <>
              <span className="text-white/40">Fichero:</span> {row.original_filename}
            </>
          ) : (
            "Cargando información de la importación…"
          )}
        </p>

        {loading && (
          <div className="mt-10 inline-flex items-center gap-2 text-white/60 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
          </div>
        )}

        {!loading && row && (row.status === "uploaded" || row.status === "processing" || processing) && (
          <div className="mt-10 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8">
            <div className="inline-flex items-center gap-2 text-sm text-white/75">
              <Loader2 className="w-4 h-4 animate-spin" /> Analizando la carta con IA…
            </div>
            <p className="text-white/55 text-sm mt-3 max-w-xl leading-relaxed">
              Estamos extrayendo categorías, platos y precios. Puede tardar entre 10 y 40
              segundos según el tamaño del fichero. No cierres esta pantalla.
            </p>
          </div>
        )}

        {!loading && row && row.status === "failed" && (
          <div className="mt-10 rounded-2xl border border-rose-400/20 bg-rose-400/[0.04] p-8">
            <div className="text-[10px] uppercase tracking-[0.2em] text-rose-300">Error</div>
            <h2 className="font-heading text-2xl text-white mt-3 tracking-tight">
              No hemos podido procesar tu carta.
            </h2>
            <p className="text-white/70 text-sm mt-3 max-w-xl leading-relaxed">
              {row.error_message ?? "El análisis IA no ha devuelto un resultado válido."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={runOcr}
                disabled={processing}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-white text-[color:var(--tc-bg)] text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40"
              >
                <RefreshCw className="w-4 h-4" /> Reintentar análisis
              </button>
              <Link
                to="/carta"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-white/15 text-white/80 text-sm hover:bg-white/[0.04] transition-colors"
              >
                Crear carta manualmente
              </Link>
            </div>
          </div>
        )}

        {!loading && row && row.status === "needs_review" && (
          <div className="mt-10">
            <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
              <div className="text-sm text-white/70">
                <span className="text-white/40">Detectados:</span> {validCount} platos válidos
                {lowConfidence && (
                  <span className="ml-3 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-amber-400/25 text-amber-300 bg-amber-400/[0.06]">
                    baja confianza en algunas líneas — revisa
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={runOcr}
                  disabled={processing}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/10 text-xs text-white/70 hover:bg-white/[0.04] transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${processing ? "animate-spin" : ""}`} /> Reanalizar
                </button>
                <button
                  onClick={add}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/10 text-xs text-white/70 hover:bg-white/[0.04] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Añadir plato
                </button>
                <button
                  onClick={confirm}
                  disabled={confirming || validCount === 0}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-white text-[color:var(--tc-bg)] text-xs font-medium hover:bg-white/90 transition-colors disabled:opacity-40"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Confirmar {validCount} platos
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_100px_minmax(0,2fr)_70px_40px] gap-2 px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-white/45 bg-white/[0.02] border-b border-white/[0.06]">
                <span>Plato</span>
                <span>Categoría</span>
                <span className="text-right">Precio (€)</span>
                <span>Descripción</span>
                <span className="text-right">Conf.</span>
                <span />
              </div>
              <div className="max-h-[560px] overflow-y-auto divide-y divide-white/[0.05]">
                {dishes.length === 0 && (
                  <div className="px-4 py-10 text-center text-white/50 text-sm">
                    La IA no detectó ningún plato. Añade platos manualmente o reintenta.
                  </div>
                )}
                {dishes.map((d, i) => {
                  const conf = d.confidence;
                  const confClass =
                    conf == null
                      ? "text-white/40"
                      : conf < 0.5
                        ? "text-rose-300"
                        : conf < 0.75
                          ? "text-amber-300"
                          : "text-emerald-300";
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_100px_minmax(0,2fr)_70px_40px] gap-2 px-4 py-2 items-center hover:bg-white/[0.02]"
                    >
                      <input
                        value={d.name}
                        onChange={(e) => update(i, { name: e.target.value })}
                        placeholder="Nombre"
                        className="bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none focus:bg-white/[0.03] rounded px-2 py-1.5"
                      />
                      <input
                        value={d.category}
                        onChange={(e) => update(i, { category: e.target.value })}
                        placeholder="Categoría"
                        className="bg-transparent text-sm text-white/85 placeholder:text-white/25 focus:outline-none focus:bg-white/[0.03] rounded px-2 py-1.5"
                      />
                      <input
                        value={d.sale_price}
                        onChange={(e) => update(i, { sale_price: e.target.value })}
                        placeholder="0,00"
                        inputMode="decimal"
                        className="bg-transparent text-sm text-white/85 placeholder:text-white/25 focus:outline-none focus:bg-white/[0.03] rounded px-2 py-1.5 text-right tabular-nums"
                      />
                      <input
                        value={d.description}
                        onChange={(e) => update(i, { description: e.target.value })}
                        placeholder="—"
                        className="bg-transparent text-sm text-white/70 placeholder:text-white/25 focus:outline-none focus:bg-white/[0.03] rounded px-2 py-1.5"
                      />
                      <span className={`text-xs tabular-nums text-right ${confClass}`}>
                        {conf == null ? "—" : `${Math.round(conf * 100)}%`}
                      </span>
                      <button
                        onClick={() => remove(i)}
                        className="text-white/30 hover:text-rose-300 transition-colors"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="mt-4 text-xs text-white/40">
              Nada se guarda como plato real hasta que pulsas "Confirmar". Revisa nombres,
              categorías y precios: la IA puede equivocarse.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}