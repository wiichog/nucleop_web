import { Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Ícono contextual (por defecto Inbox). Un empty state honesto invita a actuar. */
  icon?: LucideIcon;
}) {
  return (
    <Paper withBorder radius="md" p="xl" role="status" style={{ background: "rgba(255,255,255,0.015)" }}>
      <Stack align="center" gap="xs">
        <ThemeIcon variant="light" color="flame" size={46} radius="md">
          <Icon size={22} />
        </ThemeIcon>
        <Text fw={600} ff='"Space Grotesk", sans-serif' style={{ letterSpacing: "-0.01em" }}>
          {title}
        </Text>
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
