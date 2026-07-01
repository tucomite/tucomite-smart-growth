import { Mail } from "lucide-react";

export function FooterSection() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-semibold tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              TuComité
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <a
              href="mailto:hola@tucomite.com"
              className="hover:text-foreground transition-colors"
            >
              hola@tucomite.com
            </a>
          </div>

          <p className="text-sm text-muted-foreground">
            TuComité © 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
