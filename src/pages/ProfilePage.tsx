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
import { usePasswordChange } from "../api/hooks";
import { PageHeader, SectionLabel } from "../components/ui";
import { GlassCard, delayVar } from "../components/aurora";
import { useAuth } from "../lib/auth";
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
  const { email, roles, isSuperuser, logout, primaryGymId } = useAuth();
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
      await changePassword.mutateAsync({ current_password: current, new_password: next });
      notifications.show({ color: "teal", message: "Contraseña actualizada." });
      setCurrent("");
      setNext("");
    } catch {
      setErr("No se pudo cambiar la contraseña. Verifica la actual.");
    }
  };

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
              valor={primaryGymId ? `${primaryGymId.slice(0, 8)}…` : "—"}
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
            <PasswordInput label="Contraseña actual" value={current} onChange={(e) => setCurrent(e.currentTarget.value)} />
            <PasswordInput label="Nueva contraseña" value={next} onChange={(e) => setNext(e.currentTarget.value)} />
            {err && (
              <Text c="red" size="sm">
                {err}
              </Text>
            )}
            <Button type="submit" disabled={!current || !next} loading={changePassword.isPending}>
              Actualizar contraseña
            </Button>
          </Stack>
        </Card>
      </SimpleGrid>
    </div>
  );
}
