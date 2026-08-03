import { forwardRef, useId } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { Group, Text } from "@mantine/core";
import type { MantineSize } from "@mantine/core";

/**
 * Primitivos del lenguaje **Aurora** (ver `lib/aurora.css` y la referencia
 * `design/aurora-reference.html`).
 *
 * El material vive en CSS; aquí solo se compone. La regla que sostiene todo:
 * una pantalla del panel se arma con `AuroraHero` + tarjetas glass + una
 * coreografía escalonada, igual que el dashboard de la referencia.
 */

/** Variables CSS tipadas (React no acepta `--x` sin este cast). */
export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}

/** Retardo de animación como variable `--d` (segundos). */
export function delayVar(seconds?: number): CSSProperties | undefined {
  return seconds == null ? undefined : cssVars({ "--d": `${seconds}s` });
}

/* ══════════════════════════════════════════════════════════════════════════
   Revelado
   ═════════════════════════════════════════════════════════════════════════ */

type Anim = "rise" | "slide-l" | "slide-r" | "pop" | "wipe-right" | "wipe-down";

/** Envoltorio de entrada: aplica una de las animaciones de la referencia. */
export function Reveal({
  anim = "rise",
  delay,
  children,
  className = "",
  style,
  ...rest
}: {
  anim?: Anim;
  delay?: number;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`a-${anim} ${className}`.trim()}
      style={{ ...delayVar(delay), ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Contenedor que escalona a sus hijos directos (paso 55 ms). Sustituye a
 * escribir un `delay` distinto en cada tarjeta de una retícula.
 */
export function Stagger({
  from = 0,
  children,
  className = "",
  style,
  ...rest
}: { from?: number; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`a-stagger ${className}`.trim()}
      style={{ ...cssVars({ "--d0": `${from}s` }), ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Superficies
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Tarjeta de vidrio. `big` = la protagonista (más luminosa y radio mayor),
 * `core` = la que manda en la pantalla (borde flame encendido).
 */
export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "big" | "core";
  /** Destello especular de coda (solo para 1–2 superficies por pantalla). */
  sheen?: boolean;
  /** Se eleva al pasar el mouse (para tarjetas clicables). */
  lift?: boolean;
  delay?: number;
  padding?: number | string;
  children: ReactNode;
}

/**
 * Va con `forwardRef` a propósito: sin ref, envolverla en un `<Tooltip>` o un
 * `<Menu.Target>` de Mantine deja el popup sin ancla y flotando en la esquina.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  {
    variant = "default",
    sheen = false,
    lift = false,
    delay,
    padding = 20,
    className = "",
    style,
    children,
    ...rest
  },
  ref,
) {
  const classes = [
    "a-glass-card",
    variant === "big" && "a-glass-card--big",
    variant === "core" && "a-glass-card--core",
    sheen && "a-sheen",
    lift && "a-lift",
    delay != null && "a-slide-r",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      className={classes}
      style={{
        padding: typeof padding === "number" ? `calc(${padding} * var(--u))` : padding,
        ...delayVar(delay),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
});

/** Pastilla de vidrio (el chip "Weather Forecast" de la referencia). */
export function GlassChip({
  icon,
  children,
  delay,
  className = "",
  style,
  ...rest
}: { icon?: ReactNode; children: ReactNode; delay?: number } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`a-chip ${delay != null ? "a-wipe-right" : ""} ${className}`.trim()}
      style={{ ...delayVar(delay), ...style }}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * Pastilla de filtro con estado. Existe porque el rollout la reimplementó a
 * mano en varias pantallas con alfas distintos (0.16/0.5 en una, 0.18/0.42 en
 * otra): el encendido flame vive ahora en `.a-chip--on`, una sola vez.
 *
 * Es un `<button aria-pressed>`, no un radio: si necesitas semántica de grupo
 * de opciones excluyentes, usa `SegmentedControl`.
 */
export function FilterChip({
  active,
  onClick,
  children,
  className = "",
  style,
  ...rest
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`a-chip a-lift ${active ? "a-chip--on" : ""} ${className}`.trim()}
      style={{ cursor: "pointer", ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Botón circular de 52u de la barra de herramientas del header. */
export function ToolButton({
  label,
  small = false,
  children,
  className = "",
  ...rest
}: {
  label: string;
  small?: boolean;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLButtonElement>, "aria-label">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`a-tool ${small ? "a-tool--sm" : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Tipografía editorial
   ═════════════════════════════════════════════════════════════════════════ */

/** Overline con punto flame: la firma editorial de Nucleo. */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <Group gap={7} align="center" wrap="nowrap">
      <span
        aria-hidden
        style={{
          width: 5,
          height: 5,
          borderRadius: "var(--radius-pill)",
          background: "var(--nucleo-accent)",
          flex: "none",
        }}
      />
      <span className="a-kicker">{children}</span>
    </Group>
  );
}

/**
 * Titular hero con revelado por línea (máscara + `lineUp`), tal cual el
 * "Strom / with Heavy Rain" de la referencia. Cada línea entra 110 ms después
 * de la anterior.
 */
export function HeroTitle({
  lines,
  delay = 0.2,
  className = "",
}: {
  lines: string | string[];
  delay?: number;
  className?: string;
}) {
  const list = Array.isArray(lines) ? lines : [lines];
  return (
    <h1 className={`a-h1 ${className}`.trim()}>
      {list.map((line, i) => (
        <span className="a-ln" key={`${line}-${i}`}>
          <span style={delayVar(delay + i * 0.11)}>{line}</span>
        </span>
      ))}
    </h1>
  );
}

/**
 * Encabezado hero de pantalla: chip + titular Inter Tight + blurb + acciones.
 * Es la traducción del bloque hero de la referencia a cada página del panel.
 */
export function AuroraHero({
  kicker,
  title,
  subtitle,
  action,
  aside,
  delay = 0,
}: {
  kicker?: string;
  title: string | string[];
  subtitle?: string;
  action?: ReactNode;
  /** Contenido a la derecha del hero (cifra grande, filtros, etc.). */
  aside?: ReactNode;
  delay?: number;
}) {
  return (
    <header style={{ marginBottom: "calc(26 * var(--u))" }}>
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="lg">
        <div style={{ minWidth: 0, flex: 1 }}>
          {kicker && (
            <div
              className="a-wipe-right"
              style={{ ...delayVar(delay + 0.06), marginBottom: "calc(12 * var(--u))" }}
            >
              <Kicker>{kicker}</Kicker>
            </div>
          )}
          <HeroTitle lines={title} delay={delay + 0.14} />
          {subtitle && (
            <p
              className="a-blurb a-wipe-down"
              style={{
                ...delayVar(delay + 0.4),
                marginTop: "calc(12 * var(--u))",
                maxWidth: "calc(560 * var(--u))",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {aside}
        {action && (
          <div className="a-rise" style={delayVar(delay + 0.3)}>
            {action}
          </div>
        )}
      </Group>
      <div
        className="a-wipe-right"
        style={{ ...delayVar(delay + 0.5), marginTop: "calc(18 * var(--u))" }}
      >
        <div className="a-rule" />
      </div>
    </header>
  );
}

/** Traduce un espaciado de Mantine (`"lg"`) o un número a un margen CSS válido. */
function space(v?: MantineSize | number) {
  if (v == null) return undefined;
  return typeof v === "number" ? v : `var(--mantine-spacing-${v})`;
}

/**
 * Overline de subsección. Definición ÚNICA del sistema: `components/ui.tsx` la
 * reexporta para no tener dos versiones que se separen con el tiempo.
 *
 * `as`: cuando el overline es de verdad el encabezado de una sección de la
 * página, pásale `as="h2"`. El hero de `AuroraHero` ya emite el único `<h1>`,
 * así que un `h2` aquí reconstruye el esquema de encabezados que se perdió al
 * cambiar los viejos `<Title order={3}>` por overlines. Para etiquetas sueltas
 * dentro de una tarjeta (p. ej. "Tarjeta" / "Manual") deja el `div`.
 */
export function SectionLabel({
  children,
  mt,
  mb = "xs",
  as: Tag = "div",
}: {
  children: ReactNode;
  mt?: MantineSize | number;
  mb?: MantineSize | number;
  as?: "div" | "h2" | "h3";
}) {
  return (
    <Tag
      className="a-kicker"
      style={{
        // `?? 0` neutraliza el margen que el navegador le da a <h2>/<h3>: un
        // heading semántico debe verse idéntico a un overline. El tamaño y el
        // peso ya los fija `.a-kicker` (los estilos de autor ganan al UA).
        marginTop: space(mt) ?? 0,
        marginBottom: space(mb) ?? 0,
        letterSpacing: "0.16em",
      }}
    >
      {children}
    </Tag>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Cifras
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Cifra protagonista, el "10°C" de la referencia: número enorme en Inter Tight
 * con la unidad en un `<i>` pequeño y elevado.
 */
export function BigMetric({
  value,
  unit,
  label,
  hint,
  tone,
  size = "lg",
  fz,
  delay,
}: {
  value: ReactNode;
  unit?: ReactNode;
  label?: string;
  hint?: ReactNode;
  tone?: string;
  size?: "lg" | "sm";
  /** Escape para cifras largas (dinero) que no caben en la escala por defecto. */
  fz?: string;
  delay?: number;
}) {
  return (
    <div className={delay != null ? "a-rise" : undefined} style={delayVar(delay)}>
      {label && <SectionLabel mb={8}>{label}</SectionLabel>}
      <div
        className={size === "lg" ? "a-metric" : "a-metric a-metric--sm"}
        style={{ color: tone, fontSize: fz }}
      >
        {value}
        {unit && <i>{unit}</i>}
      </div>
      {hint && (
        <Text size="sm" c="dimmed" mt={8}>
          {hint}
        </Text>
      )}
    </div>
  );
}

/**
 * Tile de métrica: la unidad mínima de una retícula de KPIs. Se usa dentro de
 * un `<Stagger>` para que la fila entre escalonada.
 */
export function MetricTile({
  label,
  value,
  icon,
  tone,
  hint,
  fz,
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: string;
  hint?: ReactNode;
  /** Escape para montos largos en retículas de 4–5 columnas (p. ej. Q1,254,300). */
  fz?: string;
  onClick?: () => void;
}) {
  return (
    <GlassCard
      lift={!!onClick}
      onClick={onClick}
      padding={18}
      style={onClick ? { cursor: "pointer" } : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <span className="a-kicker" style={{ lineHeight: 1.35 }}>
          {label}
        </span>
        {icon && <span style={{ opacity: 0.65, flex: "none" }}>{icon}</span>}
      </Group>
      <div
        className="a-metric a-metric--sm"
        style={{ marginTop: "calc(10 * var(--u))", color: tone, fontSize: fz }}
      >
        {value}
      </div>
      {hint && (
        <Text size="xs" c="dimmed" mt={6}>
          {hint}
        </Text>
      )}
    </GlassCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   WaveChart — la firma gráfica del sistema
   ═════════════════════════════════════════════════════════════════════════ */

const VB_W = 835;
const VB_H = 230;
const PAD_TOP = 26;
const PAD_BOTTOM = 54;

function round(n: number) {
  return Math.round(n * 10) / 10;
}

/** Catmull-Rom → curvas cúbicas: la ondulación suave de la referencia. */
function smoothPath(pts: { x: number; y: number }[]) {
  if (!pts.length) return "";
  if (pts.length === 1) return `M0,${round(pts[0].y)} L${VB_W},${round(pts[0].y)}`;

  let d = `M${round(pts[0].x)},${round(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d +=
      ` C${round(p1.x + (p2.x - p0.x) / 6)},${round(p1.y + (p2.y - p0.y) / 6)}` +
      ` ${round(p2.x - (p3.x - p1.x) / 6)},${round(p2.y - (p3.y - p1.y) / 6)}` +
      ` ${round(p2.x)},${round(p2.y)}`;
  }
  return d;
}

/**
 * Gráfico de onda que **se dibuja solo**: la pluma traza la línea
 * (stroke-dasharray) y el relleno la sigue ~220 ms detrás (wipe left→right).
 * Tres pasadas de trazo (halo 6.2 @.17, halo medio 4.6 @.26, línea 3.4 @1)
 * exactamente como en la referencia.
 */
export function WaveChart({
  values,
  labels,
  activeIndex,
  height = 230,
  delay = 0.5,
  formatValue,
}: {
  values: number[];
  labels?: string[];
  activeIndex?: number;
  /** Alto en unidades `--u` (230 = el de la referencia). */
  height?: number;
  delay?: number;
  formatValue?: (v: number, i: number) => ReactNode;
}) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const gStroke = `wg-${uid}`;
  const gFill = `wf-${uid}`;
  const gFade = `wfadeg-${uid}`;
  const mFade = `wfade-${uid}`;
  const cClip = `wclip-${uid}`;

  const n = values.length;
  const min = n ? Math.min(...values) : 0;
  const max = n ? Math.max(...values) : 0;
  const span = max - min || 1;
  const usable = VB_H - PAD_TOP - PAD_BOTTOM;

  const pts = values.map((v, i) => ({
    x: n === 1 ? VB_W / 2 : (i / (n - 1)) * VB_W,
    y: PAD_TOP + (1 - (v - min) / span) * usable,
  }));

  const line = smoothPath(pts);
  const area = line ? `${line} L${VB_W},${VB_H} L0,${VB_H} Z` : "";

  return (
    <div>
      {formatValue && n > 0 && (
        <Stagger
          from={delay - 0.24 > 0 ? delay - 0.24 : 0}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          {values.map((v, i) => (
            <div
              key={`v-${i}`}
              className="a-display a-tabular"
              style={{
                fontSize: "clamp(18px, calc(30 * var(--u)), 34px)",
                fontWeight: 400,
                letterSpacing: "-0.022em",
                opacity: activeIndex != null && activeIndex !== i ? 0.62 : 1,
              }}
            >
              {formatValue(v, i)}
            </div>
          ))}
        </Stagger>
      )}

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{
          display: "block",
          width: "100%",
          height: `calc(${height} * var(--u))`,
          marginTop: "calc(18 * var(--u))",
          overflow: "visible",
        }}
      >
        <defs>
          <linearGradient id={gStroke} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity=".28" />
            <stop offset=".14" stopColor="#ffb489" stopOpacity=".78" />
            <stop offset=".42" stopColor="#fc4c02" stopOpacity="1" />
            <stop offset=".74" stopColor="#ff7c35" stopOpacity=".95" />
            <stop offset="1" stopColor="#fff" stopOpacity=".45" />
          </linearGradient>
          <linearGradient id={gFill} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fc4c02" stopOpacity=".34" />
            <stop offset=".55" stopColor="#fc4c02" stopOpacity=".1" />
            <stop offset="1" stopColor="#fc4c02" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={gFade} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset=".62" stopColor="#fff" stopOpacity=".45" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={mFade}>
            <rect x="0" y="0" width={VB_W} height={VB_H} fill={`url(#${gFade})`} />
          </mask>
          <clipPath id={cClip} clipPathUnits="userSpaceOnUse">
            <rect
              className="a-wclip"
              x="0"
              y="-40"
              width={VB_W}
              height={VB_H + 80}
              style={cssVars({ "--wd": `${delay + 0.22}s` })}
            />
          </clipPath>
        </defs>

        {/* El relleno entra detrás de la pluma. */}
        <g clipPath={`url(#${cClip})`}>
          <path d={area} mask={`url(#${mFade})`} fill={`url(#${gFill})`} />
        </g>

        {/* Tres pasadas: halo, halo medio y línea. */}
        {[
          { w: 6.2, o: 0.17 },
          { w: 4.6, o: 0.26 },
          { w: 3.4, o: 1 },
        ].map((s) => (
          <path
            key={s.w}
            className="a-wline"
            d={line}
            pathLength="1"
            stroke={`url(#${gStroke})`}
            strokeWidth={s.w}
            opacity={s.o}
            style={delayVar(delay)}
          />
        ))}
      </svg>

      {labels && labels.length > 0 && (
        <Stagger
          from={delay + 0.6}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "calc(-14 * var(--u))",
          }}
        >
          {labels.map((l, i) => (
            <span
              key={`${l}-${i}`}
              style={{
                fontSize: "clamp(11px, calc(13.5 * var(--u)), 15px)",
                fontWeight: activeIndex === i ? 600 : 500,
                color: activeIndex === i ? "#fff" : "rgba(255,255,255,0.62)",
                whiteSpace: "nowrap",
              }}
            >
              {l}
            </span>
          ))}
        </Stagger>
      )}
    </div>
  );
}
