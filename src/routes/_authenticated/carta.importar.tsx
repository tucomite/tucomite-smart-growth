import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table2,
  Sparkles,
  FileText,
  Camera,
  Upload,
  Trash2,
  Loader2,
  Check,
  ArrowLeft,
  Plus,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/carta/importar")({
  head: () => ({ meta: [{ title: "Importar carta — TuComité" }] }),
  component: ImportarCartaPage,
});

type Tab = "excel" | "scratch" | "pdf" | "photos";

type ParsedDish = {
  name: string;
  category: string;
  sale_price: string; // keep as string in the editor, coerced on confirm
  description: string;
};

const NAME_KEYS = ["name", "nombre", "plato", "dish", "producto"];
const CATEGORY_KEYS = ["category", "categoria", "categoría", "seccion", "sección", "type"];
const PRICE_KEYS = ["price", "precio", "pvp", "sale_price", "precio_venta"];
const DESC_KEYS = ["description", "descripcion", "descripción", "detalle", "notes", "notas"];

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of Object.keys(row)) {
    const norm = k.trim().toLowerCase();
    if (keys.includes(norm)) {
      const v = row[k];
      if (v === null || v === undefined) return "";
      return String(v).trim();
    }
  }
  return "";
}

function normalizePrice(raw: string): string {
  if (!raw) return "";
  const cleaned = raw
    .replace(/[€$£\s]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // thousand dots
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : "";
}

function ImportarCartaPage() {
  const [tab, setTab] = useState<Tab>("excel");
  return (
    <AppShell
      eyebrow={
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Importar carta
        </span>
      }
    >
      <div className="px-6 sm:px-12 lg:px-16 py-14 sm:py-20 max-w-5xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </Link>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--tc-gold)] font-medium">
          Configuración inicial · Carta
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl text-white mt-5 tracking-[-0.022em] leading-[1.05]">
          Importa tu carta.
        </h1>
        <p className="text-white/60 text-[15.5px] mt-5 max-w-2xl leading-relaxed">
          El Comité solo analiza datos reales. Elige un método y confirma los platos antes
          de que empecemos a calcular márgenes, coste y recomendaciones.
        </p>

        <div className="mt-10 flex flex-wrap gap-2 border-b border-white/10">
          <TabButton current={tab} value="excel" onClick={() => setTab("excel")} icon={<Table2 className="w-4 h-4" />}>
            Excel / CSV
          </TabButton>
          <TabButton current={tab} value="scratch" onClick={() => setTab("scratch")} icon={<Sparkles className="w-4 h-4" />}>
            Crear desde cero
          </TabButton>
          <TabButton current={tab} value="pdf" onClick={() => setTab("pdf")} icon={<FileText className="w-4 h-4" />}>
            PDF
          </TabButton>
          <TabButton current={tab} value="photos" onClick={() => setTab("photos")} icon={<Camera className="w-4 h-4" />}>
            Fotografías
          </TabButton>
        </div>

        <div className="mt-10">
          {tab === "excel" && <ExcelImporter />}
          {tab === "scratch" && <ScratchPanel />}
          {tab === "pdf" && <PdfImporter />}
          {tab === "photos" && <PhotosImporter />}
        </div>
      </div>
    </AppShell>
  );
}

function TabButton({
  current,
  value,
  onClick,
  icon,
  children,
}: {
  current: Tab;
  value: Tab;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
        active ? "text-white" : "text-white/50 hover:text-white/80"
      }`}
    >
      {icon}
      {children}
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[color:var(--tc-gold)]" />
      )}
    </button>
  );
}

/* ----------------------------- Excel / CSV ----------------------------- */

function ExcelImporter() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedDish[]>([]);
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const valid = useMemo(
    () => rows.filter((r) => r.name.trim().length > 0),
    [rows],
  );

  async function handleFile(f: File) {
    setFile(f);
    setParsing(true);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: false,
      });
      const parsed: ParsedDish[] = json.map((row) => ({
        name: pick(row, NAME_KEYS),
        category: pick(row, CATEGORY_KEYS),
        sale_price: normalizePrice(pick(row, PRICE_KEYS)),
        description: pick(row, DESC_KEYS),
      }));
      const cleaned = parsed.filter((r) => r.name.length > 0);
      if (cleaned.length === 0) {
        toast.error(
          "No se detectaron platos. Asegúrate de que hay una columna llamada 'nombre' o 'plato'.",
        );
        setRows([]);
      } else {
        setRows(cleaned);
        toast.success(`${cleaned.length} platos detectados. Revisa antes de confirmar.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer el fichero.");
      setRows([]);
    } finally {
      setParsing(false);
    }
  }

  function updateRow(i: number, patch: Partial<ParsedDish>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addRow() {
    setRows((prev) => [...prev, { name: "", category: "", sale_price: "", description: "" }]);
  }
  function reset() {
    setFile(null);
    setRows([]);
  }

  async function confirm() {
    if (valid.length === 0) {
      toast.error("No hay platos válidos que confirmar.");
      return;
    }
    setConfirming(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sesión no válida");
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", userData.user.id)
        .maybeSingle();
      const rid = profile?.restaurant_id;
      if (!rid) throw new Error("Restaurante no encontrado");

      const payloadDishes = valid.map((r) => ({
        name: r.name.trim(),
        category: r.category.trim() || null,
        sale_price: r.sale_price.trim() === "" ? null : r.sale_price.trim(),
        description: r.description.trim() || null,
      }));

      const { data: imp, error: impErr } = await supabase
        .from("menu_imports")
        .insert({
          restaurant_id: rid,
          created_by: userData.user.id,
          source: "excel",
          status: "needs_review",
          original_filename: file?.name ?? null,
          extracted_json: { dishes: payloadDishes },
        })
        .select("id")
        .single();
      if (impErr || !imp) throw impErr ?? new Error("No se pudo registrar la importación");

      const { error: rpcErr } = await supabase.rpc("confirm_menu_import", {
        _import_id: imp.id,
      });
      if (rpcErr) throw rpcErr;

      toast.success(`Carta guardada: ${valid.length} platos reales.`);
      navigate({ to: "/carta" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo confirmar la carta.");
    } finally {
      setConfirming(false);
    }
  }

  if (!file) {
    return (
      <div>
        <FileDrop
          accept=".xlsx,.xls,.csv"
          hint="Acepta .xlsx, .xls y .csv. Debe incluir al menos una columna 'nombre' (o 'plato') y opcionalmente 'categoria', 'precio' y 'descripcion'."
          onFile={handleFile}
          busy={parsing}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="text-sm text-white/70 truncate">
          <span className="text-white/40">Fichero:</span> {file.name} ·{" "}
          <span className="text-white/40">{valid.length} platos válidos</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/10 text-xs text-white/70 hover:bg-white/[0.04] transition-colors"
          >
            Descartar
          </button>
          <button
            onClick={addRow}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/10 text-xs text-white/70 hover:bg-white/[0.04] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Añadir plato
          </button>
          <button
            onClick={confirm}
            disabled={confirming || valid.length === 0}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-white text-[color:var(--tc-bg)] text-xs font-medium hover:bg-white/90 transition-colors disabled:opacity-40"
          >
            {confirming ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" /> Confirmar {valid.length} platos
              </>
            )}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_100px_minmax(0,2fr)_40px] gap-2 px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-white/45 bg-white/[0.02] border-b border-white/[0.06]">
          <span>Plato</span>
          <span>Categoría</span>
          <span className="text-right">Precio (€)</span>
          <span>Descripción</span>
          <span />
        </div>
        <div className="max-h-[520px] overflow-y-auto divide-y divide-white/[0.05]">
          {rows.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_100px_minmax(0,2fr)_40px] gap-2 px-4 py-2 items-center hover:bg-white/[0.02]"
            >
              <input
                value={r.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                placeholder="Nombre"
                className="bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none focus:bg-white/[0.03] rounded px-2 py-1.5"
              />
              <input
                value={r.category}
                onChange={(e) => updateRow(i, { category: e.target.value })}
                placeholder="Categoría"
                className="bg-transparent text-sm text-white/85 placeholder:text-white/25 focus:outline-none focus:bg-white/[0.03] rounded px-2 py-1.5"
              />
              <input
                value={r.sale_price}
                onChange={(e) => updateRow(i, { sale_price: e.target.value })}
                placeholder="0,00"
                inputMode="decimal"
                className="bg-transparent text-sm text-white/85 placeholder:text-white/25 focus:outline-none focus:bg-white/[0.03] rounded px-2 py-1.5 text-right tabular-nums"
              />
              <input
                value={r.description}
                onChange={(e) => updateRow(i, { description: e.target.value })}
                placeholder="—"
                className="bg-transparent text-sm text-white/70 placeholder:text-white/25 focus:outline-none focus:bg-white/[0.03] rounded px-2 py-1.5"
              />
              <button
                onClick={() => removeRow(i)}
                className="text-white/30 hover:text-rose-300 transition-colors"
                aria-label="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-white/40">
        Las filas sin nombre se ignoran. Los precios sin valor se guardan vacíos y podrás
        rellenarlos después desde la carta.
      </p>
    </div>
  );
}

/* ------------------------------ Scratch ------------------------------- */

function ScratchPanel() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8">
      <Sparkles className="w-6 h-6 text-[color:var(--tc-gold)]" />
      <h2 className="font-heading text-2xl text-white mt-5 tracking-tight">
        Crea tu carta desde cero
      </h2>
      <p className="text-white/60 text-sm mt-3 max-w-xl leading-relaxed">
        Se abrirá el editor real de carta. Podrás añadir platos con nombre, categoría,
        precio, coste y margen. Todo se guarda en tu base de datos y el Comité empezará a
        analizar en cuanto haya suficientes platos con precio y coste.
      </p>
      <Link
        to="/carta"
        className="inline-flex items-center gap-2 mt-8 h-11 px-5 rounded-lg bg-white text-[color:var(--tc-bg)] text-sm font-medium hover:bg-white/90 transition-colors"
      >
        <Plus className="w-4 h-4" /> Abrir editor de carta
      </Link>
    </div>
  );
}

