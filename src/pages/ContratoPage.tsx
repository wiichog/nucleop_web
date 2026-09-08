import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { Mail, Phone, ShieldAlert } from "lucide-react";
import {
  fetchContract,
  fetchInvitation,
  fetchTerms,
  type ContractDoc,
  type OnboardingTerms,
} from "../api/onboarding";
import { PageError, PageLoading } from "../components/PageStatus";
import { AtomLogo } from "../landing/AtomLogo";
import { errMsg } from "../lib/errors";
import { mantineTheme } from "../lib/mantineTheme";
import { OnboardingForm } from "./contrato/OnboardingForm";
// Mantine vive en el chunk del panel (AdminShell) y esta ruta NO cuelga de él: quien
// abre /contrato no tiene sesión y nunca entra a AdminShell. Por eso el CSS se importa
// aquí también; sin esto el formulario se renderiza sin estilos.
// `@mantine/dates` NO se importa: el formulario usa los `date`/`time` nativos del
// navegador (ver `contrato/campos.tsx`), así que su CSS solo engordaría el bundle
// de una página que abre gente en el teléfono, con datos móviles, una sola vez.
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
// Aurora AL FINAL, igual que en AdminShell: redefine variables y materiales de Mantine
// y necesita ganar el desempate de orden en el CSS resultante.
import "../lib/aurora.css";

/**
 * Contrato digital de alta de un gimnasio (`/contrato?t=<token>`).
 *
 * Este archivo es SOLO el cascarón: resuelve el enlace, decide si se puede firmar y
 * monta el formulario. Toda la lógica de los 10 pasos vive en `contrato/OnboardingForm`.
 *
 * La regla que gobierna la pantalla: **ningún estado es un callejón sin salida**. Quien
 * llega aquí es un prospecto sin cuenta, sin panel y sin a quién preguntarle; si el
 * enlace no sirve, la página tiene que decirle POR QUÉ y a quién escribirle, no dejarlo
 * mirando un error genérico.
 *
 * Va con `publicApi` (dentro de `api/onboarding.ts`), jamás con el cliente de sesión:
 * un JWT viejo en ese navegador convertiría un enlace vencido en un "login expirado".
 */

/** Título corto por motivo. El cuerpo del mensaje SIEMPRE lo manda el backend. */
const TITULO_ENLACE: Record<string, string> = {
  not_found: "Este enlace no existe",
  revoked: "Este enlace fue anulado",
  used: "Este enlace ya se usó",
  expired: "Este enlace venció",
};

/** `tel:` no admite espacios ni paréntesis. */
const telHref = (telefono: string) => `tel:${telefono.replace(/[^+\d]/g, "")}`;

/**
 * Pantalla de salida. Se usa para TODOS los finales que no son el formulario: sin
 * token, enlace muerto y contrato no publicable. Siempre ofrece a quién escribirle.
 */
function Salida({
  titulo,
  mensaje,
  email,
  telefono,
}: {
  titulo: string;
  mensaje: string;
  email?: string;
  telefono?: string;
}) {
  return (
    <section
      role="alert"
      className="mx-auto mt-6 max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-nucleo-flame/10 text-nucleo-flame">
        <ShieldAlert size={22} strokeWidth={1.8} />
      </div>
      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-white">
        {titulo}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-white/70">{mensaje}</p>

      {(email || telefono) && (
        <div className="mt-6 flex flex-col items-center gap-2 border-t border-white/10 pt-6">
          <p className="text-xs uppercase tracking-[0.16em] text-white/40">Escríbenos</p>
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 text-sm text-nucleo-flame hover:underline"
            >
              <Mail size={15} />
              {email}
            </a>
          )}
          {telefono && (
            <a
              href={telHref(telefono)}
              className="flex items-center gap-2 text-sm text-nucleo-flame hover:underline"
            >
              <Phone size={15} />
              {telefono}
            </a>
          )}
        </div>
      )}

      <Link
        to="/"
        className="mt-6 inline-block text-xs text-white/45 transition-colors hover:text-white"
      >
        Ir a nucleo.fit
      </Link>
    </section>
  );
}

