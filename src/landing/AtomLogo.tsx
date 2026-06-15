interface AtomLogoProps {
  /** Lado en píxeles. */
  size?: number;
  className?: string;
  /** Si el halo radiactivo late suavemente (el átomo nunca rota). */
  pulse?: boolean;
  /** Si lleva el brillo naranja (halo + glow). false = marca limpia sobre negro. */
  glow?: boolean;
}

/**
 * Marca de Nucleo: un átomo FIJO (no gira). Con `glow` lleva un halo cálido
 * contenido; sin él queda como una marca limpia. Representa el "núcleo" (§9).
 */
export function AtomLogo({ size = 28, className = "", pulse = true, glow = true }: AtomLogoProps) {
  const glowClass = glow ? "glow-radioactive" : "";
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`overflow-visible ${className}`}
      role="img"
      aria-label="Nucleo"
    >
      <defs>
        <radialGradient id="atom-core" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#fff4ec" />
          <stop offset="35%" stopColor="#FFB07A" />
          <stop offset="70%" stopColor="#FC4C02" />
          <stop offset="100%" stopColor="#9e2e00" />
        </radialGradient>
        <radialGradient id="atom-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF7A3D" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#FC4C02" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FC4C02" stopOpacity="0" />
        </radialGradient>
        <filter id="atom-soft" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <linearGradient id="orbit-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF9F1C" />
          <stop offset="100%" stopColor="#FC4C02" />
        </linearGradient>
      </defs>

      {/* Halo radiactivo (lo único que puede latir) */}
      {glow && (
        <circle
          cx="50"
          cy="50"
          r="34"
          fill="url(#atom-halo)"
          filter="url(#atom-soft)"
          className={pulse ? "animate-radio-pulse" : ""}
          style={{ transformOrigin: "50px 50px" }}
        />
      )}

      {/* Órbitas fijas (tres elipses cruzadas) */}
      <g className={glowClass} fill="none" stroke="url(#orbit-a)">
        <ellipse cx="50" cy="50" rx="42" ry="16" strokeWidth="2" opacity="0.85" />
        <ellipse
          cx="50"
          cy="50"
          rx="42"
          ry="16"
          strokeWidth="2"
          opacity="0.7"
          transform="rotate(60 50 50)"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="42"
          ry="16"
          strokeWidth="2"
          opacity="0.7"
          transform="rotate(120 50 50)"
        />
      </g>

      {/* Electrones fijos sobre las órbitas */}
      <g className={glowClass}>
        <circle cx="92" cy="50" r="3.6" fill="#FFB07A" />
        <circle cx="29" cy="13.6" r="3.2" fill="#FF9F1C" />
        <circle cx="29" cy="86.4" r="3.2" fill="#FF7A3D" />
      </g>

      {/* Núcleo */}
      <g className={glowClass}>
        <circle cx="50" cy="50" r="9" fill="url(#atom-core)" />
        <circle cx="50" cy="50" r="9" fill="none" stroke="#fff4ec" strokeWidth="0.7" opacity="0.85" />
      </g>
    </svg>
  );
}
