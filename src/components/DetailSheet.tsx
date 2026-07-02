import { ActionIcon, Drawer, Group, ScrollArea, Text } from "@mantine/core";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Sheet de detalle estilo iPhone: drawer lateral con material glass (heredado del
 * tema), esquinas redondeadas, grabber y scrim que congela el fondo. Reemplaza a
 * las fichas de detalle que antes aparecían como card inline o modal centrado.
 *
 * El material frosted vive en el tema (mantineTheme.ts → Drawer.classNames.content
 * = "nucleo-glass"); aquí solo se compone la estructura (grabber + header propio).
 */
export function DetailSheet({
  opened,
  onClose,
  title,
  children,
  size = 480,
}: {
  opened: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  size?: number | string;
}) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={size}
      offset={8}
      radius="lg"
      padding={0}
      withCloseButton={false}
      scrollAreaComponent={ScrollArea.Autosize}
      transitionProps={{
        transition: "slide-left",
        duration: 280,
        // Salida con "resorte" (ease-out con leve rebote) tipo hoja de iOS.
        timingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* Grabber: afordancia de hoja arrastrable. */}
      <div style={{ paddingTop: 10 }}>
        <div className="nucleo-grabber" style={{ margin: "0 auto" }} />
      </div>
      <Group justify="space-between" wrap="nowrap" px="lg" py="sm" gap="sm">
        <Text fw={600} fz="lg" ff='"Space Grotesk", sans-serif' style={{ letterSpacing: "-0.01em" }} truncate>
          {title}
        </Text>
        <ActionIcon variant="subtle" color="gray" radius="xl" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </ActionIcon>
      </Group>
      <div style={{ padding: "4px 20px 28px" }}>{children}</div>
    </Drawer>
  );
}
