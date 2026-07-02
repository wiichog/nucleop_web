import { Badge, Box, Group, Stack, Text, Title } from "@mantine/core";
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

const DISPLAY_FONT = '"Space Grotesk", Inter, sans-serif';

/**
 * Badge de conteo (notificaciones / pendientes). Antes se usaba `<Badge circle>`,
 * que fuerza un círculo cuadrado del tamaño de UN carácter: con 2+ dígitos el
 * número se desbordaba/recortaba ("se mira mal a partir de 10"). Aquí el badge es
 * un círculo perfecto para 1 dígito y se expande a pastilla para 10…99 y "99+".
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
 * Kicker/overline editorial: MAYÚSCULAS con tracking + punto flame. Es el mismo
 * lenguaje de los grupos del sidebar, bajado al cuerpo de cada pantalla. Firma de
 * marca reactivada (antes solo vivía en el nav).
 */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <Group gap={7} align="center" mb={6} wrap="nowrap">
      <span
        aria-hidden
        style={{
          width: 5,
          height: 5,
          borderRadius: "var(--radius-pill)",
          background: "var(--nucleo-accent)",
          boxShadow: "0 0 8px rgba(252,76,2,0.55)",
          flex: "none",
        }}
      />
      <Text
        component="span"
        tt="uppercase"
        fw={600}
        fz={11}
        style={{ letterSpacing: "0.18em", color: "var(--nucleo-muted)", fontFamily: DISPLAY_FONT }}
      >
        {children}
      </Text>
    </Group>
  );
}

/** Overline de subsección dentro de una página (reutiliza el lenguaje del kicker). */
export function SectionLabel({
  children,
  mt,
  mb = "xs",
}: {
  children: ReactNode;
  mt?: MantineSize | number;
  mb?: MantineSize | number;
}) {
  return (
    <Text
      tt="uppercase"
      fw={600}
      fz={11}
      mt={mt}
      mb={mb}
      style={{ letterSpacing: "0.16em", color: "var(--nucleo-muted)", fontFamily: DISPLAY_FONT }}
    >
      {children}
    </Text>
  );
}

/** Encabezado de página consistente: kicker + título display + hairline con tick flame. */
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
  return (
    <Box mb="lg">
      <Group justify="space-between" align="flex-start" gap="sm">
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          {kicker && <Kicker>{kicker}</Kicker>}
          <Title order={2} style={{ letterSpacing: "-0.02em" }}>
            {title}
          </Title>
          {subtitle && (
            <Text c="dimmed" size="sm">
              {subtitle}
            </Text>
          )}
        </Stack>
        {action}
      </Group>
      {/* Hairline editorial con tick flame: ancla cada página al mismo lenguaje. */}
      <Box mt="md" style={{ position: "relative", height: 1, background: "var(--nucleo-hairline)" }}>
        <span
          aria-hidden
          style={{ position: "absolute", left: 0, top: 0, width: 44, height: 1, background: "var(--nucleo-accent)" }}
        />
      </Box>
    </Box>
  );
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
