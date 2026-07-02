import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
};

export function AnimatedNumber({ value, format, duration = 900, className }: Props) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = Number.isFinite(value) ? value : 0;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (to - from) * ease(t);
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else prevRef.current = to;
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className={`tabular-nums ${className ?? ""}`}>{format ? format(display) : Math.round(display).toString()}</span>;
}