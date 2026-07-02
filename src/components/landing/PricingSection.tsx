import { motion } from "framer-motion";
import { Check, Zap, ClipboardCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

const betaFeatures = [
  "Auditoría de carta completa",
  "Análisis de rentabilidad por plato",
  "Recetas generadas por IA",
  "Recomendaciones de mejora mensuales",
  "Soporte prioritario por email",
  "Acceso a nuevas funciones antes",
];

const auditFeatures = [
  "Análisis completo de tu carta actual",
  "Informe de rentabilidad detallado",
  "Propuesta de mejora personalizada",
  "Entrega en 48 horas",
];

export function PricingSection() {
  return (
    <section id="planes" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Elige tu{" "}
            <span className="gold-gradient-text">plan de crecimiento</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Empieza con una auditoría gratuita o conviértete en beta fundador.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
          {/* Beta Founder */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl border-2 border-gold/40 bg-card p-8 shadow-xl shadow-gold/5 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-light via-gold to-gold-dark" />
            <div className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-3 py-1 text-sm font-medium text-gold-dark mb-6">
              <Zap className="h-3.5 w-3.5" />
              Más popular
            </div>
            <h3
              className="text-2xl font-semibold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Beta Fundador
            </h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">29 €</span>
              <span className="text-muted-foreground">/mes</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Precio especial para los primeros restaurantes. Subirá pronto.
            </p>

            <ul className="mt-8 space-y-4">
              {betaFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-gold-dark mt-0.5" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/auth"
              search={{ mode: "register" }}
              className="mt-8 block text-center w-full rounded-full bg-charcoal px-6 py-3.5 text-base font-medium text-primary-foreground transition-all hover:bg-charcoal/90 hover:shadow-lg"
            >
              Quiero ser beta fundador
            </Link>
          </motion.div>

          {/* One-time Audit */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-3xl border border-border bg-card p-8 card-lift"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-cream-dark px-3 py-1 text-sm font-medium text-charcoal mb-6">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Única vez
            </div>
            <h3
              className="text-2xl font-semibold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Auditoría única
            </h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">49 €</span>
              <span className="text-muted-foreground">pago único</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Perfecto si quieres probar antes de comprometerte.
            </p>

            <ul className="mt-8 space-y-4">
              {auditFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-gold-dark mt-0.5" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/auth"
              search={{ mode: "register" }}
              className="mt-8 block text-center w-full rounded-full border border-border bg-background px-6 py-3.5 text-base font-medium text-foreground transition-all hover:bg-cream hover:border-gold/40"
            >
              Solicitar auditoría
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
