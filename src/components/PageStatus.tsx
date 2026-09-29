import { Avatar, Button, Center, Group, Stack, Text } from "@mantine/core";
import { onlineManager } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useMe, usePlatformGyms } from "../api/hooks";
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

/**
 * Cuenta autenticada que todavía no tiene acceso a ningún gimnasio.
 *
 * Antes esto era un `PageError` —triángulo de alerta y "Algo salió mal"—, así que
 * quien entraba por primera vez creía que el panel estaba roto cuando en realidad
 * su cuenta se había creado bien y solo faltaba que un gimnasio le diera acceso.
 * Le pasa a todo el staff nuevo, y a cualquiera que entre con Google o Facebook.
 *
 * Saluda por su nombre y muestra su foto y su correo: confirma que la sesión quedó
 * abierta y a nombre de quién, que es justo lo que la persona necesita saber para
 * pedirle acceso a alguien.
 *
 * Solo lo afirma si `/me` de verdad respondió. El `AuthProvider` deja los roles
 * vacíos también cuando `/me` FALLA —un 429 del throttle de `/auth/refresh`, que
 * le llega a todo el box a la vez porque la cuota va por IP; un 5xx durante un
 * deploy; la red— y todas las páginas del gym caen aquí: decirle entonces a un
 * dueño que ningún gimnasio le ha dado acceso lo manda a pedir un acceso que ya
 * tiene. Lo mismo al superadmin si falló `/platform/gyms`, de donde sale su lista
 * de gimnasios. Sin red, React Query ni siquiera marca error: deja la consulta en
 * pausa (`pending`, sin `isLoading`) hasta que vuelva la conexión.
 */
export function NoGymAssigned() {
  const me = useMe();
  const catalogo = usePlatformGyms(me.data?.is_superuser ?? false);
  const { data } = me;
  const sinCargar = !data ? me : data.is_superuser && !catalogo.data ? catalogo : null;
  if (sinCargar?.isError) {
    return (
      <PageError
        message="No pudimos cargar tu cuenta. Tu sesión sigue abierta: intenta de nuevo en unos segundos."
        onRetry={() => sinCargar.refetch()}
      />
    );
  }
  if (sinCargar) {
    // `paused` no siempre es falta de red: React Query también pausa los
    // reintentos mientras la pestaña está oculta.
    return (
      <PageLoading
        label={
          sinCargar.fetchStatus === "paused" && !onlineManager.isOnline()
            ? "Sin conexión. Tu cuenta se cargará en cuanto vuelva la red."
            : "Cargando tu cuenta…"
        }
      />
    );
  }

  const nombre = [data?.athlete?.first_name, data?.athlete?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const iniciales =
    [data?.athlete?.first_name?.[0], data?.athlete?.last_name?.[0]].filter(Boolean).join("") ||
    (data?.email?.[0] ?? "?").toUpperCase();

  return (
    <Center mih={260}>
      <GlassCard className="a-rise" style={{ maxWidth: 520 }}>
        <Stack align="center" gap="md" p="lg">
          <Avatar src={data?.athlete?.photo_url || undefined} size={72} radius="50%">
            {iniciales}
          </Avatar>
          <Stack align="center" gap={4}>
            <Text fw={600} size="lg">
              {nombre ? `Hola, ${nombre}` : "Tu cuenta está lista"}
            </Text>
            {data?.email && (
              <Text c="dimmed" size="sm">
                {data.email}
              </Text>
            )}
          </Stack>
          <Text c="dimmed" size="sm" ta="center">
            Tu cuenta de Nucleo quedó creada, pero todavía ningún gimnasio te ha dado acceso a su
            panel. Pídele al administrador de tu gimnasio que te invite con este correo y podrás
            entrar de inmediato.
          </Text>
          <Text c="dimmed" size="xs" ta="center">
            ¿Eres atleta? El panel es para gimnasios: tu experiencia está en la app de Nucleo.
          </Text>
        </Stack>
      </GlassCard>
    </Center>
  );
}
