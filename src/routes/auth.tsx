import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";

type Mode = "login" | "register" | "forgot";

// Prevent open-redirect: only accept same-origin absolute paths that do not
// try to escape via protocol-relative URLs or backslash tricks.
function sanitizeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v.startsWith("/")) return undefined;
  if (v.startsWith("//") || v.startsWith("/\\")) return undefined;
  if (/[\r\n\t]/.test(v)) return undefined;
  if (v.length > 512) return undefined;
  return v;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: sanitizeRedirect(s.redirect),
    mode: (s.mode === "register" || s.mode === "forgot" ? s.mode : "login") as Mode,
  }),
  head: () => ({
    meta: [
      { title: "Acceder — TuComité" },
      { name: "description", content: "Accede a tu cuenta de TuComité." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect ?? "/dashboard" });
    });
  }, [navigate, redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido de vuelta");
        navigate({ to: redirect ?? "/dashboard" });
      } else if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Empecemos.");
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Te hemos enviado un enlace para recuperar tu contraseña.");
        setMode("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ha ocurrido un error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("No se pudo iniciar sesión con Google");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: redirect ?? "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-[color:var(--cream)] flex">
      {/* Left brand pane */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-1/2 relative bg-charcoal text-cream overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--gold)_18%,transparent),transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <Link to="/" className="inline-flex items-center gap-2 text-cream/90 hover:text-cream text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver a TuComité
          </Link>
          <div>
            <Logo size={72} glow alt="TuComité" />
            <div className="h-8" />
            <h1 className="font-heading text-4xl xl:text-5xl leading-tight text-cream mb-6">
              El comité inteligente<br />para tu restaurante.
            </h1>
            <p className="text-cream/70 text-base max-w-md leading-relaxed">
              Analiza tu carta, descubre qué platos te hacen perder dinero y recibe decisiones claras para aumentar tu margen.
            </p>
          </div>
          <p className="text-cream/40 text-xs">© 2026 TuComité</p>
        </div>
      </div>

      {/* Right form pane */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <Link to="/" className="lg:hidden inline-flex items-center gap-2 text-charcoal/70 hover:text-charcoal text-sm mb-8">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="font-heading text-3xl text-charcoal tracking-tight">
                {mode === "login" && "Bienvenido de vuelta"}
                {mode === "register" && "Crea tu cuenta"}
                {mode === "forgot" && "Recupera tu acceso"}
              </h2>
              <p className="text-charcoal/60 text-sm mt-2 mb-8">
                {mode === "login" && "Accede a tu comité."}
                {mode === "register" && "Empieza tu auditoría en 3 minutos."}
                {mode === "forgot" && "Te enviaremos un enlace por email."}
              </p>

              {mode !== "forgot" && (
                <>
                  <button
                    onClick={handleGoogle}
                    disabled={loading}
                    className="w-full h-11 rounded-lg border border-charcoal/15 bg-white hover:bg-charcoal/[0.02] transition-colors flex items-center justify-center gap-3 text-sm font-medium text-charcoal disabled:opacity-50"
                  >
                    <GoogleIcon />
                    Continuar con Google
                  </button>
                  <div className="flex items-center gap-4 my-6">
                    <div className="h-px flex-1 bg-charcoal/10" />
                    <span className="text-xs text-charcoal/40 uppercase tracking-wider">o</span>
                    <div className="h-px flex-1 bg-charcoal/10" />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <Field label="Nombre completo">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Carlos García"
                      className="auth-input"
                    />
                  </Field>
                )}
                <Field label="Email">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@restaurante.com"
                    className="auth-input"
                  />
                </Field>
                {mode !== "forgot" && (
                  <Field
                    label="Contraseña"
                    action={
                      mode === "login" ? (
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-xs text-charcoal/60 hover:text-charcoal transition-colors"
                        >
                          ¿Olvidaste?
                        </button>
                      ) : null
                    }
                  >
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="auth-input"
                    />
                  </Field>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-charcoal text-cream text-sm font-medium hover:bg-charcoal/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {mode === "login" && "Iniciar sesión"}
                      {mode === "register" && "Crear cuenta"}
                      {mode === "forgot" && "Enviar enlace"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center text-sm text-charcoal/60">
                {mode === "login" && (
                  <>
                    ¿Nuevo aquí?{" "}
                    <button onClick={() => setMode("register")} className="text-charcoal font-medium hover:underline">
                      Crea una cuenta
                    </button>
                  </>
                )}
                {mode === "register" && (
                  <>
                    ¿Ya tienes cuenta?{" "}
                    <button onClick={() => setMode("login")} className="text-charcoal font-medium hover:underline">
                      Inicia sesión
                    </button>
                  </>
                )}
                {mode === "forgot" && (
                  <button onClick={() => setMode("login")} className="text-charcoal font-medium hover:underline">
                    Volver a inicio de sesión
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-charcoal/70 tracking-wide">{label}</label>
        {action}
      </div>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}