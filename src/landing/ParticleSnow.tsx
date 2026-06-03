// Partículas deterministas que caen lento como "nieve" naranja. Muy sutil.
const FLAKES = Array.from({ length: 44 }, (_, i) => {
  const a = ((i * 9301 + 49297) % 233280) / 233280;
  const b = ((i * 4096 + 150889) % 714025) / 714025;
  const colors = ["#FC4C02", "#FF7A3D", "#FF9F1C"];
  return {
    left: `${(a * 100).toFixed(2)}%`,
    size: 1 + b * 2.2,
    duration: `${(11 + a * 14).toFixed(1)}s`,
    delay: `${(-a * 22).toFixed(1)}s`, // negativo: arrancan dispersas
    opacity: 0.18 + b * 0.32,
    color: colors[i % colors.length],
  };
});

/** Capa fija sobre toda la página (pointer-events-none) con nieve naranja sutil. */
export function ParticleSnow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {FLAKES.map((f, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-full animate-snow-fall"
          style={{
            left: f.left,
            width: f.size,
            height: f.size,
            background: f.color,
            opacity: f.opacity,
            boxShadow: `0 0 ${f.size * 2}px ${f.color}`,
            animationDuration: f.duration,
            animationDelay: f.delay,
          }}
        />
      ))}
    </div>
  );
}
