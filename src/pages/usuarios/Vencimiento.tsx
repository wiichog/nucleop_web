import { Badge } from "@mantine/core";

/**
 * Cuánto le queda a la cuota, en una pastilla: verde con días de sobra, amarillo
 * a 7 días o menos, rojo si ya venció. Sin dato (el coach no recibe la relación
 * económica) no se pinta nada: un guion en cada fila es ruido.
 */
export function Vencimiento({
  days,
  date,
  graceUntil,
}: {
  days?: number | null;
  date?: string | null;
  graceUntil?: string | null;
}) {
  if (days == null) return null;
  // Vencido pero dentro de la gracia de pago del gym: debe, pero todavía entrena.
  if (graceUntil) {
    const [, mes, dia] = graceUntil.split("-");
    return (
      <Badge color="orange" variant="light" title={date ? `Vence: ${date}` : undefined}>
        En gracia hasta {dia}/{mes}
      </Badge>
    );
  }
  const color = days < 0 ? "red" : days <= 7 ? "yellow" : "teal";
  const text = days < 0 ? `Vencido hace ${Math.abs(days)} d` : days === 0 ? "Vence hoy" : `${days} días`;
  return (
    <Badge color={color} variant="light" title={date ? `Vence: ${date}` : undefined}>
      {text}
    </Badge>
  );
}
