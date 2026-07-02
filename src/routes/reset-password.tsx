import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nueva contraseña — TuComité" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Contraseña actualizada");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--cream)] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px]">
        <Link to="/auth" search={{ mode: "login", redirect: undefined }} className="inline-flex items-center gap-2 text-charcoal/70 hover:text-charcoal text-sm mb-8">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <h2 className="font-heading text-3xl text-charcoal">Nueva contraseña</h2>
        <p className="text-charcoal/60 text-sm mt-2 mb-8">
          {ready ? "Elige una contraseña nueva para tu cuenta." : "Verificando el enlace de recuperación…"}
        </p>
        {ready && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-charcoal/70 tracking-wide">Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="auth-input mt-1.5"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-charcoal text-cream text-sm font-medium hover:bg-charcoal/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<>Guardar <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}