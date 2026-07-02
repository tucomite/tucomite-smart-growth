import logoAsset from "@/assets/tucomite-logo.png.asset.json";

type LogoProps = {
  size?: number;
  className?: string;
  glow?: boolean;
  alt?: string;
};

/**
 * Official TuComité shield logo.
 * Always keeps aspect ratio 1:1 and never applies color filters.
 */
export function Logo({ size = 32, className = "", glow = false, alt = "TuComité" }: LogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        filter: glow ? "drop-shadow(0 0 22px rgba(212,175,110,0.35))" : undefined,
      }}
      className={`select-none shrink-0 ${className}`}
    />
  );
}

/**
 * Full lockup: shield + wordmark. Used in nav, sidebar, auth, onboarding.
 */
export function LogoLockup({
  size = 32,
  showBeta = false,
  wordmarkClassName = "",
  betaClassName = "",
  className = "",
  compact = false,
  glow = false,
}: {
  size?: number;
  showBeta?: boolean;
  wordmarkClassName?: string;
  betaClassName?: string;
  className?: string;
  compact?: boolean;
  glow?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo size={size} glow={glow} />
      {!compact && (
        <span className="flex flex-col leading-none min-w-0">
          <span
            className={`font-heading tracking-tight ${wordmarkClassName}`}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            TuComité
          </span>
          {showBeta && (
            <span
              className={`uppercase tracking-[0.22em] text-[9.5px] mt-1.5 ${betaClassName}`}
            >
              Beta · v1.0
            </span>
          )}
        </span>
      )}
    </span>
  );
}