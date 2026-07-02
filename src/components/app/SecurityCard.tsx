import { Shield, Lock, KeyRound, Database, Activity, FileSearch } from "lucide-react";
import { motion } from "framer-motion";

const ITEMS = [
  { icon: Lock, label: "AES-256" },
  { icon: KeyRound, label: "2FA" },
  { icon: Database, label: "Backups" },
  { icon: Activity, label: "Monitorización" },
  { icon: FileSearch, label: "Auditoría" },
];

export function SecurityCard() {
  return (
    <div className="relative rounded-[12px] border border-[color:var(--tc-line)] bg-gradient-to-b from-[color:var(--tc-panel-strong)] to-[color:var(--tc-panel)] p-3.5 overflow-hidden shadow-[var(--tc-shadow-sm)]">
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-[color:var(--tc-gold)]/[0.10] blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-2.5 mb-3">
        <span className="w-7 h-7 rounded-[8px] bg-[color:var(--tc-gold)]/[0.12] border border-[color:var(--tc-gold)]/25 text-[color:var(--tc-gold)] flex items-center justify-center">
          <Shield className="w-3.5 h-3.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] uppercase tracking-[0.2em] text-[color:var(--tc-text-mute)] leading-none font-medium">Seguridad</p>
          <p className="text-[12.5px] text-[color:var(--tc-text)] font-semibold leading-tight mt-1.5 tracking-tight">
            Seguridad <span className="text-[color:var(--tc-gold)]">100%</span>
          </p>
        </div>
      </div>
      <div className="relative grid grid-cols-5 gap-0.5">
        {ITEMS.map((it, i) => {
          const Icon = it.icon;
          return (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.35 }}
              className="group flex flex-col items-center gap-1.5 py-2 rounded-[8px] hover:bg-[color:var(--tc-panel-hover)] transition-colors"
              title={it.label}
            >
              <Icon className="w-3.5 h-3.5 text-[color:var(--tc-text-dim)] group-hover:text-[color:var(--tc-gold)] transition-colors" strokeWidth={1.75} />
              <span className="text-[8.5px] text-[color:var(--tc-text-mute)] leading-none tracking-[0.06em]">
                {it.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}