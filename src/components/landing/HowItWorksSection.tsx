import { motion } from "framer-motion";
import { Upload, Database, Brain, FileCheck } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Subes tu carta",
    description: "Fotografía, PDF o texto. TuComité lee y organiza todos tus platos en segundos.",
  },
  {
    number: "02",
    icon: Database,
    title: "Introduces costes",
    description: "Añade proveedores, precios de compra y gastos fijos. Puedes hacerlo poco a poco.",
  },
  {
    number: "03",
    icon: Brain,
    title: "TuComité analiza",
    description: "La IA estudia rentabilidad, tendencias, stock y oportunidades de mejora.",
  },
  {
    number: "04",
    icon: FileCheck,
    title: "Recibes decisiones",
    description: "Obtienes recomendaciones claras para subir precios, ajustar recetas o crear promociones.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="relative py-24 sm:py-32 bg-cream/30">
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
            Cómo funciona{" "}
            <span className="gold-gradient-text">TuComité</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            De la carta a la decisión en cuatro pasos sencillos.
          </p>
        </motion.div>

        <div className="mt-16 relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-[3.5rem] left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

          <div className="grid gap-8 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative text-center"
              >
                <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-charcoal text-primary-foreground shadow-lg shadow-charcoal/20">
                  <step.icon className="h-6 w-6" />
                </div>
                <span
                  className="mt-4 block text-sm font-semibold text-gold-dark tracking-wider"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Paso {step.number}
                </span>
                <h3
                  className="mt-2 text-xl font-semibold text-foreground"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
