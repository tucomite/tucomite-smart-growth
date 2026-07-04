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
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    (async () => {
      try {
        const url = new URL(window.location.href);
        // PKCE flow: ?code=...
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          // Clean the code out of the URL so refresh doesn't retry it.
          window.history.replaceState({}, "", url.pathname);
        } else {
          // Legacy hash flow: #access_token=...&type=recovery — the client
          // auto-parses this on load; getSession confirms it succeeded.
          const hash = window.location.hash;
          if (hash.includes("error")) {
            const params = new URLSearchParams(hash.replace(/^#/, ""));
            throw new Error(params.get("error_description") ?? "Enlace no válido");
          }
        }
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session) setReady(true);
        else if (!cancelled) {
          // Give onAuthStateChange a moment; otherwise show a helpful error.
          setTimeout(() => {
            if (cancelled) return;
            setReady((r) => {
              if (!r) setError("El enlace de recuperación ha caducado o ya se ha usado. Solicita uno nuevo.");
              return r;
            });
          }, 1500);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Enlace no válido");
      }
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      const { clearTenantCache } = await import("@/lib/tenant-cache");
      clearTenantCache();
      toast.success("Contraseña actualizada. Inicia sesión con la nueva.");
      navigate({ to: "/auth", search: { mode: "login", redirect: undefined } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tc-light min-h-screen bg-[color:var(--cream)] flex items-center justify-center p-6 relative z-0">
      <div className="w-full max-w-[400px]">
        <Link to="/auth" search={{ mode: "login", redirect: undefined }} className="inline-flex items-center gap-2 text-charcoal/70 hover:text-charcoal text-sm mb-8">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <h2 className="font-heading text-3xl text-charcoal">Nueva contraseña</h2>
        <p className="text-charcoal/60 text-sm mt-2 mb-8">
          {error
            ? error
            : ready
            ? "Elige una contraseña nueva para tu cuenta."
            : "Verificando el enlace de recuperación…"}
        </p>
        {error && (
          <Link
            to="/auth"
            search={{ mode: "forgot" as const, redirect: undefined }}
            className="inline-flex items-center gap-2 text-sm text-charcoal font-medium underline"
          >
            Solicitar un nuevo enlace <ArrowRight className="w-4 h-4" />
          </Link>
        )}
        {ready && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-charcoal/70 tracking-wide">Nueva contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="auth-input mt-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal/70 tracking-wide">Confirmar contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
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