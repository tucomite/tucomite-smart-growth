import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Check, FileText, Table2, Camera, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Configura tu comité — TuComité" }] }),
  component: OnboardingPage,
});

type FormState = {
  name: string;
  business_type: string;
  cuisine_type: string;
  employees_range: string;
  locations_count: string;
  city: string;
  country: string;
  menu_source: string;
};

const initial: FormState = {
  name: "", business_type: "", cuisine_type: "", employees_range: "",
  locations_count: "", city: "", country: "", menu_source: "",
};

const businessTypes = ["Restaurante", "Bar / Cafetería", "Bistró", "Fast casual", "Fine dining", "Cadena / Franquicia", "Food truck", "Otro"];
const cuisineTypes = ["Mediterránea", "Española / Tapas", "Italiana", "Asiática", "Latinoamericana", "Americana", "Fusión", "Vegetariana / Vegana", "Otra"];
const employeeRanges = ["1–3", "4–10", "11–25", "26–50", "50+"];
const locationsCount = ["1 local", "2–3 locales", "4–10 locales", "Más de 10"];
const menuSources = [
  { id: "pdf", label: "Sí, subir PDF", icon: FileText, desc: "Sube el PDF de tu carta actual." },
  { id: "excel", label: "Sí, subir Excel", icon: Table2, desc: "Importa tu carta desde Excel o CSV." },
  { id: "photos", label: "Sí, subir fotografías", icon: Camera, desc: "Sube fotos y las convertimos." },
  { id: "scratch", label: "No, quiero crearla desde cero", icon: Sparkles, desc: "Empieza con una carta en blanco." },
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);

  const steps = [
    { title: "Empecemos por lo básico", subtitle: "¿Cómo se llama tu restaurante?" },
    { title: "Tu negocio", subtitle: "Cuéntanos qué tipo de sitio es." },
    { title: "Tu cocina", subtitle: "El estilo que define tu carta." },
    { title: "Tu equipo", subtitle: "¿Cuántas personas trabajan contigo?" },
    { title: "Locales", subtitle: "¿Cuántos locales gestionas?" },
    { title: "Ubicación", subtitle: "Dónde te encontramos." },
    { title: "Tu carta", subtitle: "¿Ya tienes una carta?" },
  ];

  const total = steps.length;
  const progress = ((step + 1) / total) * 100;

  const canContinue = () => {
    switch (step) {
      case 0: return form.name.trim().length > 1;
      case 1: return !!form.business_type;
      case 2: return !!form.cuisine_type;
      case 3: return !!form.employees_range;
      case 4: return !!form.locations_count;
      case 5: return form.city.trim().length > 1 && form.country.trim().length > 1;
      case 6: return !!form.menu_source;
      default: return false;
    }
  };

  async function finish() {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No hay sesión");
      const { data: restaurant, error: restErr } = await supabase
        .from("restaurants")
        .insert({ owner_id: userData.user.id, ...form })
        .select("id")
        .single();
      if (restErr) throw restErr;
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true, restaurant_id: restaurant.id })
        .eq("id", userData.user.id);
      if (profErr) throw profErr;
      toast.success("Tu comité está listo");
      navigate({ to: "/carta/importar" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (!canContinue()) return;
    if (step === total - 1) finish();
    else setStep((s) => s + 1);
  }

  return (
    <div className="tc-light min-h-screen bg-[color:var(--cream)] flex flex-col">
      {/* Top bar */}
      <header className="border-b border-charcoal/10 bg-[color:var(--cream)]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-heading text-charcoal text-sm">TuComité</span>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              const { clearTenantCache } = await import("@/lib/tenant-cache");
              clearTenantCache();
              navigate({ to: "/" });
            }}
            className="text-xs text-charcoal/50 hover:text-charcoal transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
        <div className="h-[2px] bg-charcoal/5 relative">
          <motion.div
            className="absolute left-0 top-0 h-full bg-[color:var(--gold)]"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-12 sm:py-20">
        <div className="w-full max-w-[560px]">
          <p className="text-xs uppercase tracking-[0.15em] text-charcoal/40 mb-4">
            Paso {step + 1} de {total}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="font-heading text-3xl sm:text-4xl text-charcoal tracking-tight">
                {steps[step].title}
              </h1>
              <p className="text-charcoal/60 mt-3 mb-10">{steps[step].subtitle}</p>

              <div className="space-y-3">
                {step === 0 && (
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej. Casa Manolo"
                    className="auth-input text-lg h-14"
                    onKeyDown={(e) => e.key === "Enter" && next()}
                  />
                )}
                {step === 1 && (
                  <OptionGrid options={businessTypes} value={form.business_type} onSelect={(v) => setForm({ ...form, business_type: v })} />
                )}
                {step === 2 && (
                  <OptionGrid options={cuisineTypes} value={form.cuisine_type} onSelect={(v) => setForm({ ...form, cuisine_type: v })} />
                )}
                {step === 3 && (
                  <OptionGrid options={employeeRanges} value={form.employees_range} onSelect={(v) => setForm({ ...form, employees_range: v })} columns={2} />
                )}
                {step === 4 && (
                  <OptionGrid options={locationsCount} value={form.locations_count} onSelect={(v) => setForm({ ...form, locations_count: v })} columns={2} />
                )}
                {step === 5 && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      autoFocus
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Ciudad"
                      className="auth-input h-12"
                    />
                    <input
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      placeholder="País"
                      className="auth-input h-12"
                      onKeyDown={(e) => e.key === "Enter" && next()}
                    />
                  </div>
                )}
                {step === 6 && (
                  <div className="grid gap-3">
                    {menuSources.map((opt) => {
                      const Icon = opt.icon;
                      const active = form.menu_source === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setForm({ ...form, menu_source: opt.id })}
                          className={`text-left flex items-start gap-4 p-4 rounded-xl border transition-all ${
                            active
                              ? "border-charcoal bg-white shadow-sm"
                              : "border-charcoal/10 bg-white/60 hover:border-charcoal/30 hover:bg-white"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-[color:var(--gold)]/20 text-charcoal" : "bg-charcoal/5 text-charcoal/60"}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-charcoal text-sm">{opt.label}</div>
                            <div className="text-xs text-charcoal/55 mt-0.5">{opt.desc}</div>
                          </div>
                          {active && <Check className="w-5 h-5 text-charcoal shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Nav */}
          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
              className="inline-flex items-center gap-2 text-sm text-charcoal/60 hover:text-charcoal disabled:opacity-30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Atrás
            </button>
            <button
              onClick={next}
              disabled={!canContinue() || saving}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-charcoal text-cream text-sm font-medium hover:bg-charcoal/90 transition-colors disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : step === total - 1 ? (
                <>Finalizar <Check className="w-4 h-4" /></>
              ) : (
                <>Continuar <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function OptionGrid({
  options,
  value,
  onSelect,
  columns = 1,
}: {
  options: readonly string[];
  value: string;
  onSelect: (v: string) => void;
  columns?: 1 | 2;
}) {
  return (
    <div className={`grid gap-2.5 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`text-left flex items-center justify-between px-4 py-3.5 rounded-lg border transition-all ${
              active
                ? "border-charcoal bg-white shadow-sm"
                : "border-charcoal/10 bg-white/60 hover:border-charcoal/30 hover:bg-white"
            }`}
          >
            <span className={`text-sm ${active ? "text-charcoal font-medium" : "text-charcoal/80"}`}>{opt}</span>
            {active && <Check className="w-4 h-4 text-charcoal" />}
          </button>
        );
      })}
    </div>
  );
}