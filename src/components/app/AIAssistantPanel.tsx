import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowUp, X, MessageSquare, Circle } from "lucide-react";

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
            className="lg:hidden fixed inset-0 bg-[color:var(--tc-scrim)] z-30"
            onClick={onClose}
          />
          <motion.aside
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 right-0 h-screen w-[420px] max-w-[94vw] shrink-0 border-l border-[color:var(--tc-line)] bg-[color:var(--tc-surface)] flex flex-col z-40 shadow-[var(--tc-shadow-lg)]"
          >
            <header className="px-7 pt-7 pb-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <Logo size={32} glow />
                  <div className="min-w-0">
                    <p className="text-[14px] text-[color:var(--tc-text)] font-semibold leading-tight flex items-center gap-2 tracking-tight">
                      TuComité AI
                      <span className="text-[9px] uppercase tracking-[0.22em] text-[color:var(--tc-gold)] border border-[color:var(--tc-gold)]/35 rounded px-1.5 py-0.5 leading-none font-medium">
                        Beta
                      </span>
                    </p>
                    <p className="text-[11px] text-[color:var(--tc-text-mute)] leading-tight mt-1.5">
                      Tu Director de Operaciones
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-[color:var(--tc-text-mute)] hover:text-[color:var(--tc-text)] hover:bg-[color:var(--tc-panel)] p-1.5 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-[color:var(--tc-text-mute)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] animate-pulse" />
                Conectado al Comité en tiempo real
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-7 py-8 space-y-7">
              {messages.length === 0 ? (
                <>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--tc-text-mute)] font-medium">
                    Preguntas frecuentes
                  </p>
                  <div className="space-y-1">
                    {SUGGESTIONS.map((q, i) => (
                      <motion.button
                        key={q}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 + i * 0.03, duration: 0.2 }}
                        onClick={() => ask(q)}
                        className="w-full text-left px-3.5 py-3 rounded-[10px] hover:bg-[color:var(--tc-panel)] text-[13.5px] text-[color:var(--tc-text-dim)] hover:text-[color:var(--tc-text)] transition-all duration-200 flex items-center gap-3 group"
                      >
                        <MessageSquare
                          className="w-3.5 h-3.5 text-[color:var(--tc-text-mute)] group-hover:text-[color:var(--tc-gold)] transition-colors shrink-0"
                          strokeWidth={1.75}
                        />
                        <span className="truncate">{q}</span>
                      </motion.button>
                    ))}
                  </div>
                  <div className="mt-2 relative rounded-[16px] border border-[color:var(--tc-gold)]/20 bg-gradient-to-br from-[color:var(--tc-gold)]/[0.07] via-transparent to-transparent p-5 overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[color:var(--tc-gold)]/12 blur-3xl pointer-events-none" />
                    <p className="relative text-[10px] uppercase tracking-[0.22em] text-[color:var(--tc-gold)] font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" strokeWidth={1.75} /> Consejo del día
                    </p>
                    <p className="relative text-[13.5px] text-[color:var(--tc-text-dim)] leading-relaxed mt-2.5">
                      Un aumento de 0,50 € en tu plato estrella puede sumar más de
                      600 € al mes sin afectar a la percepción del cliente.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`text-[13.5px] leading-relaxed ${
                        m.role === "user"
                          ? "text-[color:var(--tc-text)] bg-[color:var(--tc-panel-strong)] border border-[color:var(--tc-line)] rounded-2xl rounded-tr-md px-4 py-2.5 ml-8 shadow-[var(--tc-shadow-sm)]"
                          : "text-[color:var(--tc-text-dim)]"
                      }`}
                    >
                      {m.role === "ai" && (
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--tc-gold)] mb-1.5 flex items-center gap-1.5 font-medium">
                          <Sparkles className="w-3 h-3" strokeWidth={1.75} /> TuComité AI
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
              className="px-6 pt-4 pb-5 border-t border-[color:var(--tc-line)]"
            >
              <div className="relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pregúntale a tu Comité…"
                  className="w-full h-[52px] pl-4 pr-14 rounded-[14px] bg-[color:var(--tc-input-bg)] border border-[color:var(--tc-line-strong)] text-[14px] text-[color:var(--tc-text)] placeholder:text-[color:var(--tc-text-mute)] focus:outline-none focus:border-[color:var(--tc-gold)]/50 focus:bg-[color:var(--tc-input-bg-focus)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--tc-gold)_18%,transparent)] transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-[10px] bg-gradient-to-b from-[color:var(--tc-gold-light)] via-[color:var(--tc-gold)] to-[color:var(--tc-gold-dark)] text-[color:var(--tc-gold-contrast)] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 active:translate-y-[0.5px] transition-all shadow-[0_0_18px_-6px_rgba(201,169,114,0.5)]"
                >
                  <ArrowUp className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
              <p className="text-[10.5px] text-[color:var(--tc-text-mute)] mt-3 text-center tracking-wide">
                TuComité AI responde con datos reales de tu operación.
              </p>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}