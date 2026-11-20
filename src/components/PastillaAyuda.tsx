import { Badge, Popover, Text, type BadgeProps } from "@mantine/core";
import type { ReactNode } from "react";

/**
 * Pastilla que explica qué significa al tocarla.
 *
 * Antes esas explicaciones vivían en `title`, que solo aparece al pasar el mouse:
 * en el celular (donde se modera la mayor parte del tiempo) no había forma de
 * leerlas. Un toque abre un globo con el texto; otro toque o tocar fuera lo cierra.
 *
 * No la uses dentro de un elemento que ya es botón (una `Tarjeta` con `onClick`):
 * sería un botón dentro de otro.
 */
export function PastillaAyuda({
  ayuda,
  children,
  ...badge
}: { ayuda: string; children: ReactNode } & Omit<BadgeProps, "children">) {
  return (
    <Popover width={240} position="bottom-start" withArrow shadow="md">
      <Popover.Target>
        <Badge
          component="button"
          type="button"
          style={{ cursor: "help", border: 0 }}
          {...badge}
        >
          {children}
        </Badge>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="sm">{ayuda}</Text>
      </Popover.Dropdown>
    </Popover>
  );
}
