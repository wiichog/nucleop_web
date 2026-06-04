import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Anchor, Button, Center, Paper, PasswordInput, Stack, Text } from "@mantine/core";
import { usePasswordResetConfirm } from "../api/hooks";
import { AtomLogo } from "../landing/AtomLogo";
import { ParticleSnow } from "../landing/ParticleSnow";

export function PasswordResetConfirmPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const reset = usePasswordResetConfirm();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await reset.mutateAsync({ uid, token, password });
  };

  return (
    <Center mih="100vh" p="md" style={{ position: "relative" }}>
      <ParticleSnow />
      <Paper
        component="form"
        withBorder
        radius="lg"
        p="xl"
        w={380}
        style={{ position: "relative", backdropFilter: "blur(10px)", background: "rgba(255,255,255,0.03)" }}
        onSubmit={submit}
      >
        <Stack align="center" gap={6} mb="lg">
          <AtomLogo size={56} />
          <Text fw={700} size="xl" ff='"Space Grotesk", sans-serif'>
            Nueva contraseña
          </Text>
          <Text c="dimmed" size="sm">
            Crea una clave nueva para tu cuenta.
          </Text>
        </Stack>
        <Stack gap="sm">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            minLength={8}
            required
            label="Nueva contraseña"
          />
          {reset.isError && (
            <Text c="red" size="sm">
              El enlace no es válido o expiró.
            </Text>
          )}
          {reset.isSuccess ? (
            <Text size="sm">
              Contraseña actualizada.{" "}
              <Anchor component={Link} to="/login">
                Inicia sesión
              </Anchor>
              .
            </Text>
          ) : (
            <Button type="submit" fullWidth disabled={!uid || !token} loading={reset.isPending}>
              Actualizar contraseña
            </Button>
          )}
        </Stack>
      </Paper>
    </Center>
  );
}
