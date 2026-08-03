interface AtomLogoProps {
  /** Lado en píxeles. */
  size?: number;
  className?: string;
  /**
   * @deprecated Sin efecto. El halo naranja (lo único que latía) se retiró del
   * lenguaje visual; se mantiene la prop para no tocar los call sites.
   */
  pulse?: boolean;
  /**
   * @deprecated Sin efecto. El resplandor naranja se eliminó: el átomo se pinta
   * con sus gradientes sólidos y nada más.
   */
  glow?: boolean;
}

/**
 * Marca de Nucleo: un átomo FIJO (no gira) y **sin halo ni glow**. Representa el
 * "núcleo" (§9). El naranja vive en los gradientes del propio átomo, nunca como
 * resplandor sobre el fondo.
 */
export function AtomLogo({ size = 28, className = "" }: AtomLogoProps) {
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
        <linearGradient id="orbit-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF9F1C" />
          <stop offset="100%" stopColor="#FC4C02" />
        </linearGradient>
      </defs>

      {/* Órbitas fijas (tres elipses cruzadas) */}
      <g fill="none" stroke="url(#orbit-a)">
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
      <g>
        <circle cx="92" cy="50" r="3.6" fill="#FFB07A" />
        <circle cx="29" cy="13.6" r="3.2" fill="#FF9F1C" />
        <circle cx="29" cy="86.4" r="3.2" fill="#FF7A3D" />
      </g>

      {/* Núcleo */}
      <g>
        <circle cx="50" cy="50" r="9" fill="url(#atom-core)" />
        <circle cx="50" cy="50" r="9" fill="none" stroke="#fff4ec" strokeWidth="0.7" opacity="0.85" />
      </g>
    </svg>
  );
}
