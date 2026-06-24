import { Badge, Group, Stack, Text, Title } from "@mantine/core";
import type { MantineSize } from "@mantine/core";
import type { ReactNode } from "react";

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

/** Encabezado de página consistente: título + subtítulo + acción opcional. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-start" mb="lg" gap="sm">
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Title order={2}>{title}</Title>
        {subtitle && (
          <Text c="dimmed" size="sm">
            {subtitle}
          </Text>
        )}
      </Stack>
      {action}
    </Group>
  );
}
