import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, ArrowRightLeft, Lightbulb } from "lucide-react";

const cards = [
  {
    icon: AlertTriangle,
    stat: "22%",
    text: "Este plato tiene solo un 22% de margen",
    subtext: "Lo recomendable es al menos un 65%",
    highlight: "bg-rose-50 border-rose-200 text-rose-700",
    iconBg: "bg-rose-100",
  },
  {
    icon: TrendingUp,
    stat: "+380 €",
    text: "Subiendo 1,40 € el precio ganarías 380 €/mes más",
    subtext: "Sin reducir las ventas del plato",
    highlight: "bg-emerald-50 border-emerald-200 text-emerald-700",
    iconBg: "bg-emerald-100",
  },
  {
    icon: ArrowRightLeft,
    stat: "14%",
    text: "Puedes sustituir este proveedor y ahorrar 14%",
    subtext: "Misma calidad, mejor precio negociado",
    highlight: "bg-sky-50 border-sky-200 text-sky-700",
    iconBg: "bg-sky-100",
  },
  {
    icon: Lightbulb,
    stat: "3 platos",
    text: "Con el stock actual puedes crear 3 platos nuevos",
    subtext: "Aprovecha ingredientes que ya tienes",
    highlight: "bg-amber-50 border-amber-200 text-amber-700",
    iconBg: "bg-amber-100",
  },
];

export function DemoValueSection() {
  return (
    <section className="relative py-24 sm:py-32">
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
            Decisiones claras,{" "}
            <span className="gold-gradient-text">resultados visibles</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Esto es lo que TuComité descubre en tu carta en minutos.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => (
            <motion.div
              key={card.text}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-6 card-lift"
            >
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
                <card.icon className="h-5 w-5 text-charcoal" />
              </div>
              <div className={`mt-4 inline-flex items-center rounded-lg border px-3 py-1 text-2xl font-bold ${card.highlight}`}>
                {card.stat}
              </div>
              <p className="mt-4 text-base font-medium text-foreground leading-relaxed">
                {card.text}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {card.subtext}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
