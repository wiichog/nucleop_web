import { Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

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
    <Group justify="space-between" align="flex-start" mb="lg" wrap="nowrap">
      <Stack gap={2}>
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
