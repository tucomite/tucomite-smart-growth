import { Moon, Sun } from "lucide-react";
import { useAppTheme } from "@/lib/theme";

/**
 * Enterprise theme switcher (compact pill). Persists to localStorage
 * and swaps the surrounding .tc-dark / .tc-light scope instantly.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useAppTheme();
  const isDark = theme === "dark";

  return (
    <div
      role="group"
      aria-label="Tema visual"
      className={`relative inline-flex items-center h-8 p-0.5 rounded-full border border-[color:var(--tc-line-strong)] bg-[color:var(--tc-panel)] ${className}`}
    >
      <span
        aria-hidden
        className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-[color:var(--tc-panel-strong)] shadow-[var(--tc-shadow-sm)] transition-transform duration-200 ease-[var(--tc-ease)]"
        style={{ transform: isDark ? "translateX(0)" : "translateX(100%)" }}
      />
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={isDark}
        aria-label="Modo oscuro"
        className={`relative z-10 inline-flex items-center justify-center h-7 w-7 rounded-full transition-colors duration-150 ${
          isDark
            ? "text-[color:var(--tc-gold)]"
            : "text-[color:var(--tc-text-mute)] hover:text-[color:var(--tc-text)]"
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={!isDark}
        aria-label="Modo claro"
        className={`relative z-10 inline-flex items-center justify-center h-7 w-7 rounded-full transition-colors duration-150 ${
          !isDark
            ? "text-[color:var(--tc-gold)]"
            : "text-[color:var(--tc-text-mute)] hover:text-[color:var(--tc-text)]"
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}