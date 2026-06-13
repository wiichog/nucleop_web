import { Alert, Button, Center, Group, Stack, Text } from "@mantine/core";
import { AtomLogo } from "../landing/AtomLogo";

export function PageLoading({ label = "Cargando…" }: { label?: string }) {
  return (
    <Center mih={160}>
      <Stack align="center" gap="sm">
        <div className="atom-loader">
          <AtomLogo size={46} pulse />
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
    <Alert color="red" title="Algo salió mal" variant="light" radius="md">
      <Group justify="space-between" align="center" gap="sm">
        <Text size="sm">{message}</Text>
        {onRetry && (
          <Button variant="default" size="xs" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </Group>
    </Alert>
  );
}

export function NoGymAssigned() {
  return (
    <PageError message="No tienes un gimnasio asignado. Contacta al administrador de Nucleo." />
  );
}
