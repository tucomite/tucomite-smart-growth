import { motion } from "framer-motion";
import { TrendingDown, Receipt, Trash2, Calculator, ListX } from "lucide-react";

const problems = [
  {
    icon: Receipt,
    title: "Costes ocultos",
    description: "Muchos ingredientes tienen costes que no se controlan y erosionan tu margen mes a mes.",
  },
  {
    icon: TrendingDown,
    title: "Subidas de proveedores",
    description: "Los precios suben sin avisar y tu carta se queda desactualizada, perdiendo rentabilidad.",
  },
  {
    icon: Trash2,
    title: "Desperdicio",
    description: "Sin un control preciso del stock, se tira comida que se ha pagado pero no se ha vendido.",
  },
  {
    icon: Calculator,
    title: "Precios mal calculados",
    description: "Platos con precio demasiado bajo que no cubren ni el coste ni el trabajo de tu equipo.",
  },
  {
    icon: ListX,
    title: "Cartas demasiado largas",
    description: "Menús extensos que confunden al cliente y diluyen la calidad de lo que realmente funciona.",
  },
];

export function ProblemSection() {
  return (
    <section id="problema" className="relative py-24 sm:py-32">
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
            Muchos restaurantes venden platos{" "}
            <span className="gold-gradient-text">sin saber si realmente son rentables</span>
          </h2>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group rounded-2xl border border-border bg-card p-6 card-lift"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold-dark">
                <problem.icon className="h-5 w-5" />
              </div>
              <h3
                className="text-lg font-semibold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {problem.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {problem.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
