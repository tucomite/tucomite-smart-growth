import { Link } from "@tanstack/react-router";
import { FileText, Table2, Camera, Sparkles, Plus, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";

type PendingImport = {
  id: string;
  source: string;
  status: "uploaded" | "processing" | "needs_review" | "failed";
  error_message: string | null;
};

export function DashboardEmptyState({ restaurantName }: { restaurantName?: string }) {
  const [pending, setPending] = useState<PendingImport | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("menu_imports")
        .select("id,source,status,error_message")
        .in("status", ["uploaded", "processing", "needs_review", "failed"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      setPending((data?.[0] as PendingImport | undefined) ?? null);
    }
    load();
    const t = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const primary =
    "inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-white text-[color:var(--tc-bg)] text-sm font-medium hover:bg-white/90 transition-colors";
  const ghost =
    "inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-white/15 text-white/80 text-sm hover:bg-white/[0.04] hover:text-white transition-colors";
  return (
    <AppShell
      eyebrow={
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Pendiente de datos
        </span>
      }
    >
      <div className="px-6 sm:px-12 lg:px-16 py-14 sm:py-20 max-w-4xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--tc-gold)] font-medium">
          {restaurantName || "Tu restaurante"} · Configuración inicial
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl text-white mt-5 tracking-[-0.022em] leading-[1.05]">
          Tu restaurante ya está creado.
        </h1>
        <p className="text-white/60 text-[15.5px] mt-5 max-w-xl leading-relaxed">
          Ahora necesitamos conocer tu carta para poder comenzar el análisis. Hasta
          entonces no mostramos métricas ni recomendaciones inventadas: el Comité solo
          trabaja con datos reales.
        </p>

        {pending && <PendingImportBanner pending={pending} />}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/carta/importar" className={primary}>
            <Sparkles className="w-4 h-4" /> Empezar con la carta
          </Link>
          <Link to="/carta" className={ghost}>
            <Plus className="w-4 h-4" /> Añadir platos manualmente
          </Link>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2">
          <ImportCard
            to="/carta/importar"
            icon={<Table2 className="w-5 h-5" />}
            title="Importar Excel o CSV"
            desc="Sube tu hoja de cálculo con platos, categorías y precios."
          />
          <ImportCard
            to="/carta"
            icon={<Sparkles className="w-5 h-5" />}
            title="Crear carta desde cero"
            desc="Abre el editor y añade categorías y platos uno a uno."
          />
          <ImportCard
            to="/carta/importar"
            icon={<FileText className="w-5 h-5" />}
            title="Subir PDF de la carta"
            desc="Sube tu carta en PDF. Se guarda en almacenamiento privado y queda registrada para su análisis."
          />
          <ImportCard
            to="/carta/importar"
            icon={<Camera className="w-5 h-5" />}
            title="Subir fotografías"
            desc="Sube una o varias fotografías (jpg, png, heic, webp). Se guardan en tu bucket privado."
          />
        </div>

        <p className="text-xs text-white/40 mt-10">
          Todavía no hay datos suficientes para generar recomendaciones.
        </p>
      </div>
    </AppShell>
  );
}

function ImportCard({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 hover:border-white/20 hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/[0.05] text-white/80 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full border text-emerald-300 border-emerald-400/25 bg-emerald-400/[0.06]">
          Disponible
        </span>
      </div>
      <h3 className="font-heading text-lg text-white mt-5 tracking-tight">{title}</h3>
      <p className="text-[13px] text-white/55 mt-2 leading-relaxed">{desc}</p>
    </Link>
  );
}