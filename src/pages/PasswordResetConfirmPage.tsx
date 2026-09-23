import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Anchor, Button, Center, PasswordInput, Stack, Text } from "@mantine/core";
import { usePasswordResetConfirm } from "../api/hooks";
import { AtomLogo } from "../landing/AtomLogo";
import { GlassChip, HeroTitle } from "../components/aurora";

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
    <div className="aurora-stage">
      <div className="aurora-backdrop" />
      <div className="aurora-bloom aurora-bloom--flame animate-drift-1" />
      <div className="aurora-grain" />
      <div className="aurora-vignette" />

      <Center mih="100vh" p="md">
        <form
          className="a-glass-card a-glass-card--big a-sheen a-slide-r"
          style={{
            width: "100%",
            maxWidth: "calc(430 * var(--u))",
            padding: "calc(32 * var(--u))",
          }}
          onSubmit={submit}
        >
          <Stack gap={14} mb="xl">
            <div className="a-pop" style={{ animationDelay: ".26s", width: "fit-content" }}>
              <AtomLogo size={52} glow={false} />
            </div>
            <GlassChip delay={0.44}>Recuperar acceso</GlassChip>
            <HeroTitle lines={["Nueva", "contraseña"]} delay={0.56} />
          </Stack>

          <Stack gap="sm" className="a-rise" style={{ animationDelay: ".9s" }}>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              minLength={8}
              required
              autoComplete="new-password"
              label="Nueva contraseña"
            />
            {reset.isError && (
              <Text c="red" size="sm">
                El enlace no es válido o expiró.
              </Text>
            )}
            {reset.isSuccess ? (
              /* Quien llega a esta página viene casi siempre del APP. El correo de
                 recuperación es el mismo para todos y aquí no hay forma de saber de
                 dónde salió cada quien, pero los atletas son la mayoría y el panel
                 es de los dueños de gimnasio.

                 Antes la única salida era "Inicia sesión" al panel web, y al ser la
                 única instrucción de la pantalla se leía como EL paso siguiente:
                 mandaba a un atleta que acaba de recuperar su contraseña desde el
                 teléfono a un sitio que no es suyo. Ahora el app va primero y el
                 panel queda calificado con su pregunta.

                 Sin enlace `nucleo://` a propósito, aunque el app tenga ese esquema:
                 en un teléfono que no lo tenga instalado, Safari contesta que la
                 dirección no es válida y ese error parece del app. Una frase funciona
                 en los tres casos (app instalada, no instalada, y escritorio). */
              <Stack gap={6}>
                <Text size="sm" fw={600}>
                  Contraseña actualizada.
                </Text>
                <Text size="sm">
                  Si usas la app de Nucleo, vuelve a ella e inicia sesión con tu contraseña
                  nueva.
                </Text>
                <Text size="sm" c="dimmed">
                  ¿Administras un gimnasio?{" "}
                  <Anchor component={Link} to="/login">
                    Entra al panel
                  </Anchor>
                  .
                </Text>
              </Stack>
            ) : (
              <Button type="submit" fullWidth disabled={!uid || !token} loading={reset.isPending}>
                Actualizar contraseña
              </Button>
            )}
          </Stack>
        </form>
      </Center>
    </div>
  );
}
