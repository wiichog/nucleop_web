// Polvo muy sutil que cae lento sobre la página. Blanco dominante con algún
// destello cálido ocasional (acento, no protagonista). Aleatorio por partícula
// para que cada una arranque y dure distinto (no todas a la vez).
const FLAKES = Array.from({ length: 34 }, (_, i) => {
  const dur = 10 + Math.random() * 16;
  // 1 de cada ~7 es cálida; el resto, blanco/neutro.
  const warm = i % 7 === 0;
  return {
    left: `${(Math.random() * 100).toFixed(2)}%`,
    size: 1 + Math.random() * 1.8,
    duration: `${dur.toFixed(1)}s`,
    delay: `${(-Math.random() * dur).toFixed(1)}s`, // negativo y aleatorio: dispersas
    opacity: 0.05 + Math.random() * 0.16,
    color: warm ? "#FFB07A" : "#ffffff",
    warm,
  };
});

/** Capa fija sobre toda la página (pointer-events-none) con polvo blanco sutil. */
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
            boxShadow: f.warm ? `0 0 ${f.size * 2}px ${f.color}` : "none",
            animationDuration: f.duration,
            animationDelay: f.delay,
          }}
        />
      ))}
    </div>
  );
}
