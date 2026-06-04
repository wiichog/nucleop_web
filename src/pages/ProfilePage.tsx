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
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { AUDIT_ROLE, label } from "../lib/labels";

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
      <PageHeader title="Mi perfil" />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card>
          <Title order={3} mb="sm">
            Cuenta
          </Title>
          <Stack gap={6}>
            <Text size="sm">
              <strong>Correo:</strong> {email || "—"}
            </Text>
            <Text size="sm">
              <strong>Rol:</strong> {rolesLabel}
            </Text>
            <Text size="sm">
              <strong>Gimnasio actual:</strong> {primaryGymId ? `${primaryGymId.slice(0, 8)}…` : "—"}
            </Text>
          </Stack>
          <Group mt="md">
            <Button variant="default" leftSection={<LogOut size={16} />} onClick={logout}>
              Cerrar sesión
            </Button>
          </Group>
        </Card>

        <Card component="form" onSubmit={onSubmit}>
          <Title order={3} mb="sm">
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
