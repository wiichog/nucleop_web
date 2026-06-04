import { Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Paper withBorder radius="md" p="xl" role="status">
      <Stack align="center" gap="xs">
        <ThemeIcon variant="light" color="flame" size={46} radius="xl">
          <Inbox size={22} />
        </ThemeIcon>
        <Text fw={600}>{title}</Text>
        {description && (
          <Text c="dimmed" size="sm" ta="center" maw={420}>
            {description}
          </Text>
        )}
        {action}
      </Stack>
    </Paper>
  );
}
