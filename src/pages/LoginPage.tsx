import { FormEvent, useState } from "react";
import {
  Anchor,
  Box,
  Button,
  Center,
  Divider,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useLogin, usePasswordResetRequest, useSocialLogin } from "../api/hooks";
import { AtomLogo } from "../landing/AtomLogo";
import { BRAND_VIDEO_URL } from "../lib/brand";
import { loginWithFacebook } from "../lib/facebookAuth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID ?? "";

function SocialLoginButtons({ onDone }: { onDone: () => void }) {
  const socialLogin = useSocialLogin();
  const [error, setError] = useState("");

  const handleFacebook = async () => {
    setError("");
    try {
      const token = await loginWithFacebook(FACEBOOK_APP_ID);
      await socialLogin.mutateAsync({ provider: "facebook", token });
      onDone();
    } catch {
      setError("No se pudo iniciar sesión con Facebook.");
    }
  };

  if (!GOOGLE_CLIENT_ID && !FACEBOOK_APP_ID) return null;

  return (
    <Stack gap="sm" mt="md">
      <Divider label="o continúa con" labelPosition="center" />
      {GOOGLE_CLIENT_ID && (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <Center>
            <GoogleLogin
              onSuccess={async (cred) => {
                setError("");
                if (!cred.credential) return;
                try {
                  await socialLogin.mutateAsync({ provider: "google", token: cred.credential });
                  onDone();
                } catch {
                  setError("No se pudo iniciar sesión con Google.");
                }
              }}
              onError={() => setError("No se pudo iniciar sesión con Google.")}
            />
          </Center>
        </GoogleOAuthProvider>
      )}
      {FACEBOOK_APP_ID && (
        <Button fullWidth variant="outline" color="blue" onClick={handleFacebook} loading={socialLogin.isPending}>
          Continuar con Facebook
        </Button>
      )}
      {error && (
        <Text c="red" size="sm" ta="center">
          {error}
        </Text>
      )}
    </Stack>
  );
}

function AuthBrand({ subtitle }: { subtitle: string }) {
  return (
    <Stack align="center" gap={6} mb="lg">
      <AtomLogo size={64} glow={false} />
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
    <Center mih="100vh" p="md" style={{ position: "relative", overflow: "hidden" }}>
      {/* Video de fondo (misma identidad que la landing) */}
      <video
        autoPlay
        loop
        muted
        playsInline
        src={BRAND_VIDEO_URL}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      />
      {/* Velos de marca: oscurecer + tinte flame para legibilidad */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 0 }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at top, rgba(252,76,2,0.10), transparent 60%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <Paper
        component="form"
        withBorder
        radius="lg"
        p="xl"
        w="100%"
        maw={380}
        style={{ position: "relative", zIndex: 1, backdropFilter: "blur(10px)", background: "rgba(255,255,255,0.03)" }}
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
            <SocialLoginButtons onDone={() => window.location.assign("/panel")} />
          </>
        )}
      </Paper>
      <Box />
    </Center>
  );
}
