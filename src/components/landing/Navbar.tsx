import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Link } from "@tanstack/react-router";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <button onClick={() => scrollTo("hero")} className="flex items-center gap-2.5 group">
            <Logo size={30} />
            <span
              className="text-xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              TuComité
            </span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo("problema")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              El problema
            </button>
            <button onClick={() => scrollTo("solucion")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Solución
            </button>
            <button onClick={() => scrollTo("como-funciona")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cómo funciona
            </button>
            <button onClick={() => scrollTo("planes")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Planes
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/auth"
              search={{ mode: "register" }}
              className="rounded-full bg-charcoal px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-charcoal/90 hover:shadow-lg"
            >
              Crear cuenta
            </Link>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md">
          <div className="px-4 py-4 space-y-3">
            <button onClick={() => scrollTo("problema")} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
              El problema
            </button>
            <button onClick={() => scrollTo("solucion")} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
              Solución
            </button>
            <button onClick={() => scrollTo("como-funciona")} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
              Cómo funciona
            </button>
            <button onClick={() => scrollTo("planes")} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
              Planes
            </button>
            <Link
              to="/auth"
              search={{ mode: "login" }}
              onClick={() => setMenuOpen(false)}
              className="block text-center w-full rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/auth"
              search={{ mode: "register" }}
              onClick={() => setMenuOpen(false)}
              className="block text-center w-full rounded-full bg-charcoal px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
