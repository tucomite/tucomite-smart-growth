import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowUp, X, MessageSquare } from "lucide-react";

const SUGGESTIONS = [
  "¿Cómo aumento mi margen?",
  "¿Qué proveedor me conviene?",
  "¿Qué platos debo eliminar?",
  "¿Qué ingredientes caducan?",
  "¿Qué promociones recomiendas?",
  "¿Qué ha hecho el Comité hoy?",
];

type Msg = { role: "user" | "ai"; text: string };

export function AIAssistantPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");

  function ask(q: string) {
    if (!q.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", text: q },
      {
        role: "ai",
        text:
          "He tomado nota. El Comité está preparando un análisis en profundidad y te lo entregará en tu próximo informe ejecutivo.",
      },
    ]);
    setInput("");
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/40 z-30"
            onClick={onClose}
          />
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 right-0 h-screen w-[360px] max-w-[92vw] shrink-0 border-l border-white/[0.06] bg-[#0E0E11] flex flex-col z-40 shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.6)]"
          >
            <header className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Logo size={32} glow />
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium leading-tight flex items-center gap-2">
                      TuComité AI
                      <span className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--tc-gold)] border border-[color:var(--tc-gold)]/40 rounded px-1.5 py-0.5 leading-none">
                        Beta
                      </span>
                    </p>
                    <p className="text-[11px] text-white/50 leading-tight mt-1">
                      Tu Director de Operaciones
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="lg:hidden text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/45">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Conectado al Comité en tiempo real
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {messages.length === 0 ? (
                <>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                    Preguntas frecuentes
                  </p>
                  <div className="space-y-1.5">
                    {SUGGESTIONS.map((q, i) => (
                      <motion.button
                        key={q}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + i * 0.04 }}
                        onClick={() => ask(q)}
                        className="w-full text-left px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] text-sm text-white/80 hover:text-white transition-all duration-200 flex items-center gap-2 group"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[color:var(--tc-gold)]/70 group-hover:text-[color:var(--tc-gold)] transition-colors shrink-0" />
                        <span className="truncate">{q}</span>
                      </motion.button>
                    ))}
                  </div>
                  <div className="mt-6 rounded-xl border border-white/[0.05] bg-gradient-to-br from-[color:var(--tc-gold)]/[0.06] to-transparent p-4">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--tc-gold)]">
                      Consejo del día
                    </p>
                    <p className="text-[13px] text-white/75 leading-relaxed mt-1.5">
                      Un aumento de 0,50 € en tu plato estrella puede sumar más de
                      600 € al mes sin afectar a la percepción del cliente.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`text-sm leading-relaxed ${
                        m.role === "user"
                          ? "text-white/90 bg-white/[0.05] border border-white/[0.06] rounded-2xl rounded-tr-md px-3.5 py-2.5 ml-6"
                          : "text-white/80"
                      }`}
                    >
                      {m.role === "ai" && (
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[color:var(--tc-gold)] mb-1 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" /> TuComité AI
                        </p>
                      )}
                      {m.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="p-4 border-t border-white/[0.05]"
            >
              <div className="relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pregúntale a tu Comité…"
                  className="w-full h-11 pl-4 pr-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[color:var(--tc-gold)]/40 focus:bg-white/[0.06] transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[color:var(--tc-gold)] text-black flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-white/30 mt-2 text-center">
                Las respuestas son parte del comité inteligente TuComité.
              </p>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}