export function ContratoPage() {
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";

  /**
   * Enlace que se murió MIENTRAS la persona llenaba el formulario (lo revocaron, o
   * alguien más lo usó). El formulario lo detecta al enviar y avisa hacia acá para que
   * la pantalla completa cambie: seguir mostrando 10 pasos que ya no se pueden enviar
   * sería pedirle que siga escribiendo para nada.
   */
  const [enlaceMuerto, setEnlaceMuerto] = useState<string>("");

  useEffect(() => {
    // El SPA sirve un solo index.html para todas las rutas, así que esto no puede vivir
    // en el HTML estático: se inyecta al montar y se retira al desmontar. Aquí se
    // escriben NIT, documento de identificación y cuenta bancaria; esta página no puede
    // acabar indexada, cacheada por un buscador ni mandando el token en el `Referer`.
    const metas = [
      { name: "robots", content: "noindex,nofollow,noarchive,nosnippet" },
      { name: "referrer", content: "no-referrer" },
    ].map(({ name, content }) => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", name);
      meta.setAttribute("content", content);
      document.head.appendChild(meta);
      return meta;
    });
    return () => metas.forEach((meta) => meta.remove());
  }, []);

  // Las tres cargas van en paralelo: el formulario necesita las tres para pintarse.
  const invitacion = useQuery({
    queryKey: ["contrato-invitacion", token],
    queryFn: () => fetchInvitation(token),
    enabled: !!token,
    retry: false,
    // Registra una apertura en el backend: refetchear al volver a la pestaña inflaría
    // el contador de "atorados" del panel con aperturas que nadie hizo.
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  const condiciones = useQuery({
    queryKey: ["contrato-terms"],
    queryFn: fetchTerms,
    retry: false,
    refetchOnWindowFocus: false,
    // `Infinity` a propósito: el articulado se firma contra un hash concreto. Si se
    // recargara solo mientras alguien llena el paso 7, el hash que ya leyó cambiaría
    // bajo sus pies y el envío moriría con "el contrato cambió".
    staleTime: Infinity,
  });
  const contrato = useQuery({
    queryKey: ["contrato-articulado"],
    queryFn: fetchContract,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const doc: ContractDoc | undefined = contrato.data;
  const terms: OnboardingTerms | undefined = condiciones.data;
  // Contacto de respaldo: cuando no hay token no hay respuesta del enlace, pero el
  // articulado sí trae los datos del proveedor. Nunca se deja a nadie sin a quién llamar.
  const emailContacto = doc?.provider.email;
  const telefonoContacto = doc?.provider.phone;

  const contenido = () => {
    if (!token) {
      return (
        <Salida
          titulo="Falta el enlace"
          mensaje="Esta página se abre solo con el enlace privado que te mandamos por correo. Copia la dirección completa del correo, o escríbenos y te mandamos uno nuevo."
          email={emailContacto}
          telefono={telefonoContacto}
        />
      );
    }

    if (invitacion.isLoading || condiciones.isLoading || contrato.isLoading) {
      return <PageLoading label="Abriendo tu contrato…" />;
    }

    // Fallo de red o 5xx: es recuperable, así que la salida es reintentar.
    const fallo = invitacion.error ?? condiciones.error ?? contrato.error;
    if (fallo) {
      return (
        <PageError
          message={errMsg(fallo, "No pudimos abrir tu contrato. Revisa tu conexión.")}
          onRetry={() => {
            invitacion.refetch();
            condiciones.refetch();
            contrato.refetch();
          }}
        />
      );
    }

    if (enlaceMuerto) {
      return (
        <Salida
          titulo="Este enlace ya no sirve"
          mensaje={enlaceMuerto}
          email={emailContacto}
          telefono={telefonoContacto}
        />
      );
    }

    const estado = invitacion.data;
    if (!estado || !doc || !terms) return null;

    // El backend responde 200 con el motivo dentro: un 404 seco no distingue
    // "te equivocaste de dirección" de "se te pasó la fecha", y se resuelven distinto.
    if (!estado.valid) {
      return (
        <Salida
          titulo={TITULO_ENLACE[estado.reason] ?? "Este enlace no sirve"}
          mensaje={estado.detail}
          email={estado.contact_email || emailContacto}
          telefono={estado.contact_phone || telefonoContacto}
        />
      );
    }

    // Contrato con marcadores sin resolver. Mostrar el formulario sería tenderle una
    // trampa a quien lo llene: firmaría un articulado incompleto. Los marcadores
    // concretos son un problema nuestro, no suyo: no se listan aquí.
    if (!doc.publishable) {
      return (
        <Salida
          titulo="El contrato no está disponible"
          mensaje="Estamos terminando de preparar el documento y todavía no se puede firmar. Escríbenos y lo resolvemos hoy mismo; tu enlace sigue siendo válido."
          email={emailContacto}
          telefono={telefonoContacto}
        />
      );
    }

    return (
      <OnboardingForm
        token={token}
        terms={terms}
        contract={doc}
        prefill={estado.prefill}
        onEnlaceMuerto={(detalle?: string) =>
          setEnlaceMuerto(
            detalle ||
              "Este enlace ya se usó o fue anulado. Escríbenos y te mandamos uno nuevo.",
          )
        }
      />
    );
  };

  return (
    // Fuera del panel y fuera de la landing: chrome propio en Tailwind (negro, display,
    // acento flame) y el MantineProvider SOLO para el formulario, que sí es de Mantine.
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark" forceColorScheme="dark">
      <Notifications position="top-right" />
      <div className="min-h-screen bg-black text-white">
        <header className="border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AtomLogo size={26} />
              <span className="font-display text-lg font-semibold tracking-tight text-white">
                nucleo
              </span>
            </div>
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">
              Contrato de alta
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">{contenido()}</main>

        <footer className="border-t border-white/10 px-5 py-6 sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-xs text-white/40">
            <span>Nucleo · Guatemala</span>
            <span className="flex gap-4">
              <Link to="/terminos" className="transition-colors hover:text-white">
                Términos
              </Link>
              <Link to="/privacidad" className="transition-colors hover:text-white">
                Privacidad
              </Link>
            </span>
          </div>
        </footer>
      </div>
    </MantineProvider>
  );
}

// `App.tsx` la carga con `React.lazy`, que exige export por defecto.
export default ContratoPage;
