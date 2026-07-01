import { motion } from "framer-motion";
import { ChefHat, DollarSign, ShoppingCart, Package, Megaphone, Sparkles } from "lucide-react";

const experts = [
  {
    icon: ChefHat,
    name: "Chef IA",
    description: "Crea platos innovadores y menús equilibrados que maximizan el margen sin sacrificar calidad.",
    color: "bg-amber-50",
    iconColor: "text-amber-700",
    bgIcon: "bg-amber-100",
  },
  {
    icon: DollarSign,
    name: "Finanzas",
    description: "Calcula costes reales y márgenes por plato. Sabe exactamente cuánto ganas con cada venta.",
    color: "bg-emerald-50",
    iconColor: "text-emerald-700",
    bgIcon: "bg-emerald-100",
  },
  {
    icon: ShoppingCart,
    name: "Compras",
    description: "Recomienda qué comprar, cuánto y a quién. Negocia mejores precios basándose en datos.",
    color: "bg-sky-50",
    iconColor: "text-sky-700",
    bgIcon: "bg-sky-100",
  },
  {
    icon: Package,
    name: "Stock",
    description: "Reduce desperdicio al mínimo. Aprovecha cada ingrediente y evita pérdidas por caducidad.",
    color: "bg-rose-50",
    iconColor: "text-rose-700",
    bgIcon: "bg-rose-100",
  },
  {
    icon: Megaphone,
    name: "Marketing",
    description: "Sugiere promociones inteligentes que atraen clientes y aumentan el ticket medio.",
    color: "bg-violet-50",
    iconColor: "text-violet-700",
    bgIcon: "bg-violet-100",
  },
];

export function SolutionSection() {
  return (
    <section id="solucion" className="relative py-24 sm:py-32 bg-cream/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-medium text-gold-dark mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Tu equipo de IA
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            TuComité reúne a{" "}
            <span className="gold-gradient-text">tus expertos de IA</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Cinco especialistas trabajan juntos para tomar las mejores decisiones en tu restaurante.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {experts.map((expert, i) => (
            <motion.div
              key={expert.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative rounded-2xl border border-border bg-card p-6 text-center card-lift overflow-hidden"
            >
              <div className={`mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${expert.bgIcon} ${expert.iconColor}`}>
                <expert.icon className="h-6 w-6" />
              </div>
              <h3
                className="text-lg font-semibold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {expert.name}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {expert.description}
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
