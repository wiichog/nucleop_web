import { FormEvent, useState } from "react";
import {
  Button,
  Card,
  Group,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { LogOut } from "lucide-react";
import { useMe, usePasswordChange } from "../api/hooks";
import { useCuentaSinCargar } from "../components/PageStatus";
import { PageHeader, SectionLabel } from "../components/ui";
import { GlassCard, delayVar } from "../components/aurora";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";
import { AUDIT_ROLE, label } from "../lib/labels";

/** Dato de la cuenta en el ritmo editorial de Aurora: overline + valor. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <SectionLabel mb={4}>{etiqueta}</SectionLabel>
      <Text fw={600} style={{ letterSpacing: "-0.01em", wordBreak: "break-word" }}>
        {valor}
      </Text>
    </div>
  );
}

export function ProfilePage() {
  const { email, roles, isSuperuser, logout, primaryGymId, gyms } = useAuth();
  const sinCuenta = useCuentaSinCargar();
  const me = useMe();
  // Con `must_change_password` (lo marca el gym al restablecerle la contraseña a
  // alguien) el backend no pide la actual: `PasswordChangeSerializer` se la salta.
  // Exigirla aquí obligaba a inventar una contraseña que la persona no sabe.
  const cambioForzado = me.data?.must_change_password === true;
  const gymActual = gyms.find((gym) => gym.id === primaryGymId);
  const changePassword = usePasswordChange();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (next.length < 8) {
      setErr("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    try {
      await changePassword.mutateAsync(
        cambioForzado ? { new_password: next } : { current_password: current, new_password: next },
      );
      notifications.show({ color: "teal", message: "Contraseña actualizada." });
      setCurrent("");
      setNext("");
      // El backend apaga el flag al guardarla. Sin volver a leer /me, el formulario
      // seguiría sin pedir la actual y un segundo cambio ya no pasaría.
      if (cambioForzado) void me.refetch();
    } catch (error) {
      // Sin campo «actual» en pantalla, «verifica la actual» no tiene sentido: lo
      // que puede fallar es la nueva, y el backend dice por qué.
      setErr(
        cambioForzado
          ? errMsg(error, "No se pudo cambiar la contraseña. Intenta de nuevo.")
          : "No se pudo cambiar la contraseña. Verifica la actual.",
      );
    }
  };

  // Si /me falló, el correo y los roles llegan vacíos: el perfil diría «—» en todo.
  if (sinCuenta) return sinCuenta;

  const rolesLabel =
    roles.map((r) => label(AUDIT_ROLE, r.role)).join(", ") || (isSuperuser ? "Superadmin" : "—");

  return (
    <div>
      <PageHeader
        kicker="Cuenta"
        title="Mi perfil"
        subtitle="Con qué correo entras al panel, qué rol te da acceso y desde dónde cambias tu contraseña."
      />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <GlassCard variant="big" sheen padding={24} delay={0.6}>
          <SectionLabel mb="xs" as="h2">
            Sesión
          </SectionLabel>
          <Title order={3} mb="md">
            Cuenta
          </Title>
          <Stack gap="md">
            <Dato etiqueta="Correo" valor={email || "—"} />
            <Dato etiqueta="Rol" valor={rolesLabel} />
            <Dato
              etiqueta="Gimnasio actual"
              valor={gymActual?.name ?? "—"}
            />
          </Stack>
          <Group mt="lg">
            <Button variant="default" leftSection={<LogOut size={16} />} onClick={logout}>
              Cerrar sesión
            </Button>
          </Group>
        </GlassCard>

        {/* Sigue siendo un <form> de verdad: el submit y su validación no cambian. */}
        <Card component="form" onSubmit={onSubmit} className="a-slide-r" style={delayVar(0.72)}>
          <SectionLabel mb="xs" as="h2">
            Seguridad
          </SectionLabel>
          <Title order={3} mb="md">
            Cambiar contraseña
          </Title>
          <Stack gap="sm">
            {cambioForzado ? (
              <Text size="sm" c="dimmed">
                Restablecieron tu contraseña, así que no te pedimos la actual: elige una nueva.
              </Text>
            ) : (
              <PasswordInput label="Contraseña actual" value={current} onChange={(e) => setCurrent(e.currentTarget.value)} />
            )}
            <PasswordInput label="Nueva contraseña" value={next} onChange={(e) => setNext(e.currentTarget.value)} />
            {err && (
              <Text c="red" size="sm">
                {err}
              </Text>
            )}
            <Button
              type="submit"
              disabled={(!cambioForzado && !current) || !next}
              loading={changePassword.isPending}
            >
              Actualizar contraseña
            </Button>
          </Stack>
        </Card>
      </SimpleGrid>
    </div>
  );
}
