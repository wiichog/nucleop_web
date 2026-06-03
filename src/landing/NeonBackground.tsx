// Partículas decorativas deterministas (sin dependencias de aleatoriedad por render).
const PARTICLES = Array.from({ length: 26 }, (_, i) => {
  const seed = (i * 9301 + 49297) % 233280;
  const rnd = seed / 233280;
  const seed2 = (i * 4096 + 150889) % 714025;
  const rnd2 = seed2 / 714025;
  const colors = ["#FC4C02", "#FF7A3D", "#FF9F1C", "#FF2D55"];
  return {
    left: `${(rnd * 100).toFixed(2)}%`,
    top: `${(rnd2 * 100).toFixed(2)}%`,
    size: 1.5 + rnd * 2.5,
    delay: `${(rnd * 6).toFixed(2)}s`,
    duration: `${(6 + rnd2 * 6).toFixed(2)}s`,
    color: colors[i % colors.length],
    opacity: 0.25 + rnd2 * 0.5,
  };
});

interface NeonBackgroundProps {
  /** "hero" usa blobs más intensos; "section" es sutil. */
  variant?: "hero" | "section";
  className?: string;
}

/** Campo de gradientes neón a la deriva + partículas. Puramente decorativo. */
export function NeonBackground({ variant = "section", className = "" }: NeonBackgroundProps) {
  const intensity = variant === "hero" ? 0.55 : 0.22;

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* Blobs neón difuminados */}
      <div
        className="absolute -left-32 top-0 h-[42rem] w-[42rem] rounded-full blur-[120px] animate-drift-1"
        style={{ background: "#b8380a", opacity: intensity }}
      />
      <div
        className="absolute -right-40 top-1/4 h-[38rem] w-[38rem] rounded-full blur-[130px] animate-drift-2"
        style={{ background: "#7a1530", opacity: intensity * 0.9 }}
      />
      {variant === "hero" && (
        <div
          className="absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full blur-[120px] animate-pulse-glow"
          style={{ background: "#FC4C02", opacity: 0.3 }}
        />
      )}

      {/* Partículas flotantes */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full animate-float"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}

      {/* Viñeta para fundir con el negro */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.85)_100%)]" />
    </div>
  );
}
