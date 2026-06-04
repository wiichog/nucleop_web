// Partículas que caen lento como "nieve" naranja. Aleatorias por partícula para
// que cada una arranque y dure distinto (no todas a la vez). Muy sutil.
const COLORS = ["#FC4C02", "#FF7A3D", "#FF9F1C"];
const FLAKES = Array.from({ length: 44 }, (_, i) => {
  const dur = 9 + Math.random() * 16;
  return {
    left: `${(Math.random() * 100).toFixed(2)}%`,
    size: 1 + Math.random() * 2.2,
    duration: `${dur.toFixed(1)}s`,
    delay: `${(-Math.random() * dur).toFixed(1)}s`, // negativo y aleatorio: dispersas
    opacity: 0.18 + Math.random() * 0.32,
    color: COLORS[i % COLORS.length],
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
