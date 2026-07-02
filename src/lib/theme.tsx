import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const STORAGE_KEY = "tc-app-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* localStorage unavailable */
  }
  return "dark"; // App defaults to dark Enterprise
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggle: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback for SSR / boundaries where the provider is not mounted yet.
    return {
      theme: "dark",
      setTheme: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}

/**
 * Helper to compose the correct scope class for a themed subtree.
 * `forced` lets marketing/landing routes lock a specific theme regardless
 * of user preference (e.g. always light on landing).
 */
export function themeScopeClass(theme: Theme, extra = ""): string {
  return `${theme === "dark" ? "tc-dark" : "tc-light"} ${extra}`.trim();
}