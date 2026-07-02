import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function CTAFinalSection() {
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
            Crea tu cuenta ahora y empieza tu auditoría gratuita en menos de 3 minutos.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex flex-col items-center gap-4"
        >
          <Link
            to="/auth"
            search={{ mode: "register" }}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-gold px-10 py-4 text-base font-semibold text-charcoal transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/20"
          >
            Empezar auditoría gratuita
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="text-sm text-cream/40">
            Sin tarjeta. Configura tu restaurante en menos de 3 minutos.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
