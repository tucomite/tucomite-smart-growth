import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import heroImg from "../../assets/hero-restaurant.jpg";

export function HeroSection() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImg}
          alt="Restaurante de alta cocina"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32 pt-40">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-medium text-gold-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              IA para restaurantes
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
            className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            El comité inteligente que{" "}
            <span className="gold-gradient-text">hace crecer tu restaurante</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl"
          >
            Analiza tu carta, descubre qué platos te hacen perder dinero y recibe
            decisiones claras para aumentar tu margen.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: "easeOut" }}
            className="mt-10 flex flex-col sm:flex-row gap-4"
          >
            <button
              onClick={() => scrollTo("cta-final")}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-charcoal px-8 py-4 text-base font-medium text-primary-foreground transition-all hover:bg-charcoal/90 hover:shadow-xl hover:shadow-charcoal/20"
            >
              Solicitar auditoría gratuita
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => scrollTo("como-funciona")}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/80 backdrop-blur-sm px-8 py-4 text-base font-medium text-foreground transition-all hover:bg-background hover:border-gold/40"
            >
              <Play className="h-4 w-4 text-gold" />
              Ver cómo funciona
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="mt-16 flex items-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-background bg-cream-dark flex items-center justify-center text-xs font-medium text-charcoal"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p>
              <span className="font-semibold text-foreground">+200 restaurantes</span>{" "}
              ya han mejorado su rentabilidad
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
