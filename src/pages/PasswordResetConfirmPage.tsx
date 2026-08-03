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
        </form>
      </Center>
    </div>
  );
}
