import { motion } from "framer-motion";
import { ArrowRight, Mail } from "lucide-react";
import { useState } from "react";

export function CTAFinalSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <section id="cta-final" className="relative py-24 sm:py-32 bg-charcoal overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-gold)_1px,_transparent_1px)] bg-[length:24px_24px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-cream"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Empieza descubriendo{" "}
            <span className="gold-gradient-text">cuánto dinero pierde tu carta</span>{" "}
            cada mes
          </h2>
          <p className="mt-6 text-lg text-cream/70 max-w-2xl mx-auto">
            Déjanos tu email y te contactamos en menos de 24 horas para empezar tu auditoría gratuita.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10"
        >
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cream/40" />
                <input
                  type="email"
                  required
                  placeholder="tu@restaurante.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-full bg-cream/10 border border-cream/20 pl-12 pr-4 py-4 text-cream placeholder:text-cream/40 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all"
                />
              </div>
              <button
                type="submit"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gold px-8 py-4 text-base font-semibold text-charcoal transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/20"
              >
                Solicitar auditoría gratuita
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          ) : (
            <div className="rounded-2xl border border-gold/30 bg-gold/10 px-8 py-6 max-w-lg mx-auto">
              <p className="text-cream font-medium">
                ¡Gracias! Te escribiremos pronto a tu email.
              </p>
            </div>
          )}

          <p className="mt-4 text-sm text-cream/40">
            Sin spam. Puedes darte de baja en cualquier momento.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