/* ------------------------------- PDF ---------------------------------- */

async function getCurrentRestaurantId(): Promise<{ rid: string; uid: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sesión no válida");
  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("id", userData.user.id)
    .maybeSingle();
  const rid = profile?.restaurant_id;
  if (!rid) throw new Error("Restaurante no encontrado");
  return { rid, uid: userData.user.id };
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

function PdfImporter() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);

  async function handleFile(f: File) {
    if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) {
      toast.error("Solo se aceptan ficheros PDF.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      toast.error("El PDF supera el límite de 25 MB.");
      return;
    }
    setUploading(true);
    try {
      const { rid, uid } = await getCurrentRestaurantId();
      const importId = crypto.randomUUID();
      const path = `${rid}/pdf/${importId}/${sanitizeName(f.name)}`;
      const { error: upErr } = await supabase.storage
        .from("menus")
        .upload(path, f, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("menu_imports").insert({
        id: importId,
        restaurant_id: rid,
        created_by: uid,
        source: "pdf",
        status: "uploaded",
        storage_path: path,
        original_filename: f.name,
      });
      if (insErr) throw insErr;
      toast.success("PDF recibido. Iniciando análisis con IA…");
      navigate({ to: "/carta/importar/$importId", params: { importId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir el PDF.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <FileDrop
      accept="application/pdf,.pdf"
      hint="Sube el PDF de tu carta. Se guardará en tu bucket privado y la IA extraerá los platos."
      onFile={handleFile}
      busy={uploading}
    />
  );
}

/* --------------------------- Fotografías ------------------------------ */

const PHOTO_EXT = /\.(jpe?g|png|heic|webp)$/i;
const PHOTO_MIME = /^image\/(jpe?g|png|heic|webp)$/i;

function PhotosImporter() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const valid: File[] = [];
    for (const f of incoming) {
      if (!PHOTO_MIME.test(f.type) && !PHOTO_EXT.test(f.name)) {
        toast.error(`Formato no válido: ${f.name}`);
        continue;
      }
      if (f.size > 15 * 1024 * 1024) {
        toast.error(`Imagen supera 15 MB: ${f.name}`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length) setFiles((prev) => [...prev, ...valid]);
  }

  function removeAt(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function upload() {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const { rid, uid } = await getCurrentRestaurantId();
      const importId = crypto.randomUUID();
      const uploaded: { path: string; name: string; size: number }[] = [];
      for (const f of files) {
        const path = `${rid}/photos/${importId}/${crypto.randomUUID()}-${sanitizeName(f.name)}`;
        const { error: upErr } = await supabase.storage
          .from("menus")
          .upload(path, f, { contentType: f.type || "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        uploaded.push({ path, name: f.name, size: f.size });
      }
      const { error: insErr } = await supabase.from("menu_imports").insert({
        id: importId,
        restaurant_id: rid,
        created_by: uid,
        source: "photos",
        status: "uploaded",
        storage_path: `${rid}/photos/${importId}`,
        original_filename: files.map((f) => f.name).join(", ").slice(0, 250),
        extracted_json: { photos: uploaded },
      });
      if (insErr) throw insErr;
      toast.success(`${uploaded.length} fotografía(s) recibida(s). Iniciando análisis…`);
      navigate({ to: "/carta/importar/$importId", params: { importId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron subir las imágenes.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <FileDrop
        accept="image/jpeg,image/png,image/heic,image/webp,.jpg,.jpeg,.png,.heic,.webp"
        hint="Sube una o varias fotografías de tu carta (jpg, png, heic, webp). Puedes añadir más antes de confirmar."
        onFile={(f) => addFiles([f])}
        onFiles={addFiles}
        multiple
        busy={false}
      />

      {files.length > 0 && (
        <div className="mt-6 rounded-xl border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/[0.06]">
            <span className="text-[11px] uppercase tracking-[0.15em] text-white/50">
              {files.length} imagen(es) seleccionada(s)
            </span>
            <button
              onClick={upload}
              disabled={uploading}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-white text-[color:var(--tc-bg)] text-xs font-medium hover:bg-white/90 transition-colors disabled:opacity-40"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo…
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Subir {files.length} imagen(es)
                </>
              )}
            </button>
          </div>
          <ul className="divide-y divide-white/[0.05] max-h-80 overflow-y-auto">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-white/80"
              >
                <span className="truncate">{f.name}</span>
                <span className="text-white/40 text-xs tabular-nums">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
                <button
                  onClick={() => removeAt(i)}
                  disabled={uploading}
                  className="text-white/30 hover:text-rose-300 transition-colors"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UploadReceivedPanel({
  kind,
  filename,
}: {
  kind: "pdf" | "photos";
  filename: string;
}) {
  const label = kind === "pdf" ? "Carta PDF" : "Fotografías";
  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.03] p-8">
      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
        <Check className="w-3.5 h-3.5" /> Recibido
      </div>
      <h2 className="font-heading text-2xl text-white mt-4 tracking-tight">
        {label} recibida{kind === "photos" ? "s" : ""} correctamente.
      </h2>
      <p className="text-white/70 text-sm mt-3 max-w-xl leading-relaxed">
        <span className="text-white/50">Fichero:</span> {filename}
      </p>
      <p className="text-white/65 text-sm mt-4 max-w-xl leading-relaxed">
        Estamos guardando tu carta en el almacenamiento privado del restaurante. El análisis
        comenzará automáticamente cuando esté disponible. No se generarán platos ni
        recomendaciones sin tu confirmación.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-white text-[color:var(--tc-bg)] text-sm font-medium hover:bg-white/90 transition-colors"
        >
          Ir al dashboard
        </Link>
        <Link
          to="/carta/importar"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-white/15 text-white/80 text-sm hover:bg-white/[0.04] transition-colors"
          reloadDocument
        >
          Subir otra carta
        </Link>
      </div>
    </div>
  );
}

/* ---------------------------- File drop ------------------------------- */

function FileDrop({
  accept,
  hint,
  onFile,
  onFiles,
  multiple,
  busy,
}: {
  accept: string;
  hint: string;
  onFile: (f: File) => void;
  onFiles?: (files: FileList | File[]) => void;
  multiple?: boolean;
  busy: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        const list = e.dataTransfer.files;
        if (!list || list.length === 0) return;
        if (multiple && onFiles) onFiles(list);
        else onFile(list[0]);
      }}
      className={`block rounded-2xl border-2 border-dashed p-14 text-center cursor-pointer transition-colors ${
        hover ? "border-white/40 bg-white/[0.03]" : "border-white/15 hover:border-white/30 bg-white/[0.015]"
      }`}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const list = e.target.files;
          if (!list || list.length === 0) return;
          if (multiple && onFiles) onFiles(list);
          else onFile(list[0]);
        }}
      />
      {busy ? (
        <Loader2 className="w-6 h-6 text-white/60 mx-auto animate-spin" />
      ) : (
        <Upload className="w-6 h-6 text-white/50 mx-auto" />
      )}
      <p className="text-white text-sm mt-4">
        {busy ? "Leyendo fichero…" : "Arrastra el fichero aquí o haz clic para seleccionarlo"}
      </p>
      <p className="text-white/45 text-xs mt-3 max-w-md mx-auto leading-relaxed">{hint}</p>
    </label>
  );
}