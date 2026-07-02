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
    <div className="relative rounded-xl border border-[color:var(--tc-line)] bg-[color:var(--tc-panel)] p-3.5 overflow-hidden">
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[color:var(--tc-gold)]/10 blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-2 mb-2.5">
        <span className="w-6 h-6 rounded-md bg-[color:var(--tc-gold)]/[0.12] text-[color:var(--tc-gold)] flex items-center justify-center">
          <Shield className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[color:var(--tc-text-mute)] leading-none">Centro de Seguridad</p>
          <p className="text-[13px] text-[color:var(--tc-text)] font-medium leading-tight mt-1">
            Seguridad <span className="text-[color:var(--tc-gold)]">100%</span>
          </p>
        </div>
      </div>
      <div className="relative grid grid-cols-5 gap-1">
        {ITEMS.map((it, i) => {
          const Icon = it.icon;
          return (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.35 }}
              className="group flex flex-col items-center gap-1 py-1.5 rounded-md hover:bg-[color:var(--tc-panel-hover)] transition-colors"
              title={it.label}
            >
              <Icon className="w-3.5 h-3.5 text-[color:var(--tc-text-dim)] group-hover:text-[color:var(--tc-gold)] transition-colors" />
              <span className="text-[8.5px] text-[color:var(--tc-text-mute)] leading-none tracking-wide">
                {it.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}