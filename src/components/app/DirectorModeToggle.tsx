import { motion } from "framer-motion";

export type Mode = "operativo" | "director";

export function DirectorModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-charcoal/10 bg-white p-1 relative">
      {(["operativo", "director"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`relative z-10 px-4 py-1.5 text-xs font-medium tracking-wide uppercase transition-colors ${
            mode === m ? "text-white" : "text-charcoal/60 hover:text-charcoal"
          }`}
        >
          {mode === m && (
            <motion.span
              layoutId="mode-pill"
              className="absolute inset-0 rounded-full bg-charcoal -z-10"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          {m === "operativo" ? "Operativo" : "Director general"}
        </button>
      ))}
    </div>
  );
}