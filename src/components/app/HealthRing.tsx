import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function HealthRing({
  score,
  state,
  size = 260,
}: {
  score: number;
  state: string;
  size?: number;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1100;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(clamped * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--tc-gold-light)" />
            <stop offset="100%" stopColor="var(--tc-gold-dark)" />
          </linearGradient>
          <filter id="hgGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="color-mix(in oklab, var(--tc-text) 8%, transparent)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#hg)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          filter="url(#hgGlow)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * clamped) / 100 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--tc-text-mute)]">
          Salud
        </p>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="font-heading text-[76px] leading-none text-[color:var(--tc-text)] tracking-[-0.03em] tabular-nums">
            {display}
          </span>
          <span className="text-[color:var(--tc-text-mute)] text-base tracking-tight">/100</span>
        </div>
        <span className="mt-2.5 text-[11px] uppercase tracking-[0.2em] text-[color:var(--tc-gold)] font-medium">
          {state}
        </span>
      </div>
    </div>
  );
}