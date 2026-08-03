import { Stack, Text, ThemeIcon } from "@mantine/core";
import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { GlassCard } from "./aurora";

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
    <GlassCard role="status" padding={30} className="a-rise">
      <Stack align="center" gap="xs">
        <ThemeIcon variant="light" color="flame" size={46} radius="xl">
          <Icon size={22} strokeWidth={1.8} />
        </ThemeIcon>
        <Text fw={500} fz="lg" ff="var(--a-font-display)" style={{ letterSpacing: "-0.015em" }}>
          {title}
        </Text>
        {description && (
          <Text c="dimmed" size="sm" ta="center" maw={420}>
            {description}
          </Text>
        )}
        {action}
      </Stack>
    </GlassCard>
  );
}
