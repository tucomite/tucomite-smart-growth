
function ImpactRow({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-6 rounded-xl px-5 py-4 border ${
        emphasis
          ? "bg-[color:var(--gold)]/10 border-[color:var(--gold)]/30"
          : "bg-white border-charcoal/10"
      }`}
    >
      <div>
        <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45">{label}</p>
        {sub && <p className="text-xs text-charcoal/55 mt-1">{sub}</p>}
      </div>
      <p
        className={`font-heading tracking-tight tabular-nums ${
          emphasis ? "text-3xl text-charcoal" : "text-2xl text-charcoal"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ImpactArrow() {
  return (
    <div className="flex justify-center">
      <ArrowRight className="w-4 h-4 text-charcoal/25 rotate-90" />
    </div>
  );
}
