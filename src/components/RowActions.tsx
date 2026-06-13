import { ActionIcon, Button, Group, Menu } from "@mantine/core";
import { MoreVertical, type LucideIcon } from "lucide-react";

export interface RowAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  /** Color Mantine (p. ej. "red"). */
  color?: string;
  /** Variante del botón en desktop (no afecta al kebab). Default "default". */
  variant?: "default" | "light" | "filled" | "subtle" | "outline";
  loading?: boolean;
  disabled?: boolean;
}

/** Permite escribir `[a, cond && b]` y filtrar lo falsy. */
type MaybeAction = RowAction | false | null | undefined;

/**
 * Acciones de fila responsivas: botones en línea en desktop (≥ sm) y un menú
 * kebab (⋮) en móvil. Evita que la columna "Acciones" con 3-5 botones haga la
 * fila larguísima y obligue a scrollear horizontal en el teléfono.
 */
export function RowActions({ actions }: { actions: MaybeAction[] }) {
  const items = actions.filter(Boolean) as RowAction[];
  if (!items.length) return null;

  return (
    <>
      {/* Desktop: botones en línea */}
      <Group gap="xs" wrap="nowrap" visibleFrom="sm">
        {items.map((a, i) => {
          const Icon = a.icon;
          return (
            <Button
              key={i}
              size="xs"
              variant={a.variant ?? "default"}
              color={a.color}
              leftSection={Icon ? <Icon size={14} /> : undefined}
              loading={a.loading}
              disabled={a.disabled}
              onClick={a.onClick}
            >
              {a.label}
            </Button>
          );
        })}
      </Group>

      {/* Móvil: un solo kebab que despliega las mismas acciones */}
      <Menu shadow="md" position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" aria-label="Acciones" hiddenFrom="sm">
            <MoreVertical size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {items.map((a, i) => {
            const Icon = a.icon;
            return (
              <Menu.Item
                key={i}
                color={a.color}
                leftSection={Icon ? <Icon size={14} /> : undefined}
                disabled={a.disabled || a.loading}
                onClick={a.onClick}
              >
                {a.label}
              </Menu.Item>
            );
          })}
        </Menu.Dropdown>
      </Menu>
    </>
  );
}
