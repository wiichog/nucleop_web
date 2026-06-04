import { FormEvent, useState } from "react";
import {
  Anchor,
  Box,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useLogin, usePasswordResetRequest } from "../api/hooks";
import { AtomLogo } from "../landing/AtomLogo";
import { ParticleSnow } from "../landing/ParticleSnow";

function AuthBrand({ subtitle }: { subtitle: string }) {
  return (
    <Stack align="center" gap={6} mb="lg">
      <AtomLogo size={64} />
      <Text fw={700} size="30px" ff='"Space Grotesk", sans-serif' style={{ letterSpacing: 0.5 }}>
        Nucleo
      </Text>
      <Text c="flame" fw={600} size="sm">
        {subtitle}
      </Text>
    </Stack>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const login = useLogin();
  const reset = usePasswordResetRequest();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login.mutateAsync({ email: email.trim().toLowerCase(), password });
    window.location.assign("/panel");
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
        onSubmit={
          resetMode
            ? async (event: FormEvent) => {
                event.preventDefault();
                await reset.mutateAsync(identifier);
              }
            : onSubmit
        }
      >
        {resetMode ? (
          <>
            <AuthBrand subtitle="Recupera tu acceso" />
            <Text ta="center" c="dimmed" size="sm" mb="md">
              Ingresa el correo con el que te registraste. Te enviaremos instrucciones si la cuenta existe.
            </Text>
            <Stack gap="sm">
              <TextInput
                label="Correo electrónico"
                value={identifier}
                onChange={(e) => setIdentifier(e.currentTarget.value)}
                required
              />
              {reset.isSuccess && (
                <Text c="flame" size="sm">
                  Solicitud recibida. Revisa tu correo.
                </Text>
              )}
              <Button type="submit" fullWidth loading={reset.isPending}>
                Enviar instrucciones
              </Button>
              <Anchor component="button" type="button" ta="center" onClick={() => setResetMode(false)}>
                Volver al login
              </Anchor>
            </Stack>
          </>
        ) : (
          <>
            <AuthBrand subtitle="Panel del gimnasio" />
            <Stack gap="sm">
              <TextInput
                label="Correo electrónico"
                type="email"
                autoComplete="email"
                placeholder="admin@tugym.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
              />
              <PasswordInput
                label="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
              {login.isError && (
                <Text c="red" size="sm">
                  Credenciales inválidas.
                </Text>
              )}
              <Button type="submit" fullWidth loading={login.isPending}>
                Entrar
              </Button>
              <Anchor component="button" type="button" ta="center" onClick={() => setResetMode(true)}>
                Olvidé mi contraseña
              </Anchor>
            </Stack>
          </>
        )}
      </Paper>
      <Box />
    </Center>
  );
}
