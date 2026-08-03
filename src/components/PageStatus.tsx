import { Button, Center, Group, Stack, Text } from "@mantine/core";
import { AlertTriangle } from "lucide-react";
import { AtomLogo } from "../landing/AtomLogo";
import { GlassCard } from "./aurora";

export function PageLoading({ label = "Cargando…" }: { label?: string }) {
  return (
    <Center mih={200}>
      <Stack align="center" gap="sm" className="a-rise">
        <div className="atom-loader">
          <AtomLogo size={46} pulse glow={false} />
        </div>
        <Text c="dimmed" size="sm">
          {label}
        </Text>
      </Stack>
    </Center>
  );
}

export function PageError({
  message = "No se pudo cargar la información. Intenta de nuevo.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    // NO usa `variant="core"`: el borde flame está reservado a la tarjeta que
    // manda en cada pantalla, y este componente se renderiza EN LÍNEA dentro de
    // pantallas que ya tienen la suya (se verían dos núcleos encendidos a la
    // vez). El error se señala con tinta de peligro en el ícono y un hairline
    // rojo, no compitiendo por el acento de marca.
    <GlassCard
      role="alert"
      padding={22}
      className="a-rise"
      style={{ borderColor: "rgba(255,90,95,0.34)" }}
    >
      <Group justify="space-between" align="center" gap="md" wrap="wrap">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              width: "calc(38 * var(--u))",
              height: "calc(38 * var(--u))",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              flex: "none",
              background: "rgba(255,90,95,0.16)",
              color: "var(--nucleo-danger)",
            }}
          >
            <AlertTriangle size={19} strokeWidth={1.9} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="a-kicker" style={{ marginBottom: 4 }}>
              Algo salió mal
            </div>
            <Text size="sm">{message}</Text>
          </div>
        </Group>
        {onRetry && (
          <Button variant="default" size="xs" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </Group>
    </GlassCard>
  );
}

export function NoGymAssigned() {
  return (
    <PageError message="No tienes un gimnasio asignado. Contacta al administrador de Nucleo." />
  );
}
