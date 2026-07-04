import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { listInvoices, uploadInvoice, parseInvoiceDemo } from "@/lib/invoices.functions";
import { Upload, FileText, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/facturas/")({
  head: () => ({ meta: [{ title: "Facturas — TuComité" }] }),
  component: FacturasIndex,
});

const STATUS_LABEL: Record<string, string> = {
  uploaded: "Subida",
  processing: "Procesando",
  needs_review: "Revisar",
  ready_to_apply: "Lista",
  applied: "Aplicada",
  failed: "Error",
  reversed: "Revertida",
};

const STATUS_CLASS: Record<string, string> = {
  uploaded: "bg-charcoal/[0.06] text-charcoal/70",
  processing: "bg-blue-50 text-blue-700",
  needs_review: "bg-amber-50 text-amber-700",
  ready_to_apply: "bg-emerald-50 text-emerald-700",
  applied: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-50 text-red-700",
  reversed: "bg-charcoal/[0.06] text-charcoal/60",
};

function fmtEUR(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(v));
}
function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function FacturasIndex() {
  const router = useRouter();
  const listFn = useServerFn(listInvoices);
  const uploadFn = useServerFn(uploadInvoice);
  const parseFn = useServerFn(parseInvoiceDemo);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const q = useQuery({ queryKey: ["invoices"], queryFn: () => listFn() });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      const base64 = btoa(bin);
      const uploaded = await uploadFn({
        data: { filename: file.name, mimeType: file.type || "application/octet-stream", base64 },
      });
      if (uploaded.deduped) return uploaded;
      await parseFn({ data: { invoice_id: uploaded.invoice_id } });
      return uploaded;
    },
    onSuccess: async (res) => {
      toast.success(res.deduped ? "Factura duplicada detectada" : "Factura procesada");
      await q.refetch();
      router.navigate({ to: "/facturas/$invoiceId", params: { invoiceId: res.invoice_id } });
    },
    onError: (err: Error) => toast.error(err.message || "Error al subir factura"),
  });

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    try {
      await upload.mutateAsync(f);
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppShell>
      <div className="px-6 sm:px-10 lg:px-16 py-12 sm:py-16 max-w-6xl mx-auto">
        <header className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">Módulo · Facturas</p>
            <h1 className="font-heading text-4xl sm:text-5xl text-charcoal mt-3 tracking-tight leading-[1.05]">Facturas</h1>
            <p className="text-charcoal/60 text-lg mt-3 max-w-xl">
              Sube facturas de proveedor. El OCR demo detecta líneas para que tú revises y confirmes antes de aplicar al inventario.
            </p>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPick}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-charcoal text-white text-sm font-medium hover:bg-charcoal/90 disabled:opacity-60 transition"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Subir factura
            </button>
          </div>
        </header>

        <section className="mt-10">
          {q.isLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-2xl border border-charcoal/10 bg-white/60 animate-pulse" />
              ))}
            </div>
          )}
          {q.isError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              No se pudieron cargar las facturas.
            </div>
          )}
          {q.data && q.data.length === 0 && (
            <div className="rounded-2xl border border-dashed border-charcoal/15 bg-white p-10 text-center">
              <FileText className="w-8 h-8 text-charcoal/40 mx-auto" />
              <p className="mt-3 text-charcoal/70">Aún no hay facturas. Sube la primera para empezar.</p>
            </div>
          )}
          {q.data && q.data.length > 0 && (
            <ul className="divide-y divide-charcoal/10 rounded-2xl border border-charcoal/10 bg-white overflow-hidden">
              {q.data.map((inv) => (
                <li key={inv.id}>
                  <Link
                    to="/facturas/$invoiceId"
                    params={{ invoiceId: inv.id }}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-charcoal/[0.03] transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-charcoal font-medium truncate">
                          {inv.invoice_number || "Sin número"}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full ${STATUS_CLASS[inv.status] ?? ""}`}
                        >
                          {STATUS_LABEL[inv.status] ?? inv.status}
                        </span>
                        {inv.ocr_mode === "demo" && (
                          <span className="text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-charcoal/[0.06] text-charcoal/60">
                            OCR demo
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-charcoal/55 flex items-center gap-3 flex-wrap">
                        <span>Fecha: {fmtDate(inv.invoice_date)}</span>
                        <span>Subida: {fmtDate(inv.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-charcoal font-medium">{fmtEUR(Number(inv.total))}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-charcoal/40" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
