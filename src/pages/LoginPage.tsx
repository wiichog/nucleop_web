import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Anchor,
  Button,
  Center,
  Divider,
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
import { GlassChip, HeroTitle } from "../components/aurora";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID ?? "";

/** Alto compartido por los dos botones sociales (el `size="large"` de Google). */
const SOCIAL_H = 40;

/**
 * Botón de Google. Google lo dibuja DENTRO DE UN IFRAME, así que no se puede
 * estilizar con CSS: lo único configurable son sus props. `filled_black` +
 * `pill` es lo más cercano al lenguaje Aurora (el default es una caja blanca
 * que sobre el vidrio oscuro se ve como un parche).
 *
 * El ancho de ese iframe es un número de píxeles fijo (Google lo topa en 400),
 * así que se mide el contenedor para que quede EXACTAMENTE igual de ancho que
 * el botón de Facebook en cualquier viewport.
 *
 * Se mantiene `<GoogleLogin>` y no un botón propio con `useGoogleLogin`:
 * ese hook devuelve un access token, y el backend espera el ID token que llega
 * en `credential`. Cambiarlo sería tocar el contrato de `/auth/social`.
 */
function GoogleButton({
  onSuccess,
  onError,
}: {
  onSuccess: (credential: string) => void;
  onError: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(Math.min(400, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="a-gsi" style={{ width: "100%", minHeight: SOCIAL_H }}>
      <GoogleLogin
        onSuccess={(cred) => (cred.credential ? onSuccess(cred.credential) : onError())}
        onError={onError}
        theme="filled_black"
        shape="pill"
        size="large"
        text="continue_with"
        logo_alignment="left"
        width={width}
      />
    </div>
  );
}

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
    <Stack gap="sm" mt="md" className="a-rise" style={{ animationDelay: "1.05s" }}>
      <Divider label="o continúa con" labelPosition="center" />
      {GOOGLE_CLIENT_ID && (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <GoogleButton
            onSuccess={async (credential) => {
              setError("");
              try {
                await socialLogin.mutateAsync({ provider: "google", token: credential });
                onDone();
              } catch {
                setError("No se pudo iniciar sesión con Google.");
              }
            }}
            onError={() => setError("No se pudo iniciar sesión con Google.")}
          />
        </GoogleOAuthProvider>
      )}
      {FACEBOOK_APP_ID && (
        <Button
          fullWidth
          variant="default"
          h={SOCIAL_H}
          onClick={handleFacebook}
          loading={socialLogin.isPending}
        >
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

/**
 * Marca del login en el lenguaje Aurora: átomo + wordmark + pastilla de
 * contexto. El titular se revela por línea, igual que el hero de la referencia.
 */
function AuthBrand({ chip, title }: { chip: string; title: string | string[] }) {
  return (
    <Stack gap={14} mb="xl">
      <div className="a-pop" style={{ animationDelay: ".26s", width: "fit-content" }}>
        <AtomLogo size={52} glow={false} />
      </div>
      <GlassChip delay={0.44}>{chip}</GlassChip>
      <HeroTitle lines={title} delay={0.56} />
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
    <div className="aurora-stage">
      {/* Video de marca (misma identidad que la landing) bajo los velos. */}
      <video
        autoPlay
        loop
        muted
        playsInline
        src={BRAND_VIDEO_URL}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -3,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -2,
          background: "rgba(4,4,7,0.62)",
          pointerEvents: "none",
        }}
      />
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
            animationDelay: ".08s",
          }}
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
              <AuthBrand chip="Recuperar acceso" title={["Volvamos", "a tu panel"]} />
              <p
                className="a-blurb a-wipe-down"
                style={{ animationDelay: ".9s", marginBottom: "calc(20 * var(--u))" }}
              >
                Ingresa el correo con el que te registraste. Te enviaremos instrucciones si la
                cuenta existe.
              </p>
              <Stack gap="sm" className="a-rise" style={{ animationDelay: ".95s" }}>
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
              <AuthBrand chip="Panel del gimnasio" title={["Tu box,", "en un panel"]} />
              <Stack gap="sm" className="a-rise" style={{ animationDelay: ".9s" }}>
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                />
                {login.isError && (
                  <Text c="red" size="sm">
                    Credenciales inválidas.
                  </Text>
                )}
                <Button type="submit" fullWidth loading={login.isPending} mt={4}>
                  Entrar
                </Button>
                <Anchor component="button" type="button" ta="center" onClick={() => setResetMode(true)}>
                  Olvidé mi contraseña
                </Anchor>
              </Stack>
              <SocialLoginButtons onDone={() => window.location.assign("/panel")} />
            </>
          )}
        </form>
      </Center>
    </div>
  );
}
