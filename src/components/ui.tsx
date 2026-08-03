import { Badge, Text } from "@mantine/core";
import type { MantineSize } from "@mantine/core";
import type { ReactNode } from "react";
import {
  MEMBERSHIP_STATUS,
  MEMBERSHIP_STATUS_COLOR,
  PAYMENT_STATUS,
  PAYMENT_STATUS_COLOR,
  PAYMENT_TX_STATUS,
  PAYMENT_TX_STATUS_COLOR,
  label,
} from "../lib/labels";
import { fmtQ } from "../lib/money";
import { AuroraHero, Kicker, SectionLabel } from "./aurora";

/**
 * Primitivos compartidos por todas las pantallas del panel. Desde el rediseño
 * **Aurora** son una fachada delgada sobre `components/aurora.tsx`: mantienen la
 * API que ya usan las 24 páginas (`PageHeader`, `SectionLabel`, `Money`…) y por
 * dentro componen el lenguaje nuevo. Cambiar el lenguaje aquí cambia el panel
 * entero sin editar pantalla por pantalla.
 */

// Reexportados desde `aurora.tsx` (definición única): las pantallas los siguen
// importando desde aquí, pero solo existe una implementación de cada uno.
export { Kicker, SectionLabel };

/**
 * Badge de conteo (notificaciones / pendientes). Círculo perfecto para 1 dígito
 * y pastilla para 10…99 y "99+", para que el número nunca se recorte.
 */
export function CountBadge({
  count,
  size = "sm",
}: {
  count: number;
  size?: MantineSize;
}) {
  if (count <= 0) return null;
  return (
    <Badge color="flame" variant="filled" size={size} circle={count < 10}>
      {count > 99 ? "99+" : count}
    </Badge>
  );
}

/**
 * Encabezado de página. Ahora es el **hero** del lenguaje Aurora: chip de
 * sección, titular en Inter Tight que se revela por línea con máscara, blurb y
 * hairline con tick flame. Misma firma de props que antes.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  kicker,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  kicker?: string;
}) {
  return <AuroraHero kicker={kicker} title={title} subtitle={subtitle} action={action} />;
}

/**
 * Dinero en Quetzales con dígitos tabulares (columnas que no "bailan"). Pasa
 * `block` para alinear a la derecha dentro de una celda de tabla.
 */
export function Money({
  value,
  decimals,
  c,
  fw = 600,
  block = false,
}: {
  value: number | string | null | undefined;
  decimals?: number;
  c?: string;
  fw?: number;
  block?: boolean;
}) {
  return (
    <Text
      component="span"
      c={c}
      fw={fw}
      style={{
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.01em",
        ...(block ? { display: "block", textAlign: "right" } : {}),
      }}
    >
      {fmtQ(value, { decimals })}
    </Text>
  );
}

const STATUS_SOURCES = {
  membership: [MEMBERSHIP_STATUS, MEMBERSHIP_STATUS_COLOR] as const,
  payment: [PAYMENT_STATUS, PAYMENT_STATUS_COLOR] as const,
  paymentTx: [PAYMENT_TX_STATUS, PAYMENT_TX_STATUS_COLOR] as const,
};

/** Pill de estado unificada: resuelve etiqueta + color desde los mapas centrales. */
export function StatusBadge({
  kind,
  status,
  variant = "light",
  size,
}: {
  kind: keyof typeof STATUS_SOURCES;
  status?: string | null;
  variant?: string;
  size?: MantineSize;
}) {
  const [labels, colors] = STATUS_SOURCES[kind];
  return (
    <Badge color={colors[status ?? ""] ?? "gray"} variant={variant} size={size}>
      {label(labels, status)}
    </Badge>
  );
}
