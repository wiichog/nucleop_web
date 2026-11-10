import type { CSSProperties, ReactNode } from "react";
import { Box, Group, Title, UnstyledButton } from "@mantine/core";

/**
 * Las piezas comunes de las pestañas de Clases. Todas siguen la misma idea que
 * el horario semanal: lo que vienes a ver va al frente, crear es un botón, tocar
 * una cosa abre sus acciones y lo pendiente sale en amarillo.
 */

/** El renglón de arriba de cada pestaña: título, avisos y, a la derecha, filtros y el botón de crear. */
export function Encabezado({
  titulo,
  avisos,
  children,
}: {
  titulo: ReactNode;
  avisos?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Group justify="space-between" mb="md" wrap="wrap" gap="sm" align="center">
      <Group gap="xs" wrap="wrap">
        <Title order={3}>{titulo}</Title>
        {avisos}
      </Group>
      {children && (
        <Group gap="sm" wrap="wrap">
          {children}
        </Group>
      )}
    </Group>
  );
}

/**
 * Una cosa que se toca para abrirla: un servicio, una clase, un pase.
 * Box y no Paper: el tema le pone vidrio y radio de tarjeta grande a todo Paper,
 * y una tarjeta de vidrio dentro de otra se ve pesada.
 */
export function Tarjeta({
  onClick,
  etiqueta,
  aviso,
  apagada,
  color,
  children,
  style,
}: {
  onClick?: () => void;
  /** Lo que lee un lector de pantalla al llegar al botón. */
  etiqueta: string;
  /** Algo pendiente: borde punteado amarillo. */
  aviso?: boolean;
  /** Inactiva: se ve, pero atenuada. */
  apagada?: boolean;
  /** Color del servicio: tiñe el fondo y el borde. */
  color?: string | null;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const fondo = aviso
    ? "var(--mantine-color-yellow-light)"
    : color
      ? `color-mix(in srgb, ${color} 12%, transparent)`
      : "var(--mantine-color-default)";
  const borde = aviso
    ? "1px dashed var(--mantine-color-yellow-filled)"
    : color
      ? `1px solid color-mix(in srgb, ${color} 40%, transparent)`
      : "1px solid var(--a-line, var(--mantine-color-default-border))";
  const caja = (
    <Box
      p="sm"
      style={{
        borderRadius: 10,
        background: fondo,
        border: borde,
        opacity: apagada ? 0.55 : 1,
        height: "100%",
        ...style,
      }}
    >
      {children}
    </Box>
  );
  if (!onClick) return caja;
  return (
    <UnstyledButton onClick={onClick} aria-label={etiqueta} style={{ display: "block", width: "100%", height: "100%" }}>
      {caja}
    </UnstyledButton>
  );
}

/** Un punto con el color del servicio. */
export function PuntoColor({ color, size = 10 }: { color?: string | null; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        flex: "0 0 auto",
        width: size,
        height: size,
        borderRadius: 3,
        background: color || "#888",
      }}
    />
  );
}

/** En una tarjeta cabe un nombre, no un correo: sin nombre, va lo que está antes de la @. */
export function nombreCorto(nombre: string | null | undefined): string | null {
  if (!nombre) return null;
  return nombre.includes("@") ? nombre.split("@")[0] : nombre;
}
